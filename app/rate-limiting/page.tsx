'use client';

import { useState, useEffect } from 'react';

import {
  RefreshCw,
  Shield,
  TrendingUp,
  AlertTriangle,
  Activity,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RateLimitStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  uniqueIPs: number;
  topFailureReasons: Array<{ reason: string; count: number }>;
}

interface RateLimitConfig {
  type: string;
  algorithm: string;
  maxAttempts: number;
  windowMinutes: number;
  lockoutMinutes: number;
  burstLimit?: number;
  refillRate?: number;
  adaptiveScaling?: boolean;
}

interface CurrentLimits {
  identifier: string;
  type: string;
  remaining: number;
  resetTime: string;
  locked: boolean;
  algorithm: string;
}

export default function RateLimitingPage() {
  const [stats, setStats] = useState<Record<string, RateLimitStats>>({});
  const [configs, setConfigs] = useState<RateLimitConfig[]>([]);
  const [currentLimits, setCurrentLimits] = useState<CurrentLimits[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    '1h' | '24h' | '7d'
  >('24h');

  // Mock data for demonstration
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock statistics
      setStats({
        login: {
          totalAttempts: 1247,
          successfulAttempts: 1156,
          failedAttempts: 91,
          uniqueIPs: 487,
          topFailureReasons: [
            { reason: 'Invalid credentials', count: 67 },
            { reason: 'Rate limit exceeded', count: 24 },
          ],
        },
        signup: {
          totalAttempts: 342,
          successfulAttempts: 298,
          failedAttempts: 44,
          uniqueIPs: 298,
          topFailureReasons: [
            { reason: 'Email already exists', count: 28 },
            { reason: 'Weak password', count: 16 },
          ],
        },
        api: {
          totalAttempts: 15847,
          successfulAttempts: 15234,
          failedAttempts: 613,
          uniqueIPs: 87,
          topFailureReasons: [
            { reason: 'Rate limit exceeded', count: 489 },
            { reason: 'Invalid API key', count: 124 },
          ],
        },
      });

      // Mock configurations
      setConfigs([
        {
          type: 'login',
          algorithm: 'sliding-window',
          maxAttempts: 5,
          windowMinutes: 15,
          lockoutMinutes: 15,
          adaptiveScaling: true,
        },
        {
          type: 'signup',
          algorithm: 'fixed-window',
          maxAttempts: 3,
          windowMinutes: 60,
          lockoutMinutes: 60,
          adaptiveScaling: false,
        },
        {
          type: 'api',
          algorithm: 'token-bucket',
          maxAttempts: 100,
          windowMinutes: 60,
          lockoutMinutes: 5,
          burstLimit: 20,
          refillRate: 100,
          adaptiveScaling: true,
        },
      ]);

      // Mock current limits
      setCurrentLimits([
        {
          identifier: 'user@example.com',
          type: 'login',
          remaining: 3,
          resetTime: new Date(Date.now() + (10 * 60 * 1000)).toISOString(),
          locked: false,
          algorithm: 'sliding-window',
        },
        {
          identifier: '192.168.1.100',
          type: 'api',
          remaining: 87,
          resetTime: new Date(Date.now() + (45 * 60 * 1000)).toISOString(),
          locked: false,
          algorithm: 'token-bucket',
        },
        {
          identifier: 'attacker@spam.com',
          type: 'login',
          remaining: 0,
          resetTime: new Date(Date.now() + (8 * 60 * 1000)).toISOString(),
          locked: true,
          algorithm: 'sliding-window',
        },
      ]);

      setIsLoading(false);
    };

    loadData();
  }, [selectedTimeRange]);

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate refresh
    setTimeout(() => setIsLoading(false), 500);
  };

  const getSuccessRate = (stats: RateLimitStats) => {
    if (stats.totalAttempts === 0) return 0;
    return Math.round((stats.successfulAttempts / stats.totalAttempts) * 100);
  };

  const getAlgorithmBadgeColor = (algorithm: string) => {
    switch (algorithm) {
      case 'token-bucket':
        return 'bg-blue-100 text-blue-800';
      case 'sliding-window':
        return 'bg-green-100 text-green-800';
      case 'fixed-window':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (locked: boolean, remaining: number) => {
    if (locked) return <Badge variant='destructive'>Locked</Badge>;
    if (remaining <= 1) return <Badge variant='destructive'>Critical</Badge>;
    if (remaining <= 3) return <Badge variant='default'>Warning</Badge>;
    return <Badge variant='secondary'>Normal</Badge>;
  };

  if (isLoading) {
    return (
      <div className='flex min-h-96 items-center justify-center'>
        <div className='flex items-center space-x-2'>
          <RefreshCw className='h-4 w-4 animate-spin' />
          <span>Loading rate limiting data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-7xl space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Rate Limiting Dashboard</h1>
          <p className='text-gray-600'>
            Monitor and manage API rate limiting across your application
          </p>
        </div>
        <div className='flex gap-2'>
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

      <Tabs defaultValue='overview' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='configs'>Configurations</TabsTrigger>
          <TabsTrigger value='active'>Active Limits</TabsTrigger>
          <TabsTrigger value='alerts'>Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {Object.entries(stats).map(([type, data]) => (
              <Card key={type}>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium capitalize'>
                    {type} Requests
                  </CardTitle>
                  <Activity className='text-muted-foreground h-4 w-4' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {data.totalAttempts.toLocaleString()}
                  </div>
                  <div className='text-muted-foreground flex items-center space-x-2 text-xs'>
                    <span>{getSuccessRate(data)}% success rate</span>
                    <Badge variant='outline'>{data.uniqueIPs} unique IPs</Badge>
                  </div>
                  <div className='mt-2 space-y-1'>
                    <div className='flex justify-between text-sm'>
                      <span className='text-green-600'>Successful</span>
                      <span>{data.successfulAttempts}</span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span className='text-red-600'>Failed</span>
                      <span>{data.failedAttempts}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Failure Analysis</CardTitle>
              <CardDescription>
                Most common failure reasons across all endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {Object.entries(stats).map(([type, data]) => (
                  <div key={type} className='rounded-lg border p-4'>
                    <h4 className='mb-2 font-semibold capitalize'>{type}</h4>
                    <div className='space-y-2'>
                      {data.topFailureReasons.map(reason => (
                        <div
                          key={reason.reason}
                          className='flex items-center justify-between text-sm'
                        >
                          <span>{reason.reason}</span>
                          <Badge variant='outline'>
                            {reason.count} occurrences
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='configs' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting Configurations</CardTitle>
              <CardDescription>
                Current rate limiting settings for each endpoint type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {configs.map(config => (
                  <div key={config.type} className='rounded-lg border p-4'>
                    <div className='mb-3 flex items-center justify-between'>
                      <div className='flex items-center space-x-2'>
                        <Shield className='h-5 w-5' />
                        <h3 className='font-semibold capitalize'>
                          {config.type}
                        </h3>
                      </div>
                      <Badge
                        className={getAlgorithmBadgeColor(config.algorithm)}
                      >
                        {config.algorithm}
                      </Badge>
                    </div>

                    <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-4'>
                      <div>
                        <span className='font-medium'>Max Attempts</span>
                        <p className='text-gray-600'>{config.maxAttempts}</p>
                      </div>
                      <div>
                        <span className='font-medium'>Window</span>
                        <p className='text-gray-600'>
                          {config.windowMinutes} min
                        </p>
                      </div>
                      <div>
                        <span className='font-medium'>Lockout</span>
                        <p className='text-gray-600'>
                          {config.lockoutMinutes} min
                        </p>
                      </div>
                      <div>
                        <span className='font-medium'>Adaptive</span>
                        <p className='text-gray-600'>
                          {config.adaptiveScaling ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>

                    {config.algorithm === 'token-bucket' && (
                      <div className='mt-3 border-t pt-3'>
                        <div className='grid grid-cols-2 gap-4 text-sm'>
                          <div>
                            <span className='font-medium'>Burst Limit</span>
                            <p className='text-gray-600'>{config.burstLimit}</p>
                          </div>
                          <div>
                            <span className='font-medium'>Refill Rate</span>
                            <p className='text-gray-600'>
                              {config.refillRate}/min
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='active' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Active Rate Limits</CardTitle>
              <CardDescription>
                Current rate limit status for active users and IPs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {currentLimits.map(limit => (
                  <div
                    key={`${limit.identifier}-${limit.type}`}
                    className='rounded-lg border p-4'
                  >
                    <div className='mb-2 flex items-center justify-between'>
                      <div className='flex items-center space-x-2'>
                        <code className='rounded bg-gray-100 px-2 py-1 text-sm'>
                          {limit.identifier}
                        </code>
                        <Badge variant='outline'>{limit.type}</Badge>
                      </div>
                      {getStatusBadge(limit.locked, limit.remaining)}
                    </div>

                    <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-4'>
                      <div>
                        <span className='font-medium'>Remaining</span>
                        <p className='text-gray-600'>{limit.remaining}</p>
                      </div>
                      <div>
                        <span className='font-medium'>Reset Time</span>
                        <p className='text-gray-600'>
                          {new Date(limit.resetTime).toLocaleTimeString()}
                        </p>
                      </div>
                      <div>
                        <span className='font-medium'>Algorithm</span>
                        <p className='text-gray-600'>{limit.algorithm}</p>
                      </div>
                      <div>
                        <span className='font-medium'>Status</span>
                        <p
                          className={`${limit.locked ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {limit.locked ? 'Locked' : 'Active'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='alerts' className='space-y-4'>
          <div className='space-y-4'>
            <Alert>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                <strong>High failure rate detected:</strong> Login endpoint has
                a 7.3% failure rate in the last hour. Consider reviewing
                authentication logs.
              </AlertDescription>
            </Alert>

            <Alert>
              <TrendingUp className='h-4 w-4' />
              <AlertDescription>
                <strong>Traffic spike:</strong> API endpoint requests increased
                by 45% compared to yesterday. Monitor for potential abuse.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Alert Configuration</CardTitle>
                <CardDescription>
                  Set up alerts for rate limiting events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between rounded border p-3'>
                    <div>
                      <h4 className='font-medium'>High Failure Rate</h4>
                      <p className='text-sm text-gray-600'>
                        Alert when failure rate exceeds 10%
                      </p>
                    </div>
                    <Badge variant='secondary'>Active</Badge>
                  </div>
                  <div className='flex items-center justify-between rounded border p-3'>
                    <div>
                      <h4 className='font-medium'>Traffic Spike</h4>
                      <p className='text-sm text-gray-600'>
                        Alert when traffic increases by 50%
                      </p>
                    </div>
                    <Badge variant='secondary'>Active</Badge>
                  </div>
                  <div className='flex items-center justify-between rounded border p-3'>
                    <div>
                      <h4 className='font-medium'>Mass Lockouts</h4>
                      <p className='text-sm text-gray-600'>
                        Alert when 5+ users are locked out
                      </p>
                    </div>
                    <Badge variant='outline'>Inactive</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
