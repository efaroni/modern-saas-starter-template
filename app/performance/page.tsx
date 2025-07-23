'use client';

import { useState, useEffect } from 'react';

import {
  RefreshCw,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Monitor,
  Zap,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PerformanceMetrics {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
  renderTime: number;
  componentMountTime: number;
  apiResponseTime: number;
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  userInteractions: number;
  scrollDepth: number;
  timeOnPage: number;
  errorRate: number;
  errorCount: number;
  customMetrics: Record<string, number>;
}

interface PerformanceScore {
  score: 'good' | 'needs-improvement' | 'poor';
  value: number;
  threshold: { good: number; poor: number };
}

interface PerformanceData {
  currentMetrics: PerformanceMetrics;
  historicalData: Array<{
    timestamp: number;
    metrics: Partial<PerformanceMetrics>;
  }>;
  scores: Record<string, PerformanceScore>;
  insights: string[];
  recommendations: string[];
  resourceTimings: Array<{
    name: string;
    duration: number;
    size: number;
    type: string;
    cached: boolean;
  }>;
  budgetStatus: {
    passed: boolean;
    violations: string[];
    warnings: string[];
  };
}

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    '1h' | '24h' | '7d'
  >('24h');
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Mock data for demonstration
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate mock performance data
      const mockData: PerformanceData = {
        currentMetrics: {
          lcp: 2180,
          fid: 95,
          cls: 0.08,
          fcp: 1650,
          ttfb: 320,
          renderTime: 23,
          componentMountTime: 145,
          apiResponseTime: 280,
          memoryUsage: {
            usedJSHeapSize: (45 * 1024 * 1024),
            totalJSHeapSize: (67 * 1024 * 1024),
            jsHeapSizeLimit: (2048 * 1024 * 1024),
          },
          userInteractions: 47,
          scrollDepth: 85,
          timeOnPage: 142000,
          errorRate: 0.02,
          errorCount: 1,
          customMetrics: {
            login_form_render: 45,
            dashboard_load: 234,
            api_users_fetch: 180,
          },
        },
        historicalData: Array.from({ length: 24 }, (_, i) => ({
          timestamp: Date.now() - ((23 - i) * 60 * 60 * 1000),
          metrics: {
            lcp: 2000 + (Math.random() * 400),
            fid: 80 + (Math.random() * 40),
            cls: 0.05 + (Math.random() * 0.1),
            fcp: 1500 + (Math.random() * 300),
            ttfb: 300 + (Math.random() * 200),
          },
        })),
        scores: {
          lcp: {
            score: 'good',
            value: 2180,
            threshold: { good: 2500, poor: 4000 },
          },
          fid: {
            score: 'good',
            value: 95,
            threshold: { good: 100, poor: 300 },
          },
          cls: {
            score: 'good',
            value: 0.08,
            threshold: { good: 0.1, poor: 0.25 },
          },
          fcp: {
            score: 'good',
            value: 1650,
            threshold: { good: 1800, poor: 3000 },
          },
          ttfb: {
            score: 'good',
            value: 320,
            threshold: { good: 800, poor: 1800 },
          },
        },
        insights: [
          'Core Web Vitals are performing well across all metrics',
          'Memory usage is within acceptable limits',
          'API response times are optimal',
          'User engagement is high with good scroll depth',
        ],
        recommendations: [
          'Consider lazy loading images to further improve LCP',
          'Implement service worker for better caching',
          'Optimize component render cycles for better performance',
        ],
        resourceTimings: [
          {
            name: '/api/users',
            duration: 180,
            size: 15420,
            type: 'api',
            cached: false,
          },
          {
            name: '/images/logo.png',
            duration: 45,
            size: 8934,
            type: 'image',
            cached: true,
          },
          {
            name: '/styles/main.css',
            duration: 23,
            size: 45678,
            type: 'stylesheet',
            cached: true,
          },
          {
            name: '/scripts/app.js',
            duration: 67,
            size: 234567,
            type: 'javascript',
            cached: false,
          },
        ],
        budgetStatus: {
          passed: true,
          violations: [],
          warnings: ['JavaScript bundle size is approaching limit'],
        },
      };

      setData(mockData);
      setIsLoading(false);
    };

    loadData();
  }, [selectedTimeRange]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleStartMonitoring = () => {
    setIsMonitoring(true);
    // In a real implementation, this would start the performance monitoring
  };

  const handleStopMonitoring = () => {
    setIsMonitoring(false);
  };

  const getScoreColor = (score: 'good' | 'needs-improvement' | 'poor') => {
    switch (score) {
      case 'good':
        return 'text-green-600 bg-green-100';
      case 'needs-improvement':
        return 'text-yellow-600 bg-yellow-100';
      case 'poor':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreIcon = (score: 'good' | 'needs-improvement' | 'poor') => {
    switch (score) {
      case 'good':
        return <CheckCircle className='h-4 w-4' />;
      case 'needs-improvement':
        return <AlertTriangle className='h-4 w-4' />;
      case 'poor':
        return <AlertTriangle className='h-4 w-4' />;
      default:
        return <Activity className='h-4 w-4' />;
    }
  };

  const formatMetric = (value: number, unit: string) => {
    if (unit === 'ms') return `${Math.round(value)}ms`;
    if (unit === 'MB') return `${Math.round(value / (1024 * 1024))}MB`;
    if (unit === 'score') return value.toFixed(3);
    if (unit === '%') return `${Math.round(value)}%`;
    return value.toString();
  };

  if (isLoading) {
    return (
      <div className='flex min-h-96 items-center justify-center'>
        <div className='flex items-center space-x-2'>
          <RefreshCw className='h-4 w-4 animate-spin' />
          <span>Loading performance data...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div>No performance data available</div>;
  }

  return (
    <div className='mx-auto max-w-7xl space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Performance Dashboard</h1>
          <p className='text-gray-600'>
            Monitor and optimize your application&apos;s performance metrics
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant={isMonitoring ? 'destructive' : 'default'}
            onClick={
              isMonitoring ? handleStopMonitoring : handleStartMonitoring
            }
          >
            {isMonitoring ? (
              <>
                <Activity className='mr-2 h-4 w-4' />
                Stop Monitoring
              </>
            ) : (
              <>
                <Monitor className='mr-2 h-4 w-4' />
                Start Monitoring
              </>
            )}
          </Button>
          <Button
            variant='outline'
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <select
            value={selectedTimeRange}
            onChange={e =>
              setSelectedTimeRange(e.target.value as '1h' | '24h' | '7d')
            }
            className='rounded-md border px-3 py-2'
          >
            <option value='1h'>Last Hour</option>
            <option value='24h'>Last 24 Hours</option>
            <option value='7d'>Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Performance Budget Status */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Zap className='h-5 w-5' />
            Performance Budget Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='mb-4 flex items-center gap-4'>
            <Badge
              variant={data.budgetStatus.passed ? 'secondary' : 'destructive'}
            >
              {data.budgetStatus.passed ? 'PASSED' : 'FAILED'}
            </Badge>
            <span className='text-sm text-gray-600'>
              {data.budgetStatus.violations.length} violations,{' '}
              {data.budgetStatus.warnings.length} warnings
            </span>
          </div>

          {data.budgetStatus.violations.length > 0 && (
            <Alert className='mb-4'>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                <strong>Budget Violations:</strong>
                <ul className='mt-1 space-y-1'>
                  {data.budgetStatus.violations.map((violation) => (
                    <li key={violation} className='text-sm'>
                      • {violation}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {data.budgetStatus.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                <strong>Warnings:</strong>
                <ul className='mt-1 space-y-1'>
                  {data.budgetStatus.warnings.map((warning) => (
                    <li key={warning} className='text-sm'>
                      • {warning}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue='overview' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='core-vitals'>Core Web Vitals</TabsTrigger>
          <TabsTrigger value='runtime'>Runtime Metrics</TabsTrigger>
          <TabsTrigger value='resources'>Resources</TabsTrigger>
          <TabsTrigger value='insights'>Insights</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-4'>
          {/* Core Web Vitals Summary */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            {Object.entries(data.scores).map(([key, scoreData]) => (
              <Card key={key}>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium uppercase'>
                    {key}
                  </CardTitle>
                  <Badge className={getScoreColor(scoreData.score)}>
                    {getScoreIcon(scoreData.score)}
                    <span className='ml-1'>{scoreData.score}</span>
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {formatMetric(
                      scoreData.value,
                      key === 'cls' ? 'score' : 'ms',
                    )}
                  </div>
                  <div className='text-muted-foreground mt-1 text-xs'>
                    Good: &lt;
                    {formatMetric(
                      scoreData.threshold.good,
                      key === 'cls' ? 'score' : 'ms',
                    )}
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      (scoreData.value / scoreData.threshold.poor) * 100,
                    )}
                    className='mt-2'
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Runtime Metrics */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Memory Usage
                </CardTitle>
                <Activity className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {formatMetric(
                    data.currentMetrics.memoryUsage.usedJSHeapSize,
                    'MB',
                  )}
                </div>
                <p className='text-muted-foreground text-xs'>
                  of{' '}
                  {formatMetric(
                    data.currentMetrics.memoryUsage.totalJSHeapSize,
                    'MB',
                  )}{' '}
                  allocated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  API Response
                </CardTitle>
                <Clock className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {formatMetric(data.currentMetrics.apiResponseTime, 'ms')}
                </div>
                <p className='text-muted-foreground text-xs'>
                  Average response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  User Interactions
                </CardTitle>
                <TrendingUp className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {data.currentMetrics.userInteractions}
                </div>
                <p className='text-muted-foreground text-xs'>
                  {formatMetric(data.currentMetrics.scrollDepth, '%')} scroll
                  depth
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Time on Page
                </CardTitle>
                <Clock className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {Math.round(data.currentMetrics.timeOnPage / 1000)}s
                </div>
                <p className='text-muted-foreground text-xs'>
                  {data.currentMetrics.errorCount} errors (
                  {formatMetric(data.currentMetrics.errorRate * 100, '%')})
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='core-vitals' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals Details</CardTitle>
              <CardDescription>
                Detailed analysis of your Core Web Vitals performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-6'>
                {Object.entries(data.scores).map(([key, scoreData]) => (
                  <div key={key} className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <h4 className='font-semibold uppercase'>{key}</h4>
                      <Badge className={getScoreColor(scoreData.score)}>
                        {scoreData.score}
                      </Badge>
                    </div>
                    <div className='flex items-center gap-4 text-sm text-gray-600'>
                      <span>
                        Current:{' '}
                        {formatMetric(
                          scoreData.value,
                          key === 'cls' ? 'score' : 'ms',
                        )}
                      </span>
                      <span>
                        Good: &lt;
                        {formatMetric(
                          scoreData.threshold.good,
                          key === 'cls' ? 'score' : 'ms',
                        )}
                      </span>
                      <span>
                        Poor: &gt;
                        {formatMetric(
                          scoreData.threshold.poor,
                          key === 'cls' ? 'score' : 'ms',
                        )}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(
                        100,
                        (scoreData.value / scoreData.threshold.poor) * 100,
                      )}
                      className='h-2'
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='runtime' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Runtime Performance Metrics</CardTitle>
              <CardDescription>
                Real-time performance data from your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <div className='space-y-4'>
                  <h4 className='font-semibold'>Component Performance</h4>
                  <div className='space-y-2'>
                    <div className='flex justify-between'>
                      <span>Render Time</span>
                      <span>
                        {formatMetric(data.currentMetrics.renderTime, 'ms')}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span>Mount Time</span>
                      <span>
                        {formatMetric(
                          data.currentMetrics.componentMountTime,
                          'ms',
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='space-y-4'>
                  <h4 className='font-semibold'>Custom Metrics</h4>
                  <div className='space-y-2'>
                    {Object.entries(data.currentMetrics.customMetrics).map(
                      ([name, value]) => (
                        <div key={name} className='flex justify-between'>
                          <span className='text-sm'>{name}</span>
                          <span className='text-sm'>
                            {formatMetric(value, 'ms')}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='resources' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Resource Timings</CardTitle>
              <CardDescription>
                Performance data for loaded resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {data.resourceTimings.map((resource) => (
                  <div key={resource.name} className='rounded-lg border p-4'>
                    <div className='mb-2 flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Badge variant='outline'>{resource.type}</Badge>
                        <span className='font-medium'>{resource.name}</span>
                        {resource.cached && (
                          <Badge variant='secondary'>Cached</Badge>
                        )}
                      </div>
                      <span className='text-sm text-gray-600'>
                        {formatMetric(resource.duration, 'ms')}
                      </span>
                    </div>
                    <div className='text-sm text-gray-600'>
                      Size: {formatMetric(resource.size, 'MB')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='insights' className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
                <CardDescription>
                  Key observations about your application&apos;s performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  {data.insights.map((insight, index) => (
                    <div key={index} className='flex items-start gap-2'>
                      <CheckCircle className='mt-0.5 h-4 w-4 flex-shrink-0 text-green-500' />
                      <span className='text-sm'>{insight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>
                  Suggestions to improve your application&apos;s performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  {data.recommendations.map((recommendation, index) => (
                    <div key={index} className='flex items-start gap-2'>
                      <TrendingUp className='mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500' />
                      <span className='text-sm'>{recommendation}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
