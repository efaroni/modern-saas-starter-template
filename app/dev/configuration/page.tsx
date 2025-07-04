import { OpenAIConfig } from '@/components/services/openai-config'
import { StripeConfig } from '@/components/services/stripe-config'
import { ResendConfig } from '@/components/services/resend-config'
import { OAuthConfig } from '@/components/services/oauth-config'
import { config } from '@/lib/config'

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
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-2">User Integration Keys</h2>
          <p className="text-gray-600 mb-6">
            API keys for services that your users might want to integrate with your SaaS
          </p>
          
          <div className="grid gap-6 lg:grid-cols-2">
            <OpenAIConfig />
            <ResendConfig />
            <OAuthConfig />
          </div>
        </div>

        {/* Owner Keys Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-2">Owner Infrastructure Keys</h2>
          <p className="text-gray-600 mb-6">
            API keys for your SaaS infrastructure and payment processing
          </p>
          
          <div className="max-w-2xl">
            <StripeConfig />
          </div>
        </div>
      </div>
    </div>
  )
}