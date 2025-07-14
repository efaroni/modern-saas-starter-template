import { AuthProvider, AuthResult, AuthUser, SignUpRequest, AuthConfiguration, OAuthProvider, OAuthResult, UpdateProfileRequest } from '../types'

interface MockUserWithPassword extends AuthUser {
  password: string
}

export class MockAuthProvider implements AuthProvider {
  private mockUsers = new Map<string, MockUserWithPassword>([
    ['test-user-id', {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      emailVerified: new Date(),
      password: 'password' // Mock hashed password
    }]
  ])

  async authenticateUser(email: string, password: string): Promise<AuthResult> {
    // Find user by email
    const user = Array.from(this.mockUsers.values()).find(u => u.email === email)
    
    if (user && user.password === password) {
      // Return user without password
      const { password: _, ...authUser } = user
      return {
        success: true,
        user: authUser
      }
    }

    return {
      success: false,
      error: 'Invalid credentials'
    }
  }

  async createUser(userData: SignUpRequest): Promise<AuthResult> {
    const { email, password, name } = userData

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Invalid email format'
      }
    }

    // Validate password length
    if (password.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters'
      }
    }

    // Check if user already exists
    const existingUser = Array.from(this.mockUsers.values()).find(u => u.email === email)
    if (existingUser) {
      return {
        success: false,
        error: 'Email already exists'
      }
    }

    // Create new user
    const newUser: MockUserWithPassword = {
      id: `user-${Date.now()}`,
      email,
      name: name || null,
      image: null,
      emailVerified: null,
      password // Store mock password
    }

    this.mockUsers.set(newUser.id, newUser)

    // Return user without password
    const { password: _, ...authUser } = newUser
    return {
      success: true,
      user: authUser
    }
  }

  async getUserById(id: string): Promise<AuthResult> {
    const user = this.mockUsers.get(id)
    if (user) {
      const { password: _, ...authUser } = user
      return {
        success: true,
        user: authUser
      }
    }
    return {
      success: true,
      user: null
    }
  }

  async getUserByEmail(email: string): Promise<AuthResult> {
    const user = Array.from(this.mockUsers.values()).find(u => u.email === email)
    if (user) {
      const { password: _, ...authUser } = user
      return {
        success: true,
        user: authUser
      }
    }
    return {
      success: true,
      user: null
    }
  }

  isConfigured(): boolean {
    return true
  }

  async signInWithOAuth(provider: string): Promise<OAuthResult> {
    // Simulate OAuth flow delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Mock OAuth providers
    const oauthUsers = {
      google: {
        id: 'google-user-id',
        email: 'user@gmail.com',
        name: 'Google User',
        image: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        emailVerified: new Date(),
        password: 'oauth-google' // Mock OAuth password
      },
      github: {
        id: 'github-user-id',
        email: 'user@github.com',
        name: 'GitHub User',
        image: 'https://avatars.githubusercontent.com/u/123456?v=4',
        emailVerified: new Date(),
        password: 'oauth-github' // Mock OAuth password
      }
    }

    const oauthUser = oauthUsers[provider as keyof typeof oauthUsers]
    
    if (!oauthUser) {
      return {
        success: false,
        error: `OAuth provider "${provider}" not supported`
      }
    }

    // Add user to mock store if not exists
    if (!this.mockUsers.has(oauthUser.id)) {
      this.mockUsers.set(oauthUser.id, oauthUser)
    }

    // Return user without password
    const { password: _, ...authUser } = oauthUser
    return {
      success: true,
      user: authUser
    }
  }

  getAvailableOAuthProviders(): OAuthProvider[] {
    return [
      {
        id: 'google',
        name: 'Google',
        iconUrl: 'https://developers.google.com/identity/images/g-logo.png'
      },
      {
        id: 'github',
        name: 'GitHub',
        iconUrl: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
      }
    ]
  }

  getConfiguration(): AuthConfiguration {
    return {
      provider: 'mock',
      oauthProviders: ['google', 'github']
    }
  }

  async updateUser(id: string, data: UpdateProfileRequest): Promise<AuthResult> {
    const user = this.mockUsers.get(id)
    
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    // Validate email if updating
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        return {
          success: false,
          error: 'Invalid email format'
        }
      }

      // Check if email is already taken by another user
      const existingUser = Array.from(this.mockUsers.values()).find(
        u => u.email === data.email && u.id !== id
      )
      if (existingUser) {
        return {
          success: false,
          error: 'Email already in use'
        }
      }

      // Reset email verification when email changes
      user.emailVerified = null
    }

    // Update user fields
    if (data.name !== undefined) user.name = data.name
    if (data.email !== undefined) user.email = data.email
    if (data.image !== undefined) user.image = data.image

    // Return updated user without password
    const { password: _, ...authUser } = user
    return {
      success: true,
      user: authUser
    }
  }

  async deleteUser(id: string): Promise<AuthResult> {
    const user = this.mockUsers.get(id)
    
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    this.mockUsers.delete(id)
    
    return {
      success: true
    }
  }

  async verifyUserEmail(id: string): Promise<AuthResult> {
    const user = this.mockUsers.get(id)
    
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    user.emailVerified = new Date()
    
    // Return user without password
    const { password: _, ...authUser } = user
    return {
      success: true,
      user: authUser
    }
  }

  async changeUserPassword(id: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
    const user = this.mockUsers.get(id)
    
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    // Verify current password
    if (user.password !== currentPassword) {
      return {
        success: false,
        error: 'Current password is incorrect'
      }
    }

    // Validate new password
    if (newPassword.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters'
      }
    }

    // Update password
    user.password = newPassword

    // Return user without password
    const { password: _, ...authUser } = user
    return {
      success: true,
      user: authUser
    }
  }

  async resetUserPassword(id: string, newPassword: string): Promise<AuthResult> {
    const user = this.mockUsers.get(id)
    
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      }
    }

    // Validate new password
    if (newPassword.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters'
      }
    }

    // Update password (no current password verification needed for reset)
    user.password = newPassword

    // Return user without password
    const { password: _, ...authUser } = user
    return {
      success: true,
      user: authUser
    }
  }
}