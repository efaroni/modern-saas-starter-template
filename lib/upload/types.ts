export interface UploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export interface UploadService {
  uploadFile(file: File, folder: string): Promise<UploadResult>;
  deleteFile(url: string): Promise<DeleteResult>;
  generateUrl(folder: string, fileName: string): string;
}

export interface UploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  baseUrl: string;
}
