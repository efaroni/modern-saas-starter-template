import { type UploadService, type UploadResult, type DeleteResult } from './types';

export class MockUploadService implements UploadService {
  private uploadedFiles = new Map<string, string>();
  private shouldFail = false;
  private config = {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    baseUrl: 'https://storage.example.com',
  };

  async uploadFile(file: File, folder: string): Promise<UploadResult> {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate failure if requested
    if (this.shouldFail) {
      return {
        success: false,
        error: 'Upload failed',
      };
    }

    // Validate file type
    if (!this.config.allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type',
      };
    }

    // Validate file size
    if (file.size > this.config.maxFileSize) {
      return {
        success: false,
        error: 'File too large',
      };
    }

    // Generate mock filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${timestamp}.${extension}`;
    const url = this.generateUrl(folder, fileName);

    // Store in mock storage
    this.uploadedFiles.set(url, fileName);

    return {
      success: true,
      url,
      fileName,
    };
  }

  async deleteFile(url: string): Promise<DeleteResult> {
    // Simulate deletion delay
    await new Promise(resolve => setTimeout(resolve, 50));

    if (!this.uploadedFiles.has(url)) {
      return {
        success: false,
        error: 'File not found',
      };
    }

    this.uploadedFiles.delete(url);
    return {
      success: true,
    };
  }

  generateUrl(folder: string, fileName: string): string {
    return `${this.config.baseUrl}/${folder}/${fileName}`;
  }

  // Helper methods for testing
  getUploadedFiles(): Map<string, string> {
    return new Map(this.uploadedFiles);
  }

  clearUploadedFiles(): void {
    this.uploadedFiles.clear();
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
}