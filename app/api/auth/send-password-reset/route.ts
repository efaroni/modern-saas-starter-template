import { type NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { authService } from '@/lib/auth/factory';

const sendPasswordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = sendPasswordResetSchema.parse(body);

    const service = await authService;
    const result = await service.sendPasswordReset(email);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Password reset email sent successfully',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Send password reset error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.errors[0].message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
