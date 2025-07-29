import NextAuth from 'next-auth';

import serverAuthConfig from './config.server';

export const { auth, handlers, signIn, signOut } = NextAuth(serverAuthConfig);

export { serverAuthConfig as authConfig };
