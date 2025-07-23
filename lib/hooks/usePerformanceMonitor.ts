import { useEffect, useRef, useState, useCallback } from 'react';

import { useRouter } from 'next/navigation';

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift

  // Additional metrics
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  fmp?: number; // First Meaningful Paint

  // Runtime metrics
  renderTime?: number;
  componentMountTime?: number;
  apiResponseTime?: number;

  // Resource metrics
  memoryUsage?: MemoryInfo;
  connectionType?: string;

  // User interaction metrics
  userInteractions?: number;
  scrollDepth?: number;
  timeOnPage?: number;

  // Error metrics
  errorRate?: number;
  errorCount?: number;

  // Custom metrics
  customMetrics?: Record<string, number>;
}

export interface PerformanceConfig {
  enabled?: boolean;
  trackCoreWebVitals?: boolean;
  trackRuntimeMetrics?: boolean;
  trackUserInteractions?: boolean;
  trackMemoryUsage?: boolean;
  enableAnalytics?: boolean;
  reportingInterval?: number; // ms
  sampleRate?: number; // 0-1, percentage of sessions to monitor
  customMetrics?: string[];
}

const defaultConfig: PerformanceConfig = {
  enabled: true,
  trackCoreWebVitals: true,
  trackRuntimeMetrics: true,
  trackUserInteractions: true,
  trackMemoryUsage: true,
  enableAnalytics: false,
  reportingInterval: 30000, // 30 seconds
  sampleRate: 0.1, // 10% of sessions
  customMetrics: [],
};

export const usePerformanceMonitor = (config: PerformanceConfig = {}) => {
  const finalConfig = { ...defaultConfig, ...config };
  const router = useRouter();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Refs for tracking
  const startTime = useRef<number>(Date.now());
  const interactionCount = useRef<number>(0);
  const maxScrollDepth = useRef<number>(0);
  const customMetricsRef = useRef<Record<string, number>>({});
  const reportingInterval = useRef<NodeJS.Timeout>();
  const observerRef = useRef<PerformanceObserver>();

  // Check if monitoring should be enabled
  const shouldMonitor = useCallback(() => {
    if (!finalConfig.enabled) return false;
    if (typeof window === 'undefined') return false;
    if (Math.random() > finalConfig.sampleRate) return false;
    return true;
  }, [finalConfig.enabled, finalConfig.sampleRate]);

  // Core Web Vitals monitoring
  const measureCoreWebVitals = useCallback(() => {
    if (!finalConfig.trackCoreWebVitals || typeof window === 'undefined')
      return;

    try {
      // Use web-vitals library if available, otherwise fallback to Performance API
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();

          entries.forEach(entry => {
            switch (entry.entryType) {
              case 'largest-contentful-paint':
                setMetrics(prev => ({ ...prev, lcp: entry.startTime }));
                break;
              case 'first-input':
                setMetrics(prev => ({
                  ...prev,
                  fid: entry.processingStart - entry.startTime,
                }));
                break;
              case 'layout-shift':
                if (!(entry as LayoutShiftEntry).hadRecentInput) {
                  setMetrics(prev => ({
                    ...prev,
                    cls: (prev.cls || 0) + (entry as LayoutShiftEntry).value,
                  }));
                }
                break;
              case 'paint':
                if (entry.name === 'first-contentful-paint') {
                  setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
                }
                break;
              case 'navigation':
                const navEntry = entry as PerformanceNavigationTiming;
                setMetrics(prev => ({
                  ...prev,
                  ttfb: navEntry.responseStart - navEntry.requestStart,
                }));
                break;
            }
          });
        });

        observer.observe({
          entryTypes: [
            'largest-contentful-paint',
            'first-input',
            'layout-shift',
            'paint',
            'navigation',
          ],
        });
        observerRef.current = observer;
      }
    } catch (error) {
      console.warn('Core Web Vitals monitoring failed:', error);
    }
  }, [finalConfig.trackCoreWebVitals]);

  // Runtime metrics monitoring
  const measureRuntimeMetrics = useCallback(() => {
    if (!finalConfig.trackRuntimeMetrics || typeof window === 'undefined')
      return;

    const measureComponentPerformance = () => {
      const now = performance.now();
      const mountTime = now - startTime.current;

      setMetrics(prev => ({
        ...prev,
        componentMountTime: mountTime,
        renderTime: now,
      }));
    };

    // Measure on next frame
    requestAnimationFrame(measureComponentPerformance);
  }, [finalConfig.trackRuntimeMetrics]);

  // Memory usage monitoring
  const measureMemoryUsage = useCallback(() => {
    if (!finalConfig.trackMemoryUsage || typeof window === 'undefined') return;

    try {
      if ('memory' in performance) {
        const memoryInfo = (
          performance as unknown as {
            memory: {
              usedJSHeapSize: number;
              totalJSHeapSize: number;
              jsHeapSizeLimit: number;
            };
          }
        ).memory;
        setMetrics(prev => ({ ...prev, memoryUsage: memoryInfo }));
      }
    } catch (error) {
      console.warn('Memory usage monitoring failed:', error);
    }
  }, [finalConfig.trackMemoryUsage]);

  // User interaction monitoring
  const measureUserInteractions = useCallback(() => {
    if (!finalConfig.trackUserInteractions || typeof window === 'undefined')
      return;

    const handleInteraction = () => {
      interactionCount.current++;
      setMetrics(prev => ({
        ...prev,
        userInteractions: interactionCount.current,
      }));
    };

    const handleScroll = () => {
      const scrollDepth = Math.round(
        (window.scrollY /
          (document.documentElement.scrollHeight - window.innerHeight)) *
          100,
      );

      if (scrollDepth > maxScrollDepth.current) {
        maxScrollDepth.current = scrollDepth;
        setMetrics(prev => ({ ...prev, scrollDepth }));
      }
    };

    // Track various user interactions
    const events = ['click', 'keydown', 'touchstart', 'mousemove'];
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { passive: true });
    });

    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
      document.removeEventListener('scroll', handleScroll);
    };
  }, [finalConfig.trackUserInteractions]);

  // API response time tracking
  const trackApiCall = useCallback(
    (url: string, startTime: number, endTime: number) => {
      const responseTime = endTime - startTime;
      setMetrics(prev => ({
        ...prev,
        apiResponseTime: responseTime,
        customMetrics: {
          ...prev.customMetrics,
          [`api_${url.replace(/[^a-zA-Z0-9]/g, '_')}`]: responseTime,
        },
      }));
    },
    [],
  );

  // Custom metrics tracking
  const trackCustomMetric = useCallback((name: string, value: number) => {
    customMetricsRef.current[name] = value;
    setMetrics(prev => ({
      ...prev,
      customMetrics: {
        ...prev.customMetrics,
        [name]: value,
      },
    }));
  }, []);

  // Error tracking
  const trackError = useCallback((error: Error) => {
    setMetrics(prev => ({
      ...prev,
      errorCount: (prev.errorCount || 0) + 1,
      errorRate: ((prev.errorCount || 0) + 1) / (prev.userInteractions || 1),
    }));
  }, []);

  // Connection type monitoring
  const measureConnectionType = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const connection = (
        navigator as unknown as { connection?: { effectiveType?: string } }
      ).connection;
      if (connection) {
        setMetrics(prev => ({
          ...prev,
          connectionType: connection.effectiveType,
        }));
      }
    } catch (error) {
      console.warn('Connection type monitoring failed:', error);
    }
  }, []);

  // Time on page tracking
  const trackTimeOnPage = useCallback(() => {
    const updateTimeOnPage = () => {
      const timeOnPage = Date.now() - startTime.current;
      setMetrics(prev => ({ ...prev, timeOnPage }));
    };

    const interval = setInterval(updateTimeOnPage, 1000);
    return () => clearInterval(interval);
  }, []);

  // Report metrics to analytics service
  const reportMetrics = useCallback(
    async (metricsToReport: PerformanceMetrics) => {
      if (!finalConfig.enableAnalytics) return;

      try {
        // Send to analytics service
        await fetch('/api/analytics/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics: metricsToReport,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
          }),
        });
      } catch (error) {
        console.warn('Failed to report performance metrics:', error);
      }
    },
    [finalConfig.enableAnalytics],
  );

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!shouldMonitor()) return;

    setIsMonitoring(true);

    measureCoreWebVitals();
    measureRuntimeMetrics();
    measureMemoryUsage();
    measureConnectionType();

    const cleanupInteractions = measureUserInteractions();
    const cleanupTimeTracking = trackTimeOnPage();

    // Set up periodic reporting
    if (finalConfig.reportingInterval && finalConfig.reportingInterval > 0) {
      reportingInterval.current = setInterval(() => {
        reportMetrics(metrics);
      }, finalConfig.reportingInterval);
    }

    return () => {
      setIsMonitoring(false);
      cleanupInteractions?.();
      cleanupTimeTracking?.();
      if (reportingInterval.current) {
        clearInterval(reportingInterval.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [
    shouldMonitor,
    measureCoreWebVitals,
    measureRuntimeMetrics,
    measureMemoryUsage,
    measureConnectionType,
    measureUserInteractions,
    trackTimeOnPage,
    reportMetrics,
    metrics,
    finalConfig.reportingInterval,
  ]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (reportingInterval.current) {
      clearInterval(reportingInterval.current);
    }
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    setMetrics({});
    startTime.current = Date.now();
    interactionCount.current = 0;
    maxScrollDepth.current = 0;
    customMetricsRef.current = {};
  }, []);

  // Auto-start monitoring on mount
  useEffect(() => {
    const cleanup = startMonitoring();
    return cleanup;
  }, [startMonitoring]);

  // Auto-stop monitoring on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetMetrics,
    trackApiCall,
    trackCustomMetric,
    trackError,
    reportMetrics: () => reportMetrics(metrics),
  };
};

// Hook for monitoring specific component performance
export const useComponentPerformance = (componentName: string) => {
  const [renderTime, setRenderTime] = useState<number>(0);
  const [mountTime, setMountTime] = useState<number>(0);
  const mountStart = useRef<number>(performance.now());

  useEffect(() => {
    const mountEnd = performance.now();
    const totalMountTime = mountEnd - mountStart.current;
    setMountTime(totalMountTime);
  }, []);

  useEffect(() => {
    const renderStart = performance.now();

    const measureRender = () => {
      const renderEnd = performance.now();
      setRenderTime(renderEnd - renderStart);
    };

    // Measure on next frame
    requestAnimationFrame(measureRender);
  });

  return {
    componentName,
    renderTime,
    mountTime,
    metrics: {
      [`${componentName}_render_time`]: renderTime,
      [`${componentName}_mount_time`]: mountTime,
    },
  };
};

// Hook for monitoring API calls
export const useApiPerformance = () => {
  const [apiMetrics, setApiMetrics] = useState<Record<string, number>>({});

  const trackApiCall = useCallback(
    async <T>(url: string, apiCall: () => Promise<T>): Promise<T> => {
      const startTime = performance.now();

      try {
        const result = await apiCall();
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        setApiMetrics(prev => ({
          ...prev,
          [url]: responseTime,
          [`${url}_success`]: (prev[`${url}_success`] || 0) + 1,
        }));

        return result;
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        setApiMetrics(prev => ({
          ...prev,
          [url]: responseTime,
          [`${url}_error`]: (prev[`${url}_error`] || 0) + 1,
        }));

        throw error;
      }
    },
    [],
  );

  return {
    apiMetrics,
    trackApiCall,
  };
};

export default usePerformanceMonitor;
