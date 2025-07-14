export interface AuthUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
  emailVerified?: Date | null
}

export interface SignInRequest {
  email: string
  password: string
}

export interface SignUpRequest {
  email: string
  password: string
  name?: string
}

export interface AuthResult<T = AuthUser> {
  success: boolean
  user?: T | null
  error?: string
}

export interface AuthConfiguration {
  provider: 'mock' | 'nextauth'
  oauthProviders: string[]
}

export interface OAuthProvider {
  id: string
  name: string
  iconUrl?: string
}

export interface OAuthResult {
  success: boolean
  user?: AuthUser | null
  error?: string
  redirectUrl?: string
}

export interface AuthProvider {
  authenticateUser(email: string, password: string): Promise<AuthResult>
  createUser(userData: SignUpRequest): Promise<AuthResult>
  getUserById(id: string): Promise<AuthResult>
  updateUser(id: string, data: UpdateProfileRequest): Promise<AuthResult>
  deleteUser(id: string): Promise<AuthResult>
  verifyUserEmail(id: string): Promise<AuthResult>
  changeUserPassword(id: string, currentPassword: string, newPassword: string): Promise<AuthResult>
  signInWithOAuth(provider: string): Promise<OAuthResult>
  getAvailableOAuthProviders(): OAuthProvider[]
  isConfigured(): boolean
  getConfiguration(): AuthConfiguration
}

export interface UpdateProfileRequest {
  name?: string
  email?: string
  image?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface SessionData {
  user?: AuthUser | null
  expires?: string
}