import { MockUploadService } from './mock';
import { type UploadService } from './types';

function createUploadService(): UploadService {
  // For now, always use mock service
  // In the future, we can switch to real services based on environment
  return new MockUploadService();
}

export const uploadService = createUploadService();
