import { ServiceApiKeyInput } from '@/components/services/service-api-key-input';
import { config } from '@/lib/config';

export default function ConfigurationPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">API Configuration</h1>
        <p className="text-gray-600 mb-8">
          Configure your service integrations and API keys.
          {!config.database.enabled && (
            <span className="text-amber-600 ml-2">
              (Running in mock mode - database not connected)
            </span>
          )}
        </p>

        {/* User Keys Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-2">API Keys</h2>
          <p className="text-gray-600 mb-6">
            Configure your service integrations and API keys
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            <ServiceApiKeyInput
              service="openai"
              title="OpenAI"
              description="For AI features like chat and completions"
            />
            <ServiceApiKeyInput
              service="resend"
              title="Resend"
              description="For sending transactional emails"
            />
          </div>
        </div>
      </div>
    </div>
  );
}