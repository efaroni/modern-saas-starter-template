import Link from 'next/link';

const sections = [
  {
    number: 1,
    name: 'Configuration & API Management',
    href: '/configuration',
    status: 'active',
    description: 'Manage API keys with mock fallback support',
    features: [
      'API key CRUD',
      'Service validation',
      'Mock mode',
      'Database storage',
    ],
  },
  {
    number: 2,
    name: 'Authentication & User Management',
    href: '/auth',
    status: 'active',
    description: 'Auth.js v5 with user CRUD operations',
    features: [
      'Email/password auth',
      'OAuth providers',
      'User profiles',
      'Session management',
    ],
  },
  {
    number: 3,
    name: 'Payments & Billing',
    href: '/payments',
    status: 'coming-soon',
    description: 'Stripe integration with subscriptions',
    features: [
      'Checkout flow',
      'Subscription management',
      'Webhooks',
      'Invoice history',
    ],
  },
  {
    number: 4,
    name: 'Email System',
    href: '/email',
    status: 'coming-soon',
    description: 'Resend + React Email templates',
    features: ['Template gallery', 'Preview UI', 'Send testing', 'Email logs'],
  },
  {
    number: 5,
    name: 'AI Styling System',
    href: '/ai-styling',
    status: 'coming-soon',
    description: 'Screenshot to design generation',
    features: [
      'Image upload',
      'Style extraction',
      'Theme generation',
      'Code export',
    ],
  },
  {
    number: 6,
    name: 'AI Site Assistant',
    href: '/ai-assistant',
    status: 'coming-soon',
    description: 'Contextual help system',
    features: [
      'Chat interface',
      'Context awareness',
      'Help articles',
      'User feedback',
    ],
  },
  {
    number: 7,
    name: 'Code Generators',
    href: '/generators',
    status: 'active',
    description: 'Developer productivity tools',
    features: [
      'Component templates',
      'API endpoints',
      'Database models',
      'Test scaffolding',
    ],
  },
  {
    number: 8,
    name: 'Rate Limiting Dashboard',
    href: '/rate-limiting',
    status: 'active',
    description: 'Monitor and manage API rate limiting',
    features: [
      'Live statistics',
      'Algorithm monitoring',
      'Active limits',
      'Alert system',
    ],
  },
  {
    number: 9,
    name: 'Performance Monitor',
    href: '/performance',
    status: 'active',
    description: 'Monitor and optimize application performance',
    features: [
      'Core Web Vitals',
      'Runtime metrics',
      'Resource timings',
      'Performance insights',
    ],
  },
  {
    number: 10,
    name: 'Deployment & CI/CD',
    href: '/deployment',
    status: 'coming-soon',
    description: 'GitHub Actions and Vercel setup',
    features: [
      'Auto-deploy',
      'Environment config',
      'Health checks',
      'Monitoring',
    ],
  },
];

export default function HomePage() {
  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='mx-auto max-w-6xl px-4 py-12'>
        <div className='mb-12 text-center'>
          <h1 className='mb-4 text-4xl font-bold text-gray-900'>
            Modern SaaS Starter Template
          </h1>
          <p className='text-xl text-gray-600'>
            Test and explore each feature of the modern SaaS template
          </p>
        </div>

        <div className='grid gap-6 md:grid-cols-2'>
          {sections.map(section => (
            <Link
              key={section.number}
              href={section.status === 'active' ? section.href : '#'}
              className={`block rounded-lg border-2 bg-white p-6 transition-all ${
                section.status === 'active'
                  ? 'cursor-pointer border-blue-500 hover:border-blue-600 hover:shadow-lg'
                  : 'cursor-not-allowed border-gray-200 opacity-60'
              }`}
            >
              <div className='mb-4 flex items-start justify-between'>
                <div>
                  <span className='text-sm font-medium text-gray-500'>
                    Section {section.number}
                  </span>
                  <h2 className='mt-1 text-xl font-semibold text-gray-900'>
                    {section.name}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    section.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {section.status === 'active' ? 'Ready' : 'Coming Soon'}
                </span>
              </div>

              <p className='mb-4 text-gray-600'>{section.description}</p>

              <div className='space-y-1'>
                {section.features.map((feature) => (
                  <div
                    key={feature}
                    className='flex items-center text-sm text-gray-500'
                  >
                    <span className='mr-2'>•</span>
                    {feature}
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>

        <div className='mt-12 text-center text-gray-500'>
          <p className='text-sm'>
            Click on any &ldquo;Ready&rdquo; section to explore its features
          </p>
        </div>
      </div>
    </div>
  );
}
