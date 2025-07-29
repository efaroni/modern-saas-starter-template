import { type NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth/auth';
import { applyRateLimit } from '@/lib/middleware/rate-limit';
import { userApiKeyService } from '@/lib/user-api-keys/service';

/**
 * Validates the user's OpenAI API key with a minimal, cost-free test
 * This endpoint checks if the key exists and is valid without consuming credits
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting - 10 requests per hour per user
    const rateLimitResult = await applyRateLimit(
      request,
      'ai-key-validation',
      session.user.id,
    );

    if (!rateLimitResult.allowed) {
      return (
        rateLimitResult.response ??
        NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      );
    }

    // Check if user has an OpenAI API key stored
    const userApiKey = await userApiKeyService.getDecryptedPrivateKey(
      'openai',
      session.user.id,
    );

    if (!userApiKey) {
      return NextResponse.json({
        success: false,
        error: 'NO_API_KEY',
        message: 'No OpenAI API key found',
        details:
          'Please add your OpenAI API key in the configuration page to use AI features.',
        action: {
          text: 'Add API Key',
          url: '/configuration',
        },
      });
    }

    // Validate the API key with a minimal request to OpenAI
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          return NextResponse.json({
            success: false,
            error: 'INVALID_API_KEY',
            message: 'Invalid OpenAI API key',
            details:
              'Your OpenAI API key is invalid or has been revoked. Please update it in the configuration page.',
            action: {
              text: 'Update API Key',
              url: '/configuration',
            },
          });
        }

        if (response.status === 429) {
          return NextResponse.json({
            success: false,
            error: 'RATE_LIMITED',
            message: 'OpenAI API rate limit exceeded',
            details:
              'Your OpenAI account has exceeded its rate limits. Please try again later or upgrade your plan.',
            action: {
              text: 'Check OpenAI Usage',
              url: 'https://platform.openai.com/account/usage',
            },
          });
        }

        if (response.status === 403) {
          return NextResponse.json({
            success: false,
            error: 'INSUFFICIENT_CREDITS',
            message: 'Insufficient OpenAI credits',
            details:
              'Your OpenAI account has insufficient credits. Please add credits to your account.',
            action: {
              text: 'Add Credits',
              url: 'https://platform.openai.com/account/billing',
            },
          });
        }

        return NextResponse.json({
          success: false,
          error: 'API_ERROR',
          message: 'OpenAI API error',
          details: `OpenAI API returned an error: ${response.status}`,
        });
      }

      const data = await response.json();

      // Check if the response contains models (which means the key is valid)
      if (!data.data || !Array.isArray(data.data)) {
        return NextResponse.json({
          success: false,
          error: 'UNEXPECTED_RESPONSE',
          message: 'Unexpected OpenAI API response',
          details: 'The OpenAI API returned an unexpected response format.',
        });
      }

      // Check if vision models are available
      const hasVisionModel = data.data.some(
        (model: { id?: string }) =>
          model.id &&
          (model.id.includes('gpt-4') || model.id.includes('vision')),
      );

      return NextResponse.json({
        success: true,
        message: 'OpenAI API key is valid',
        details: {
          hasVisionModel,
          modelCount: data.data.length,
          validated: true,
        },
      });
    } catch (fetchError) {
      console.error('OpenAI API validation error:', fetchError);

      // Handle timeout specifically
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: 'TIMEOUT_ERROR',
          message: 'OpenAI API request timed out',
          details:
            'The request to validate your API key timed out. This might be due to OpenAI API being slow. Please try again.',
        });
      }

      return NextResponse.json({
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Unable to connect to OpenAI API',
        details:
          'There was a network error while validating your API key. Please check your internet connection and try again.',
      });
    }
  } catch (error) {
    console.error('API key validation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
