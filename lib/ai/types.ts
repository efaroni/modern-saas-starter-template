export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  background: string;
  text: string;
  colors: string[]; // Additional extracted colors
}

export interface TypographyStyle {
  primaryFont: string;
  secondaryFont: string;
  fontSizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  fontWeights: {
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };
}

export interface SpacingSystem {
  unit: number;
  scale: string[];
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

export interface DesignAnalysis {
  designStyle: string;
  colorPalette: ColorPalette;
  typography: TypographyStyle;
  spacing: SpacingSystem;
  components: {
    buttons: string;
    cards: string;
    inputs: string;
    navigation: string;
  };
  specialEffects: string[];
}

export interface AnalysisResult {
  analysis: DesignAnalysis;
  styleGuide: string;
  tailwindConfig: string;
  globalsCss: string;
  estimatedCost: number;
  tokensUsed: number;
}

export interface AIProvider {
  analyzeScreenshot(imageBuffer: Buffer): Promise<AnalysisResult>;
  estimateCost(imageSize: number): number;
}

export interface AIService {
  analyzeScreenshot(imageBuffer: Buffer): Promise<AnalysisResult>;
  getProviderStatus(): Promise<{
    connected: boolean;
    provider: 'openai' | 'mock';
  }>;
}
