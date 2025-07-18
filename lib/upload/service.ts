import { UploadService } from './types'
import { MockUploadService } from './mock'

function createUploadService(): UploadService {
  // For now, always use mock service
  // In the future, we can switch to real services based on environment
  return new MockUploadService()
}

export const uploadService = createUploadService()