import { config } from '@/lib/config'

export default function ConfigTestPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Configuration Test</h1>
      <div className="bg-white p-4 rounded border">
        <h2 className="font-semibold mb-2">Config Status</h2>
        <pre className="text-sm bg-gray-100 p-2 rounded">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
      
      <div className="mt-4 bg-white p-4 rounded border">
        <h2 className="font-semibold mb-2">Database Connection Test</h2>
        <p>Database enabled: {config.database.enabled ? 'Yes' : 'No'}</p>
        <p>Database URL configured: {config.database.url ? 'Yes' : 'No'}</p>
      </div>
    </div>
  )
}