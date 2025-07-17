export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  score: number // 0-100 password strength score
}

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  forbidCommonPasswords: boolean
  forbidUserInfo: boolean
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbidCommonPasswords: true,
  forbidUserInfo: true
}

// Common passwords to reject
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '123456789', 'qwerty',
  'abc123', 'password1', 'admin', 'letmein', 'welcome',
  'monkey', '1234567890', 'dragon', 'master', 'hello',
  'login', 'pass', 'admin123', 'root', 'administrator',
  'test', 'guest', 'user', 'demo', 'sample'
]

export class PasswordValidator {
  private policy: PasswordPolicy

  constructor(policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY) {
    this.policy = policy
  }

  /**
   * Validates a password against the configured policy
   */
  validate(password: string, userInfo?: { email?: string, name?: string }): PasswordValidationResult {
    const errors: string[] = []
    let score = 0

    // Length check
    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`)
    } else {
      score += Math.min(25, (password.length - this.policy.minLength) * 2)
    }

    // Character type checks
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    } else if (/[A-Z]/.test(password)) {
      score += 20
    }

    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    } else if (/[a-z]/.test(password)) {
      score += 20
    }

    if (this.policy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    } else if (/[0-9]/.test(password)) {
      score += 20
    }

    if (this.policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 15
    }

    // Common password check
    if (this.policy.forbidCommonPasswords && this.isCommonPassword(password)) {
      errors.push('Password is too common, please choose a more unique password')
      score -= 30
    }

    // User info check
    if (this.policy.forbidUserInfo && userInfo && this.containsUserInfo(password, userInfo)) {
      errors.push('Password should not contain your email or name')
      score -= 20
    }

    // Additional complexity checks
    if (this.hasRepeatingCharacters(password)) {
      score -= 10
    }

    if (this.hasSequentialCharacters(password)) {
      score -= 10
    }

    // Bonus for length
    if (password.length >= 12) {
      score += 10
    }

    if (password.length >= 16) {
      score += 10
    }

    // Ensure score is between 0-100
    score = Math.max(0, Math.min(100, score))

    return {
      isValid: errors.length === 0,
      errors,
      score
    }
  }

  /**
   * Gets password strength description
   */
  getStrengthDescription(score: number): string {
    if (score >= 80) return 'Very Strong'
    if (score >= 60) return 'Strong'
    if (score >= 40) return 'Good'
    if (score >= 20) return 'Weak'
    return 'Very Weak'
  }

  /**
   * Checks if password is in common passwords list
   */
  private isCommonPassword(password: string): boolean {
    const lowerPassword = password.toLowerCase()
    return COMMON_PASSWORDS.some(common => 
      lowerPassword.includes(common) || common.includes(lowerPassword)
    )
  }

  /**
   * Checks if password contains user information
   */
  private containsUserInfo(password: string, userInfo: { email?: string, name?: string }): boolean {
    const lowerPassword = password.toLowerCase()
    
    if (userInfo.email) {
      const emailUser = userInfo.email.split('@')[0].toLowerCase()
      if (emailUser.length >= 3 && lowerPassword.includes(emailUser)) {
        return true
      }
    }

    if (userInfo.name) {
      const nameParts = userInfo.name.toLowerCase().split(' ')
      for (const part of nameParts) {
        if (part.length >= 3 && lowerPassword.includes(part)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Checks for repeating characters (e.g., "aaa", "111")
   */
  private hasRepeatingCharacters(password: string): boolean {
    for (let i = 0; i < password.length - 2; i++) {
      if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
        return true
      }
    }
    return false
  }

  /**
   * Checks for sequential characters (e.g., "abc", "123")
   */
  private hasSequentialCharacters(password: string): boolean {
    const sequences = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop']
    
    for (const sequence of sequences) {
      for (let i = 0; i < password.length - 2; i++) {
        const substr = password.substring(i, i + 3).toLowerCase()
        if (sequence.includes(substr) || sequence.split('').reverse().join('').includes(substr)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Suggests improvements for a weak password
   */
  getSuggestions(password: string): string[] {
    const suggestions: string[] = []

    if (password.length < 12) {
      suggestions.push('Make your password longer (12+ characters recommended)')
    }

    if (!/[A-Z]/.test(password)) {
      suggestions.push('Add uppercase letters')
    }

    if (!/[a-z]/.test(password)) {
      suggestions.push('Add lowercase letters')
    }

    if (!/[0-9]/.test(password)) {
      suggestions.push('Add numbers')
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      suggestions.push('Add special characters (!@#$%^&*)')
    }

    if (this.hasRepeatingCharacters(password)) {
      suggestions.push('Avoid repeating characters')
    }

    if (this.hasSequentialCharacters(password)) {
      suggestions.push('Avoid sequential characters (abc, 123)')
    }

    if (this.isCommonPassword(password)) {
      suggestions.push('Avoid common passwords')
    }

    return suggestions
  }
}