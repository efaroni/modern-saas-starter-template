import 'server-only';

import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { type NextAuthConfig } from 'next-auth';

import { authConfig } from './config';
import {
  authDb,
  accounts,
  sessions,
  users,
  verificationTokens,
} from './db.server';

// Server-specific auth configuration with database adapter
export const serverAuthConfig = {
  ...authConfig,
  adapter: DrizzleAdapter(authDb, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
} satisfies NextAuthConfig;

export default serverAuthConfig;
