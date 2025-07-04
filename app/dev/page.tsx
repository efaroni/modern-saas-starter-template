import Link from 'next/link'

const sections = [
  {
    number: 1,
    name: 'Configuration & API Management',
    href: '/dev/configuration',
    status: 'active',
    description: 'Manage API keys with mock fallback support',
    features: ['API key CRUD', 'Service validation', 'Mock mode', 'Database storage'],
  },
  {
    number: 2,
    name: 'Authentication & User Management',
    href: '/dev/authentication',
    status: 'coming-soon',
    description: 'Auth.js v5 with user CRUD operations',
    features: ['Email/password auth', 'OAuth providers', 'User profiles', 'Session management'],
  },
  {
    number: 3,
    name: 'Payments & Billing',
    href: '/dev/payments',
    status: 'coming-soon',
    description: 'Stripe integration with subscriptions',
    features: ['Checkout flow', 'Subscription management', 'Webhooks', 'Invoice history'],
  },
  {
    number: 4,
    name: 'Email System',
    href: '/dev/email',
    status: 'coming-soon',
    description: 'Resend + React Email templates',
    features: ['Template gallery', 'Preview UI', 'Send testing', 'Email logs'],
  },
  {
    number: 5,
    name: 'AI Styling System',
    href: '/dev/ai-styling',
    status: 'coming-soon',
    description: 'Screenshot to design generation',
    features: ['Image upload', 'Style extraction', 'Theme generation', 'Code export'],
  },
  {
    number: 6,
    name: 'AI Site Assistant',
    href: '/dev/ai-assistant',
    status: 'coming-soon',
    description: 'Contextual help system',
    features: ['Chat interface', 'Context awareness', 'Help articles', 'User feedback'],
  },
  {
    number: 7,
    name: 'Deployment & CI/CD',
    href: '/dev/deployment',
    status: 'coming-soon',
    description: 'GitHub Actions and Vercel setup',
    features: ['Auto-deploy', 'Environment config', 'Health checks', 'Monitoring'],
  },
]

export default function DevPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">SaaS Template Development Sections</h1>
        <p className="text-xl text-gray-600">
          Test and explore each feature of the modern SaaS template
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.number}
            href={section.status === 'active' ? section.href : '#'}
            className={`block p-6 bg-white rounded-lg border-2 transition-all ${
              section.status === 'active'
                ? 'border-blue-500 hover:shadow-lg cursor-pointer'
                : 'border-gray-200 opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Section {section.number}</span>
                <h2 className="text-xl font-semibold mt-1">{section.name}</h2>
              </div>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  section.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {section.status === 'active' ? 'Ready' : 'Coming Soon'}
              </span>
            </div>
            
            <p className="text-gray-600 mb-4">{section.description}</p>
            
            <div className="space-y-1">
              {section.features.map((feature, i) => (
                <div key={i} className="flex items-center text-sm text-gray-500">
                  <span className="mr-2">•</span>
                  {feature}
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}