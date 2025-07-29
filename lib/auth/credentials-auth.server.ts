import 'server-only';

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

import { authDb, users } from './db.server';

export interface CredentialsAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
  error?: string;
}

export async function authenticateCredentials(
  email: string,
  password: string,
): Promise<CredentialsAuthResult> {
  try {
    // Find user by email
    const user = await authDb.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || !user.password) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return { success: false, error: 'Invalid credentials' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    };
  } catch (error) {
    console.error('Credentials authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}
