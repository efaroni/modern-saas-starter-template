'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmailLog {
  id: string;
  toEmail: string;
  templateType: string;
  status: string;
  sentAt: string;
  resendId?: string;
}

export default function EmailsPage() {
  const [testEmail, setTestEmail] = useState('');
  const [templateType, setTemplateType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [paymentEventType, setPaymentEventType] = useState('');
  const [paymentEventEmail, setPaymentEventEmail] = useState('');

  const handleSendTestEmail = async () => {
    if (!testEmail || !templateType) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          templateType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Email sent successfully!');
        fetchEmailLogs();
      } else {
        toast.error(result.error || 'Failed to send email');
      }
    } catch (error) {
      toast.error('Failed to send email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPaymentEvent = async () => {
    if (!paymentEventEmail || !paymentEventType) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/emails/mock-payment-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: paymentEventType,
          userId: 'mock-user-id',
          userEmail: paymentEventEmail,
          userName: 'Test User',
          subscriptionId: 'mock-subscription-id',
          planName: 'Pro Plan',
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Payment event processed successfully!');
        fetchEmailLogs();
      } else {
        toast.error(result.error || 'Failed to process payment event');
      }
    } catch (error) {
      toast.error('Failed to process payment event');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const response = await fetch('/api/emails/logs');
      const result = await response.json();

      if (result.success) {
        setEmailLogs(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
    }
  };

  // Fetch logs on component mount
  useState(() => {
    fetchEmailLogs();
  });

  return (
    <div className='container mx-auto py-10'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold'>Email System</h1>
        <p className='mt-2 text-gray-600'>
          Test email templates and view email logs
        </p>
      </div>

      <div className='grid gap-6'>
        {/* Test Email Section */}
        <Card>
          <CardHeader>
            <CardTitle>Send Test Email</CardTitle>
            <CardDescription>
              Send test emails to verify templates are working correctly
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='email'>Email Address</Label>
                <Input
                  id='email'
                  type='email'
                  placeholder='test@example.com'
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor='template'>Template Type</Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select template' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='welcome'>Welcome</SelectItem>
                    <SelectItem value='verification'>
                      Email Verification
                    </SelectItem>
                    <SelectItem value='password_reset'>
                      Password Reset
                    </SelectItem>
                    <SelectItem value='subscription_confirmation'>
                      Subscription Confirmation
                    </SelectItem>
                    <SelectItem value='subscription_ending'>
                      Subscription Ending
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleSendTestEmail}
              disabled={isLoading}
              className='w-full sm:w-auto'
            >
              {isLoading ? 'Sending...' : 'Send Test Email'}
            </Button>
          </CardContent>
        </Card>

        {/* Mock Payment Events */}
        <Card>
          <CardHeader>
            <CardTitle>Mock Payment Events</CardTitle>
            <CardDescription>
              Test payment-triggered emails (until Section 3 is integrated)
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='paymentEmail'>Email Address</Label>
                <Input
                  id='paymentEmail'
                  type='email'
                  placeholder='test@example.com'
                  value={paymentEventEmail}
                  onChange={e => setPaymentEventEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor='eventType'>Event Type</Label>
                <Select
                  value={paymentEventType}
                  onValueChange={setPaymentEventType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select event type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='checkout.completed'>
                      Checkout Completed
                    </SelectItem>
                    <SelectItem value='subscription.deleted'>
                      Subscription Cancelled
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleSendPaymentEvent}
              disabled={isLoading}
              variant='outline'
              className='w-full sm:w-auto'
            >
              {isLoading ? 'Processing...' : 'Trigger Payment Event'}
            </Button>
          </CardContent>
        </Card>

        {/* Email Templates List */}
        <Card>
          <CardHeader>
            <CardTitle>Available Templates</CardTitle>
            <CardDescription>
              List of email templates available in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid gap-3'>
              {[
                {
                  type: 'welcome',
                  name: 'Welcome Email',
                  description: 'Sent when a user completes registration',
                },
                {
                  type: 'verification',
                  name: 'Email Verification',
                  description: 'Sent to verify email addresses',
                },
                {
                  type: 'password_reset',
                  name: 'Password Reset',
                  description: 'Sent when user requests password reset',
                },
                {
                  type: 'subscription_confirmation',
                  name: 'Subscription Confirmation',
                  description: 'Sent when subscription is confirmed',
                },
                {
                  type: 'subscription_ending',
                  name: 'Subscription Ending',
                  description: 'Sent when subscription is cancelled or fails',
                },
              ].map(template => (
                <div
                  key={template.type}
                  className='flex items-center justify-between rounded border p-3'
                >
                  <div>
                    <h4 className='font-medium'>{template.name}</h4>
                    <p className='text-sm text-gray-600'>
                      {template.description}
                    </p>
                  </div>
                  <div className='text-sm text-gray-500'>{template.type}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Email Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Email Logs</CardTitle>
            <CardDescription>
              History of sent emails from the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailLogs.length === 0 ? (
              <div className='py-8 text-center text-gray-500'>
                No email logs found
              </div>
            ) : (
              <div className='space-y-3'>
                {emailLogs.slice(0, 10).map(log => (
                  <div
                    key={log.id}
                    className='flex items-center justify-between rounded border p-3'
                  >
                    <div>
                      <div className='font-medium'>{log.toEmail}</div>
                      <div className='text-sm text-gray-600'>
                        {log.templateType} - {log.status}
                      </div>
                    </div>
                    <div className='text-sm text-gray-500'>
                      {new Date(log.sentAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant='outline' onClick={fetchEmailLogs} className='mt-4'>
              Refresh Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
