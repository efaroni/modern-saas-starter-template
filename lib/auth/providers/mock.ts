import { AuthProvider, AuthResult, AuthUser, SignUpRequest, AuthConfiguration, OAuthProvider, OAuthResult } from '../types'

export class MockAuthProvider implements AuthProvider {
  private mockUsers = new Map<string, AuthUser>([
    ['test-user-id', {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: null,
      emailVerified: new Date()
    }]
  ])

  async authenticateUser(email: string, password: string): Promise<AuthResult> {
    // Mock authentication logic
    if (email === 'test@example.com' && password === 'password') {
      const user = this.mockUsers.get('test-user-id')
      return {
        success: true,
        user
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
    const newUser: AuthUser = {
      id: `user-${Date.now()}`,
      email,
      name: name || null,
      image: null,
      emailVerified: null
    }

    this.mockUsers.set(newUser.id, newUser)

    return {
      success: true,
      user: newUser
    }
  }

  async getUserById(id: string): Promise<AuthResult> {
    const user = this.mockUsers.get(id)
    return {
      success: true,
      user: user || null
    }
  }

  isConfigured(): boolean {
    return true
  }

  async signInWithOAuth(provider: string): Promise<OAuthResult> {
    // Simulate OAuth flow delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock OAuth providers
    const oauthUsers = {
      google: {
        id: 'google-user-id',
        email: 'user@gmail.com',
        name: 'Google User',
        image: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        emailVerified: new Date()
      },
      github: {
        id: 'github-user-id',
        email: 'user@github.com',
        name: 'GitHub User',
        image: 'https://avatars.githubusercontent.com/u/123456?v=4',
        emailVerified: new Date()
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

    return {
      success: true,
      user: oauthUser
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
}