// Performance monitoring utilities

export interface PerformanceThresholds {
  lcp: { good: number; poor: number };
  fid: { good: number; poor: number };
  cls: { good: number; poor: number };
  fcp: { good: number; poor: number };
  ttfb: { good: number; poor: number };
  renderTime: { good: number; poor: number };
  apiResponseTime: { good: number; poor: number };
  memoryUsage: { good: number; poor: number };
}

export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
  renderTime: { good: 16, poor: 100 }, // 16ms for 60fps
  apiResponseTime: { good: 200, poor: 1000 },
  memoryUsage: { good: 50 * 1024 * 1024, poor: 100 * 1024 * 1024 }, // 50MB good, 100MB poor
};

export type PerformanceScore = 'good' | 'needs-improvement' | 'poor';

/**
 * Calculate performance score based on value and thresholds
 */
export function calculateScore(
  value: number,
  thresholds: { good: number; poor: number },
): PerformanceScore {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Calculate overall performance score from multiple metrics
 */
export function calculateOverallScore(
  metrics: Record<string, number>,
  thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS,
): { score: PerformanceScore; details: Record<string, PerformanceScore> } {
  const scores: Record<string, PerformanceScore> = {};
  let totalScore = 0;
  let metricCount = 0;

  // Calculate individual scores
  Object.entries(metrics).forEach(([key, value]) => {
    if (key in thresholds) {
      const threshold = thresholds[key as keyof PerformanceThresholds];
      const score = calculateScore(value, threshold);
      scores[key] = score;

      // Convert to numeric for averaging
      if (score === 'good') {
        totalScore += 3;
      } else if (score === 'needs-improvement') {
        totalScore += 2;
      } else {
        totalScore += 1;
      }
      metricCount++;
    }
  });

  // Calculate overall score
  const avgScore = metricCount > 0 ? totalScore / metricCount : 3;
  let overallScore: PerformanceScore;
  if (avgScore >= 2.5) {
    overallScore = 'good';
  } else if (avgScore >= 1.5) {
    overallScore = 'needs-improvement';
  } else {
    overallScore = 'poor';
  }

  return { score: overallScore, details: scores };
}

/**
 * Format performance metric for display
 */
export function formatMetric(value: number, unit: string): string {
  if (unit === 'ms') {
    return `${Math.round(value)}ms`;
  }
  if (unit === 'MB') {
    return `${Math.round(value / (1024 * 1024))}MB`;
  }
  if (unit === 'score') {
    return value.toFixed(3);
  }
  if (unit === '%') {
    return `${Math.round(value)}%`;
  }
  return value.toString();
}

/**
 * Get performance insights and recommendations
 */
export function getPerformanceInsights(
  metrics: Record<string, number>,
  thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS,
): {
  insights: string[];
  recommendations: string[];
  priority: 'low' | 'medium' | 'high';
} {
  const insights: string[] = [];
  const recommendations: string[] = [];
  let priority: 'low' | 'medium' | 'high' = 'low';

  // Analyze LCP
  if (metrics.lcp) {
    const lcpScore = calculateScore(metrics.lcp, thresholds.lcp);
    if (lcpScore === 'poor') {
      insights.push(`LCP is ${formatMetric(metrics.lcp, 'ms')}, which is poor`);
      recommendations.push(
        'Optimize largest contentful paint by reducing server response time, using a CDN, or optimizing images',
      );
      priority = 'high';
    } else if (lcpScore === 'needs-improvement') {
      insights.push(
        `LCP is ${formatMetric(metrics.lcp, 'ms')}, which needs improvement`,
      );
      recommendations.push(
        'Consider optimizing images, preloading critical resources, or improving server response time',
      );
      if (priority === 'low') priority = 'medium';
    }
  }

  // Analyze FID
  if (metrics.fid) {
    const fidScore = calculateScore(metrics.fid, thresholds.fid);
    if (fidScore === 'poor') {
      insights.push(`FID is ${formatMetric(metrics.fid, 'ms')}, which is poor`);
      recommendations.push(
        'Reduce JavaScript execution time, break up long tasks, or use a web worker',
      );
      priority = 'high';
    } else if (fidScore === 'needs-improvement') {
      insights.push(
        `FID is ${formatMetric(metrics.fid, 'ms')}, which needs improvement`,
      );
      recommendations.push(
        'Optimize JavaScript execution or defer non-essential scripts',
      );
      if (priority === 'low') priority = 'medium';
    }
  }

  // Analyze CLS
  if (metrics.cls) {
    const clsScore = calculateScore(metrics.cls, thresholds.cls);
    if (clsScore === 'poor') {
      insights.push(
        `CLS is ${formatMetric(metrics.cls, 'score')}, which is poor`,
      );
      recommendations.push(
        'Add size attributes to images, reserve space for ads, or avoid inserting content above existing content',
      );
      priority = 'high';
    } else if (clsScore === 'needs-improvement') {
      insights.push(
        `CLS is ${formatMetric(metrics.cls, 'score')}, which needs improvement`,
      );
      recommendations.push(
        'Improve layout stability by setting dimensions on media elements',
      );
      if (priority === 'low') priority = 'medium';
    }
  }

  // Analyze memory usage
  if (metrics.memoryUsage) {
    const memoryScore = calculateScore(
      metrics.memoryUsage,
      thresholds.memoryUsage,
    );
    if (memoryScore === 'poor') {
      insights.push(
        `Memory usage is ${formatMetric(metrics.memoryUsage, 'MB')}, which is high`,
      );
      recommendations.push(
        'Check for memory leaks, optimize images, or reduce JavaScript bundle size',
      );
      if (priority !== 'high') priority = 'medium';
    }
  }

  // Analyze API response time
  if (metrics.apiResponseTime) {
    const apiScore = calculateScore(
      metrics.apiResponseTime,
      thresholds.apiResponseTime,
    );
    if (apiScore === 'poor') {
      insights.push(
        `API response time is ${formatMetric(metrics.apiResponseTime, 'ms')}, which is slow`,
      );
      recommendations.push(
        'Optimize database queries, use caching, or improve server infrastructure',
      );
      if (priority !== 'high') priority = 'medium';
    }
  }

  // Add positive insights
  if (insights.length === 0) {
    insights.push('Performance metrics are looking good!');
  }

  return { insights, recommendations, priority };
}

/**
 * Performance monitoring decorators
 */
export function measurePerformance<T extends(...args: unknown[]) => unknown>(
  target: T,
  name?: string,
): T {
  const functionName = name || target.name || 'anonymous';

  return ((...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();

    try {
      const result = target(...args);

      // Handle both sync and async functions
      if (result instanceof Promise) {
        return result.finally(() => {
          const end = performance.now();
          console.warn(`${functionName} executed in ${end - start}ms`);
        }) as ReturnType<T>;
      } else {
        const end = performance.now();
        console.warn(`${functionName} executed in ${end - start}ms`);
        return result;
      }
    } catch (error) {
      const end = performance.now();
      console.error(`${functionName} failed after ${end - start}ms`);
      throw error;
    }
  }) as T;
}

/**
 * Resource timing utilities
 */
export interface ResourceTiming {
  name: string;
  duration: number;
  size: number;
  type: string;
  cached: boolean;
}

export function getResourceTimings(): ResourceTiming[] {
  if (typeof window === 'undefined' || !window.performance) {
    return [];
  }

  const resources = performance.getEntriesByType(
    'resource',
  ) as PerformanceResourceTiming[];

  return resources.map(resource => ({
    name: resource.name,
    duration: resource.duration,
    size: resource.transferSize || 0,
    type: getResourceType(resource.name),
    cached: resource.transferSize === 0 && resource.decodedBodySize > 0,
  }));
}

function getResourceType(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'js':
      return 'javascript';
    case 'css':
      return 'stylesheet';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return 'image';
    case 'woff':
    case 'woff2':
    case 'ttf':
      return 'font';
    case 'svg':
      return 'svg';
    default:
      return 'other';
  }
}

/**
 * Performance budget utilities
 */
export interface PerformanceBudget {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
  totalJSSize: number;
  totalCSSSize: number;
  totalImageSize: number;
  totalFontSize: number;
}

export const DEFAULT_BUDGET: PerformanceBudget = {
  lcp: 2500,
  fid: 100,
  cls: 0.1,
  fcp: 1800,
  ttfb: 800,
  totalJSSize: 300 * 1024, // 300KB
  totalCSSSize: 100 * 1024, // 100KB
  totalImageSize: 500 * 1024, // 500KB
  totalFontSize: 100 * 1024, // 100KB
};

export function checkPerformanceBudget(
  metrics: Record<string, number>,
  budget: PerformanceBudget = DEFAULT_BUDGET,
): {
  passed: boolean;
  violations: string[];
  warnings: string[];
} {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check Core Web Vitals
  if (metrics.lcp > budget.lcp) {
    violations.push(
      `LCP (${formatMetric(metrics.lcp, 'ms')}) exceeds budget (${formatMetric(budget.lcp, 'ms')})`,
    );
  }

  if (metrics.fid > budget.fid) {
    violations.push(
      `FID (${formatMetric(metrics.fid, 'ms')}) exceeds budget (${formatMetric(budget.fid, 'ms')})`,
    );
  }

  if (metrics.cls > budget.cls) {
    violations.push(
      `CLS (${formatMetric(metrics.cls, 'score')}) exceeds budget (${formatMetric(budget.cls, 'score')})`,
    );
  }

  // Check resource sizes
  const resourceTimings = getResourceTimings();
  const resourceSizes = resourceTimings.reduce(
    (acc, resource) => {
      acc[resource.type] = (acc[resource.type] || 0) + resource.size;
      return acc;
    },
    {} as Record<string, number>,
  );

  if (resourceSizes.javascript > budget.totalJSSize) {
    violations.push(
      `JavaScript size (${formatMetric(resourceSizes.javascript, 'MB')}) exceeds budget (${formatMetric(budget.totalJSSize, 'MB')})`,
    );
  }

  if (resourceSizes.stylesheet > budget.totalCSSSize) {
    violations.push(
      `CSS size (${formatMetric(resourceSizes.stylesheet, 'MB')}) exceeds budget (${formatMetric(budget.totalCSSSize, 'MB')})`,
    );
  }

  if (resourceSizes.image > budget.totalImageSize) {
    warnings.push(
      `Image size (${formatMetric(resourceSizes.image, 'MB')}) exceeds budget (${formatMetric(budget.totalImageSize, 'MB')})`,
    );
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Performance monitoring setup
 */
export function setupPerformanceMonitoring(config: {
  reportToConsole?: boolean;
  reportToAPI?: boolean;
  apiEndpoint?: string;
  sampleRate?: number;
}) {
  if (typeof window === 'undefined') return;

  const {
    reportToConsole = true,
    reportToAPI = false,
    apiEndpoint = '/api/analytics/performance',
    sampleRate = 1,
  } = config;

  // Skip if not in sample
  if (Math.random() > sampleRate) return;

  let observer: PerformanceObserver | null = null;

  try {
    observer = new PerformanceObserver(list => {
      const entries = list.getEntries();

      entries.forEach(entry => {
        if (reportToConsole) {
          console.warn(`Performance: ${entry.name} - ${entry.duration}ms`);
        }

        if (reportToAPI) {
          // Send to API endpoint
          fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metrics: {
                [entry.name]: entry.duration,
              },
              timestamp: Date.now(),
              url: window.location.href,
              userAgent: navigator.userAgent,
            }),
          }).catch(error => {
            console.warn('Failed to report performance metrics:', error);
          });
        }
      });
    });

    observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
  } catch (error) {
    console.warn('Performance monitoring setup failed:', error);
  }

  // Cleanup function
  return () => {
    if (observer) {
      observer.disconnect();
    }
  };
}

export default {
  calculateScore,
  calculateOverallScore,
  formatMetric,
  getPerformanceInsights,
  measurePerformance,
  getResourceTimings,
  checkPerformanceBudget,
  setupPerformanceMonitoring,
};
