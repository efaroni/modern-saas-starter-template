import { type NextRequest, NextResponse } from 'next/server';

import { auth } from '@clerk/nextjs/server';

import { createVisionService } from '@/lib/ai/vision/service';
import { analyzeDesignSchema } from '@/lib/ai/vision/types';
import { strictRateLimit } from '@/lib/middleware/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting - strict limit for AI requests
    try {
      const rateLimitResult = strictRateLimit(request);

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Too many AI requests. Please wait before trying again.',
            retryAfter: rateLimitResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': rateLimitResult.retryAfter.toString(),
            },
          },
        );
      }
    } catch (rateLimitError) {
      // If rate limiting fails (e.g., in test environment), continue without it
      console.warn('Rate limiting failed:', rateLimitError);
    }

    // Parse form data
    const formData = await request.formData();
    const images = formData.getAll('images') as File[];
    const options = formData.get('options');

    // Prepare input for validation
    const input = {
      images,
      options: options ? JSON.parse(options as string) : undefined,
    };

    // Validate input
    const validation = analyzeDesignSchema.safeParse(input);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 },
      );
    }

    // The vision service will handle API key validation and fallback to mock if needed
    // We don't need to check for API keys here since the service can use mock data

    // Get vision service with user's API key
    const visionService = await createVisionService(userId);

    // Analyze design
    const result = await visionService.analyzeDesign(validation.data);

    if (!result.success) {
      // Provide more specific error messages based on error codes
      let errorMessage = result.error.message;
      let actionDetails = null;
      let details = null;

      if (result.error.code === 'API_ERROR') {
        if (
          result.error.message.includes('401') ||
          result.error.message.includes('Unauthorized') ||
          result.error.message.includes('authentication')
        ) {
          errorMessage = 'Invalid or missing OpenAI API key';
          details =
            'To use the Design System Analyzer with real AI analysis, you need a valid OpenAI API key. You can either add your API key or use the demo mode with mock data.';
          actionDetails = {
            text: 'Configure API Key',
            url: '/configuration',
          };
        } else if (
          result.error.message.includes('insufficient') ||
          result.error.message.includes('quota')
        ) {
          errorMessage = 'Insufficient OpenAI API credits';
          details =
            'Your OpenAI account has insufficient credits or has exceeded the quota. Please check your billing settings.';
          actionDetails = {
            text: 'Check OpenAI Billing',
            url: 'https://platform.openai.com/account/billing',
          };
        } else if (
          result.error.message.includes('model') ||
          result.error.message.includes('vision')
        ) {
          errorMessage = 'OpenAI Vision API unavailable';
          details =
            'The OpenAI Vision model may be temporarily unavailable or your API key may not have access to vision models.';
        }
      } else if (result.error.code === 'RATE_LIMIT') {
        errorMessage = 'Rate limit exceeded';
        details =
          'OpenAI API rate limit exceeded. Please try again later or upgrade your OpenAI plan for higher limits.';
      } else if (result.error.code === 'INVALID_RESPONSE') {
        errorMessage = 'Failed to process AI response';
        details =
          'The AI returned an unexpected format. This can happen if the model is not following instructions properly. Please try again.';
      }

      return NextResponse.json(
        {
          error: errorMessage,
          ...(details && { details }),
          ...(actionDetails && { action: actionDetails }),
        },
        { status: 400 },
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
      { status: 500 },
    );
  }
}
