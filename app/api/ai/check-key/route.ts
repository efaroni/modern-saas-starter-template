import { type NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth/auth';
import { userApiKeyService } from '@/lib/user-api-keys/service';

/**
 * Lightweight endpoint to check if user has an OpenAI API key configured
 * This endpoint only checks the database, no external API calls
 */
export async function GET(_request: NextRequest) {
  try {
    // Check authentication with timeout
    const authPromise = auth();
    const timeoutPromise = new Promise<null>(resolve =>
      setTimeout(() => resolve(null), 3000),
    );

    const session = await Promise.race([authPromise, timeoutPromise]);

    if (!session?.user?.id) {
      return NextResponse.json({ hasKey: false });
    }

    // Check if user has an OpenAI API key stored (no decryption needed)
    const keyRecord = await userApiKeyService.getByProvider(
      'openai',
      session.user.id,
    );
    const hasKey = !!keyRecord;
    return NextResponse.json({ hasKey });
  } catch (error) {
    console.error('[check-key] Check key error:', error);
    return NextResponse.json({ hasKey: false });
  }
}
