export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResult<T = AuthUser> {
  success: boolean;
  user?: T | null;
  error?: string;
  passwordExpiration?: {
    isExpired: boolean;
    isNearExpiration: boolean;
    daysUntilExpiration: number;
    mustChangePassword: boolean;
    graceLoginsRemaining: number;
  };
}

export interface AuthConfiguration {
  provider: 'mock' | 'nextauth';
  oauthProviders: string[];
}

export interface OAuthProvider {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface OAuthResult {
  success: boolean;
  user?: AuthUser | null;
  error?: string;
  redirectUrl?: string;
}

export interface AuthProvider {
  authenticateUser(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult>;
  createUser(
    userData: SignUpRequest,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult>;
  getUserById(id: string): Promise<AuthResult>;
  getUserByEmail(email: string): Promise<AuthResult>;
  updateUser(id: string, data: UpdateProfileRequest): Promise<AuthResult>;
  deleteUser(id: string): Promise<AuthResult>;
  verifyUserEmail(id: string): Promise<AuthResult>;
  changeUserPassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResult>;
  resetUserPassword(id: string, newPassword: string): Promise<AuthResult>;
  signInWithOAuth(provider: string): Promise<OAuthResult>;
  getAvailableOAuthProviders(): OAuthProvider[];
  isConfigured(): boolean;
  getConfiguration(): AuthConfiguration;

  // Email verification methods
  sendEmailVerification(
    email: string,
  ): Promise<{ success: boolean; error?: string }>;
  verifyEmailWithToken(
    token: string,
  ): Promise<{ success: boolean; error?: string }>;

  // Password reset methods
  sendPasswordReset(
    email: string,
  ): Promise<{ success: boolean; error?: string }>;
  resetPasswordWithToken(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }>;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  image?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AvatarUploadResult {
  success: boolean;
  user?: AuthUser | null;
  error?: string;
}

export interface PasswordResetToken {
  token: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetCompletion {
  token: string;
  newPassword: string;
}

export interface SessionData {
  user?: AuthUser | null;
  expires?: string;
}
