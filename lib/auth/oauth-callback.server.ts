import 'server-only';

import { eq } from 'drizzle-orm';

import { authDb, users, accounts } from './db.server';

import type { AdapterAccountType } from '@auth/core/adapters';

interface OAuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
}

interface OAuthAccount {
  provider: string;
  providerAccountId: string;
  type: string;
  access_token?: string;
  refresh_token?: string;
}

export async function handleOAuthCallback(
  provider: string,
  user: OAuthUser,
  account: OAuthAccount,
) {
  try {
    // Check if user exists
    const existingUser = await authDb.query.users.findFirst({
      where: eq(users.email, user.email),
    });

    if (existingUser) {
      // User exists, just ensure account is linked
      const existingAccount = await authDb.query.accounts.findFirst({
        where: eq(accounts.providerAccountId, account.providerAccountId),
      });

      if (!existingAccount) {
        // Link the account
        await authDb.insert(accounts).values({
          userId: existingUser.id,
          type: account.type as AdapterAccountType,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
        });
      }

      return { success: true };
    }

    // User doesn't exist, create new user
    const [newUser] = await authDb
      .insert(users)
      .values({
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: new Date(), // OAuth users are pre-verified
      })
      .returning();

    // Link the account
    await authDb.insert(accounts).values({
      userId: newUser.id,
      type: account.type as AdapterAccountType,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    });

    return { success: true };
  } catch (error) {
    console.error('OAuth callback error:', error);
    return { success: false, error: 'OAuth callback failed' };
  }
}
