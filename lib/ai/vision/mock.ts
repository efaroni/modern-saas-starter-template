import { mockDesignAnalysisResult } from './mock-data';

import type {
  AnalyzeDesignInput,
  DesignAnalysisResult,
  VisionResult,
  VisionService,
} from './types';

export class MockVisionService implements VisionService {
  async analyzeDesign(
    input: AnalyzeDesignInput,
  ): Promise<VisionResult<DesignAnalysisResult>> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Validate images
    for (const image of input.images) {
      const isValid = await this.validateImage(image);
      if (!isValid) {
        return {
          success: false,
          error: {
            code: 'INVALID_IMAGE',
            message: `Invalid image: ${image.name}`,
          },
        };
      }
    }

    return {
      success: true,
      data: mockDesignAnalysisResult,
    };
  }

  validateImage(file: File): Promise<boolean> {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSize = 20 * 1024 * 1024; // 20MB

    return Promise.resolve(
      validTypes.includes(file.type) && file.size <= maxSize,
    );
  }
}
