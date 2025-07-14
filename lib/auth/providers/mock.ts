import { AuthProvider, AuthResult, AuthUser, SignUpRequest, AuthConfiguration } from '../types'

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

  getConfiguration(): AuthConfiguration {
    return {
      provider: 'mock',
      oauthProviders: ['google', 'github']
    }
  }
}