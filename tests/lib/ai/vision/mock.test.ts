import { MockVisionService } from '@/lib/ai/vision/mock';

describe('MockVisionService', () => {
  let service: MockVisionService;

  beforeEach(() => {
    service = new MockVisionService();
  });

  describe('analyzeDesign', () => {
    it('should return mock analysis result for valid images', async () => {
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const input = { images: [file] };

      const result = await service.analyzeDesign(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('styleGuide');
        expect(result.data).toHaveProperty('tailwindConfig');
        expect(result.data).toHaveProperty('globalsCss');
        expect(result.data).toHaveProperty('metadata');
        expect(typeof result.data.styleGuide).toBe('string');
        expect(typeof result.data.tailwindConfig).toBe('string');
        expect(typeof result.data.globalsCss).toBe('string');
      }
    });

    it('should simulate processing time', async () => {
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const input = { images: [file] };

      const startTime = Date.now();
      await service.analyzeDesign(input);
      const endTime = Date.now();

      // Should take at least 1500ms due to simulated delay
      expect(endTime - startTime).toBeGreaterThanOrEqual(1400);
    });

    it('should reject invalid image types', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = { images: [file] };

      const result = await service.analyzeDesign(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_IMAGE');
        expect(result.error.message).toContain('Invalid image: test.txt');
      }
    });

    it('should reject oversized images', async () => {
      // Create a mock file that appears to be over 20MB
      const oversizedFile = new File(['x'.repeat(1000)], 'large.png', {
        type: 'image/png',
      });
      Object.defineProperty(oversizedFile, 'size', {
        value: 21 * 1024 * 1024, // 21MB
        writable: false,
      });

      const input = { images: [oversizedFile] };

      const result = await service.analyzeDesign(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_IMAGE');
        expect(result.error.message).toContain('Invalid image: large.png');
      }
    });

    it('should handle multiple valid images', async () => {
      const file1 = new File(['test1'], 'test1.png', { type: 'image/png' });
      const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
      const input = { images: [file1, file2] };

      const result = await service.analyzeDesign(input);

      expect(result.success).toBe(true);
    });
  });

  describe('validateImage', () => {
    it('should accept valid PNG files', async () => {
      const file = new File(['test'], 'test.png', { type: 'image/png' });

      const result = await service.validateImage(file);

      expect(result).toBe(true);
    });

    it('should accept valid JPEG files', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      const result = await service.validateImage(file);

      expect(result).toBe(true);
    });

    it('should accept valid WebP files', async () => {
      const file = new File(['test'], 'test.webp', { type: 'image/webp' });

      const result = await service.validateImage(file);

      expect(result).toBe(true);
    });

    it('should reject invalid file types', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      const result = await service.validateImage(file);

      expect(result).toBe(false);
    });

    it('should reject files over 20MB', async () => {
      const oversizedFile = new File(['x'.repeat(1000)], 'large.png', {
        type: 'image/png',
      });
      Object.defineProperty(oversizedFile, 'size', {
        value: 21 * 1024 * 1024, // 21MB
        writable: false,
      });

      const result = await service.validateImage(oversizedFile);

      expect(result).toBe(false);
    });

    it('should accept files exactly at 20MB limit', async () => {
      const maxSizeFile = new File(['x'.repeat(1000)], 'max.png', {
        type: 'image/png',
      });
      Object.defineProperty(maxSizeFile, 'size', {
        value: 20 * 1024 * 1024, // Exactly 20MB
        writable: false,
      });

      const result = await service.validateImage(maxSizeFile);

      expect(result).toBe(true);
    });
  });
});
