import { config } from '@/lib/config';

export default function ConfigTestPage() {
  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='mb-4 text-2xl font-bold'>Configuration Test</h1>
      <div className='rounded border bg-white p-4'>
        <h2 className='mb-2 font-semibold'>Config Status</h2>
        <pre className='rounded bg-gray-100 p-2 text-sm'>
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>

      <div className='mt-4 rounded border bg-white p-4'>
        <h2 className='mb-2 font-semibold'>Database Connection Test</h2>
        <p>Database enabled: {config.database.enabled ? 'Yes' : 'No'}</p>
        <p>Database URL configured: {config.database.url ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}
