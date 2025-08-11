import { z } from 'zod';

// Input validation schemas
export const analyzeDesignSchema = z.object({
  images: z.array(z.instanceof(File)).min(1).max(5),
  options: z
    .object({
      includeAnimations: z.boolean().optional(),
      targetFramework: z
        .enum(['tailwind', 'css-modules', 'styled-components'])
        .optional(),
    })
    .optional(),
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
  code:
    | 'INVALID_IMAGE'
    | 'API_ERROR'
    | 'RATE_LIMIT'
    | 'INVALID_RESPONSE'
    | 'PARSE_ERROR';
  message: string;
}

export type VisionResult<T> =
  | { success: true; data: T }
  | { success: false; error: VisionError };

// Service interface
export interface VisionService {
  analyzeDesign(
    input: AnalyzeDesignInput,
  ): Promise<VisionResult<DesignAnalysisResult>>;
  validateImage(file: File): Promise<boolean>;
}
