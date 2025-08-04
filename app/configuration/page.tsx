import { redirect } from 'next/navigation';

import { auth } from '@clerk/nextjs/server';

import { ServiceApiKeyInput } from '@/components/services/service-api-key-input';
import { config } from '@/lib/config';

export default async function ConfigurationPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mx-auto max-w-6xl'>
        <h1 className='mb-2 text-3xl font-bold'>API Configuration</h1>
        <p className='mb-8 text-gray-600'>
          Configure your service integrations and API keys.
          {!config.database.enabled && (
            <span className='ml-2 text-amber-600'>
              (Running in mock mode - database not connected)
            </span>
          )}
        </p>

        {/* User Keys Section */}
        <div>
          <h2 className='mb-2 text-2xl font-semibold'>API Keys</h2>
          <p className='mb-6 text-gray-600'>
            Configure your service integrations and API keys
          </p>

          <div className='grid gap-6 lg:grid-cols-2'>
            <ServiceApiKeyInput
              service='openai'
              title='OpenAI'
              description='For AI features like chat and completions'
            />
            <ServiceApiKeyInput
              service='resend'
              title='Resend'
              description='For sending transactional emails'
            />
          </div>
        </div>
      </div>
    </div>
  );
}
