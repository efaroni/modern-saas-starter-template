# Design Screenshot Analyzer - Implementation Guide

## Overview

Build a feature that analyzes uploaded design screenshots using OpenAI Vision API to extract design patterns, colors, and styling preferences. The output will be three customizable files that help developers create unique UIs that don't look like generic AI-generated interfaces.

## Current State

The codebase already has:
- **OpenAI Integration**: Package installed (`openai: ^5.8.2`)
- **Service Pattern**: Interface-based abstraction used throughout (email, auth, upload services)
- **Upload Service**: Existing upload service pattern with interface and mock implementation
- **Testing Framework**: Comprehensive testing utilities and patterns
- **Database**: PostgreSQL with Drizzle ORM

## Tech Stack

- **Next.js 15** (App Router) - Already in use
- **OpenAI Vision API** - Using existing OpenAI package
- **React Dropzone** for file uploads
- **Tailwind CSS v4** for styling - Already configured
- **React Syntax Highlighter** for code display
- **Zod** for validation - Already in use

## High-Level Architecture

```
app/
├── styling/
│   └── page.tsx              # Main UI page
├── api/
│   └── ai/
│       └── analyze-design/
│           └── route.ts      # API endpoint
│
lib/
├── ai/
│   ├── types.ts              # Shared AI types & interfaces
│   ├── service.ts            # Factory function
│   ├── vision/
│   │   ├── types.ts          # Vision-specific types
│   │   ├── openai.ts         # OpenAI Vision implementation
│   │   └── mock.ts           # Mock implementation for tests
│   └── prompts/
│       └── design-analyzer.ts # Prompt templates
│
components/
└── design-analyzer/
    ├── upload-zone.tsx       # Dropzone component
    ├── image-preview.tsx     # Image preview grid
    ├── result-tabs.tsx       # Tabbed result display
    └── code-display.tsx      # Syntax highlighted output

tests/
├── lib/
│   └── ai/
│       └── vision/
│           ├── openai.test.ts
│           └── mock.test.ts
├── integration/
│   └── ai/
│       └── design-analyzer.test.ts
└── e2e/
    └── design-analyzer.test.ts
```

## Implementation Details

### 1. Service Layer

#### Types (`lib/ai/vision/types.ts`):

```typescript
import { z } from 'zod';

// Input validation schemas
export const analyzeDesignSchema = z.object({
  images: z.array(z.instanceof(File)).min(1).max(5),
  options: z.object({
    includeAnimations: z.boolean().optional(),
    targetFramework: z.enum(['tailwind', 'css-modules', 'styled-components']).optional(),
  }).optional(),
});

export type AnalyzeDesignInput = z.infer<typeof analyzeDesignSchema>;

// Result types
export interface DesignAnalysisResult {
  styleGuide: string;
  tailwindConfig: string;
  globalsCss: string;
  metadata?: {
    colors: Record<string, string>;
    fonts: string[];
    primaryColor?: string;
    theme?: 'light' | 'dark' | 'both';
  };
}

export interface VisionError {
  code: 'INVALID_IMAGE' | 'API_ERROR' | 'RATE_LIMIT' | 'INVALID_RESPONSE';
  message: string;
}

export type VisionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: VisionError };

// Service interface
export interface VisionService {
  analyzeDesign(input: AnalyzeDesignInput): Promise<VisionResult<DesignAnalysisResult>>;
  validateImage(file: File): Promise<boolean>;
}
```

#### OpenAI Implementation (`lib/ai/vision/openai.ts`):

```typescript
import { OpenAI } from 'openai';
import { VisionService, AnalyzeDesignInput, VisionResult, DesignAnalysisResult } from './types';
import { designAnalyzerPrompt } from '../prompts/design-analyzer';

export class OpenAIVisionService implements VisionService {
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async analyzeDesign(input: AnalyzeDesignInput): Promise<VisionResult<DesignAnalysisResult>> {
    try {
      // Validate images
      for (const image of input.images) {
        const isValid = await this.validateImage(image);
        if (!isValid) {
          return {
            success: false,
            error: {
              code: 'INVALID_IMAGE',
              message: `Invalid image: ${image.name}`,
            },
          };
        }
      }

      // Convert images to base64
      const imageUrls = await Promise.all(
        input.images.map(async (image) => {
          const bytes = await image.arrayBuffer();
          const buffer = Buffer.from(bytes);
          return `data:${image.type};base64,${buffer.toString('base64')}`;
        })
      );

      // Call OpenAI Vision API
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: designAnalyzerPrompt,
          },
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: 'Analyze these design screenshots and extract the design system:' 
              },
              ...imageUrls.map(url => ({
                type: 'image_url' as const,
                image_url: { url },
              })),
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          success: false,
          error: {
            code: 'INVALID_RESPONSE',
            message: 'No response from AI',
          },
        };
      }

      const result = JSON.parse(content) as DesignAnalysisResult;
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Vision analysis error:', error);
      
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          return {
            success: false,
            error: {
              code: 'RATE_LIMIT',
              message: 'Rate limit exceeded. Please try again later.',
            },
          };
        }
      }
      
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Failed to analyze design',
        },
      };
    }
  }

  async validateImage(file: File): Promise<boolean> {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSize = 20 * 1024 * 1024; // 20MB
    
    return validTypes.includes(file.type) && file.size <= maxSize;
  }
}
```

#### Mock Implementation (`lib/ai/vision/mock.ts`):

```typescript
import { VisionService, AnalyzeDesignInput, VisionResult, DesignAnalysisResult } from './types';
import { mockDesignAnalysisResult } from './mock-data';

export class MockVisionService implements VisionService {
  async analyzeDesign(input: AnalyzeDesignInput): Promise<VisionResult<DesignAnalysisResult>> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Validate images
    for (const image of input.images) {
      const isValid = await this.validateImage(image);
      if (!isValid) {
        return {
          success: false,
          error: {
            code: 'INVALID_IMAGE',
            message: `Invalid image: ${image.name}`,
          },
        };
      }
    }
    
    return {
      success: true,
      data: mockDesignAnalysisResult,
    };
  }

  async validateImage(file: File): Promise<boolean> {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSize = 20 * 1024 * 1024; // 20MB
    
    return validTypes.includes(file.type) && file.size <= maxSize;
  }
}
```

#### Service Factory (`lib/ai/vision/service.ts`):

```typescript
import { VisionService } from './types';
import { OpenAIVisionService } from './openai';
import { MockVisionService } from './mock';
import { userApiKeyService } from '@/lib/user-api-keys/service';

export async function createVisionService(userId?: string): Promise<VisionService> {
  if (process.env.NODE_ENV === 'test') {
    return new MockVisionService();
  }
  
  // Use user's stored API key if userId provided
  if (userId) {
    const userApiKey = await userApiKeyService.getApiKey(userId, 'openai');
    if (userApiKey?.key) {
      return new OpenAIVisionService(userApiKey.key);
    }
  }
  
  // Fallback to environment variable
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new MockVisionService();
  }
  
  return new OpenAIVisionService(apiKey);
}
```

### 2. API Route

Create `app/api/ai/analyze-design/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createVisionService } from '@/lib/ai/vision/service';
import { analyzeDesignSchema } from '@/lib/ai/vision/types';
import { rateLimiter } from '@/lib/middleware/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimiter.check(
      request,
      `ai-vision:${session.user.id}`,
      {
        limit: 10,
        window: '1h',
      }
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const images = formData.getAll('images') as File[];
    
    // Validate input
    const validation = analyzeDesignSchema.safeParse({ images });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Get vision service with user's API key
    const visionService = await createVisionService(session.user.id);

    // Analyze design
    const result = await visionService.analyzeDesign(validation.data);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Design analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3. UI Components

#### Main Page (`app/styling/page.tsx`):

```typescript
import { Metadata } from 'next';
import { DesignAnalyzer } from '@/components/design-analyzer';

export const metadata: Metadata = {
  title: 'Design System Analyzer',
  description: 'Extract design patterns from screenshots',
};

export default function StylingPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Design System Analyzer</h1>
          <p className="text-muted-foreground">
            Upload screenshots to generate custom styling files that help you escape the generic AI look.
          </p>
        </div>
        
        <DesignAnalyzer />
      </div>
    </div>
  );
}
```

#### Main Component (`components/design-analyzer/index.tsx`):

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { UploadZone } from './upload-zone';
import { ImagePreview } from './image-preview';
import { ResultTabs } from './result-tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import type { DesignAnalysisResult } from '@/lib/ai/vision/types';

export function DesignAnalyzer() {
  const { isAuthenticated } = useAuth();
  const [images, setImages] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DesignAnalysisResult | null>(null);

  const handleFilesSelected = (files: File[]) => {
    setImages(files);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (images.length === 0) return;

    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    images.forEach(image => formData.append('images', image));

    try {
      const response = await fetch('/api/ai/analyze-design', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze design');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImages([]);
    setResult(null);
    setError(null);
  };

  if (!isAuthenticated) {
    return (
      <Alert>
        <AlertDescription>
          Please sign in to use the Design System Analyzer.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {!result && (
        <>
          <UploadZone onFilesSelected={handleFilesSelected} />
          
          {images.length > 0 && (
            <>
              <ImagePreview images={images} />
              
              <div className="flex gap-4">
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  size="lg"
                >
                  {analyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {analyzing ? 'Analyzing...' : 'Analyze Design'}
                </Button>
                
                <Button
                  onClick={handleReset}
                  variant="outline"
                  disabled={analyzing}
                >
                  Clear
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <>
          <ResultTabs result={result} />
          
          <Button onClick={handleReset} variant="outline">
            Analyze New Design
          </Button>
        </>
      )}
    </div>
  );
}
```

## Testing Strategy (80/20 Approach)

### Essential Unit Tests

**Mock Service Test** (`tests/lib/ai/vision/mock.test.ts`):

```typescript
import { MockVisionService } from '@/lib/ai/vision/mock';

describe('MockVisionService', () => {
  it('should return mock analysis result', async () => {
    const service = new MockVisionService();
    const file = new File([''], 'test.png', { type: 'image/png' });
    
    const result = await service.analyzeDesign({ images: [file] });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.styleGuide).toBeDefined();
      expect(result.data.tailwindConfig).toBeDefined();
      expect(result.data.globalsCss).toBeDefined();
    }
  });
});
```

### Essential Integration Test

**API Route Test** (`tests/integration/ai/design-analyzer.test.ts`):

```typescript
import { POST } from '@/app/api/ai/analyze-design/route';
import { testDb, authTestHelpers } from '@/lib/db/test-helpers';

jest.mock('@/lib/ai/vision/service');

describe('Design Analyzer API', () => {
  beforeEach(async () => {
    await testDb.setup();
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it('should analyze design for authenticated users', async () => {
    const user = await authTestHelpers.createTestUser({
      email: authTestHelpers.generateUniqueEmail(),
    });

    const formData = new FormData();
    const file = new File([''], 'test.png', { type: 'image/png' });
    formData.append('images', file);

    const request = new Request('http://localhost/api/ai/analyze-design', {
      method: 'POST',
      headers: {
        cookie: `session-token=${user.sessionToken}`,
      },
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('styleGuide');
    expect(data.data).toHaveProperty('tailwindConfig');
    expect(data.data).toHaveProperty('globalsCss');
  });
});
```

### Essential E2E Test

**Happy Path Test** (`tests/e2e/design-analyzer.test.ts`):

```typescript
import { test, expect } from '@playwright/test';

test.describe('Design Analyzer', () => {
  test('should analyze design screenshots (happy path)', async ({ page }) => {
    // Login with existing test user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to design analyzer
    await page.goto('/styling');
    
    // Upload test image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(['tests/fixtures/test-design.png']);

    // Analyze
    await page.click('button:has-text("Analyze Design")');
    
    // Wait for results
    await expect(page.locator('text=Generated Files')).toBeVisible({ timeout: 30000 });

    // Verify all three tabs are present
    await expect(page.locator('button:has-text("STYLE_GUIDE.md")')).toBeVisible();
    await expect(page.locator('button:has-text("tailwind.config.js")')).toBeVisible();
    await expect(page.locator('button:has-text("app/globals.css")')).toBeVisible();
  });
});
```

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install react-dropzone react-syntax-highlighter @types/react-syntax-highlighter

# Add environment variable (optional - will use mock if not set)
echo "OPENAI_API_KEY=your_key_here" >> .env.local

# Start development
npm run dev
```

### Testing (Simplified)

```bash
# Run the essential tests
npm test tests/lib/ai/vision/mock.test.ts
npm test tests/integration/ai/design-analyzer.test.ts
npm run test:e2e tests/e2e/design-analyzer.test.ts
```

### Test Fixtures

Create a simple test image:
```bash
# Create test fixtures directory
mkdir -p tests/fixtures

# Add a test PNG file (any small PNG will work)
cp any-screenshot.png tests/fixtures/test-design.png
```

## Production Considerations

### Security

- Authenticate all requests
- Validate and sanitize file uploads
- Rate limit API endpoints (10 requests per hour per user)
- Use existing API keys logic since we have securely stored those in the DB and have methods to fetch them.
- Limit file sizes (20MB max)

### Performance

- Compress images before sending to API
- Use streaming for large responses
- Implement request queuing for rate limits

### Error Handling

- Graceful degradation for API failures
- Clear error messages for users

## Implementation Checklist

- [ ] Implement VisionService interface and types
- [ ] Create OpenAIVisionService implementation  
- [ ] Create MockVisionService with good sample data
- [ ] Build service factory with user API key support
- [ ] Implement API route with auth and rate limiting
- [ ] Create UI components (upload, preview, results)
- [ ] Add main page to /styling
- [ ] Write essential mock service test
- [ ] Write essential API integration test
- [ ] Write happy path E2E test
- [ ] Add basic error handling (auth, file validation)
- [ ] Test with real OpenAI API (optional)
