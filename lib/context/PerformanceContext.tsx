'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { usePerformanceMonitor, type PerformanceMetrics, type PerformanceConfig } from '@/lib/hooks/usePerformanceMonitor';

interface PerformanceContextType {
  metrics: PerformanceMetrics
  isMonitoring: boolean
  startMonitoring: () => void
  stopMonitoring: () => void
  resetMetrics: () => void
  trackApiCall: (url: string, startTime: number, endTime: number) => void
  trackCustomMetric: (name: string, value: number) => void
  trackError: (error: Error) => void
  reportMetrics: () => void
  config: PerformanceConfig
}

const PerformanceContext = createContext<PerformanceContextType | null>(null);

export const usePerformanceContext = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformanceContext must be used within a PerformanceProvider');
  }
  return context;
};

interface PerformanceProviderProps {
  children: ReactNode
  config?: PerformanceConfig
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({
  children,
  config = {},
}) => {
  const performanceHook = usePerformanceMonitor(config);
  const [aggregatedMetrics, setAggregatedMetrics] = useState<PerformanceMetrics>({});

  // Aggregate metrics from all components
  useEffect(() => {
    setAggregatedMetrics(performanceHook.metrics);
  }, [performanceHook.metrics]);

  const value: PerformanceContextType = {
    ...performanceHook,
    metrics: aggregatedMetrics,
    config: {
      enabled: true,
      trackCoreWebVitals: true,
      trackRuntimeMetrics: true,
      trackUserInteractions: true,
      trackMemoryUsage: true,
      enableAnalytics: false,
      reportingInterval: 30000,
      sampleRate: 0.1,
      ...config,
    },
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};

// HOC for wrapping components with performance monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string,
) {
  const WrappedComponent = (props: P) => {
    const { trackCustomMetric } = usePerformanceContext();
    const name = componentName || Component.displayName || Component.name || 'Unknown';

    useEffect(() => {
      const startTime = performance.now();

      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        trackCustomMetric(`${name}_lifecycle_time`, renderTime);
      };
    }, [name, trackCustomMetric]);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName || Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for accessing performance context
export const usePerformance = () => {
  return usePerformanceContext();
};

// Performance metrics aggregator
export class PerformanceAggregator {
  private metrics: PerformanceMetrics[] = [];
  private callbacks: Array<(metrics: PerformanceMetrics) => void> = [];

  addMetrics(metrics: PerformanceMetrics) {
    this.metrics.push(metrics);
    this.notifyCallbacks(metrics);
  }

  getAggregatedMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) return {};

    const aggregated: PerformanceMetrics = {
      customMetrics: {},
    };

    // Aggregate numeric metrics
    const numericFields = ['lcp', 'fid', 'cls', 'fcp', 'ttfb', 'fmp', 'renderTime', 'componentMountTime', 'apiResponseTime', 'userInteractions', 'scrollDepth', 'timeOnPage', 'errorRate', 'errorCount'];

    numericFields.forEach(field => {
      const values = this.metrics
        .map(m => m[field as keyof PerformanceMetrics] as number)
        .filter(v => typeof v === 'number');

      if (values.length > 0) {
        aggregated[field as keyof PerformanceMetrics] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    });

    // Aggregate custom metrics
    const allCustomMetrics = this.metrics
      .map(m => m.customMetrics)
      .filter(Boolean)
      .reduce((acc, curr) => ({ ...acc, ...curr }), {});

    aggregated.customMetrics = allCustomMetrics;

    return aggregated;
  }

  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  private notifyCallbacks(metrics: PerformanceMetrics) {
    this.callbacks.forEach(callback => callback(metrics));
  }

  reset() {
    this.metrics = [];
  }
}

// Global performance aggregator instance
export const globalPerformanceAggregator = new PerformanceAggregator();

// Hook for subscribing to aggregated performance metrics
export const useAggregatedPerformance = () => {
  const [aggregatedMetrics, setAggregatedMetrics] = useState<PerformanceMetrics>({});

  useEffect(() => {
    const unsubscribe = globalPerformanceAggregator.subscribe((metrics) => {
      setAggregatedMetrics(globalPerformanceAggregator.getAggregatedMetrics());
    });

    return unsubscribe;
  }, []);

  return aggregatedMetrics;
};

// Performance monitoring component
export const PerformanceMonitor: React.FC<{
  children: ReactNode
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void
}> = ({ children, onMetricsUpdate }) => {
  const { metrics } = usePerformanceContext();

  useEffect(() => {
    if (onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }

    globalPerformanceAggregator.addMetrics(metrics);
  }, [metrics, onMetricsUpdate]);

  return <>{children}</>;
};

export default PerformanceProvider;