import { EmailService } from './types'
import { MockEmailService } from './mock'

function createEmailService(): EmailService {
  // For now, always use mock service
  // In the future, we can switch to real services based on environment
  return new MockEmailService()
}

export const emailService = createEmailService()