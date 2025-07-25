import { type NextRequest, NextResponse } from 'next/server';

import { createVisionService } from '@/lib/ai/vision/service';
import { analyzeDesignSchema } from '@/lib/ai/vision/types';
import { auth } from '@/lib/auth/auth';
import { applyRateLimit } from '@/lib/middleware/rate-limit';

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
      'ai-vision',
      session.user.id,
    );

    if (!rateLimitResult.allowed) {
      return (
        rateLimitResult.response ??
        NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      );
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

    // Get vision service with user's API key
    const visionService = await createVisionService(session.user.id);

    // Analyze design
    const result = await visionService.analyzeDesign(validation.data);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
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
