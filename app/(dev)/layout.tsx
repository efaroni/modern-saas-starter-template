import Link from 'next/link'

const sections = [
  { name: 'Configuration', href: '/dev/configuration', description: 'API Key Management' },
  { name: 'Authentication', href: '/dev/authentication', description: 'User Auth & CRUD' },
  { name: 'Payments', href: '/dev/payments', description: 'Stripe Integration' },
  { name: 'Email', href: '/dev/email', description: 'Email Templates' },
  { name: 'AI Styling', href: '/dev/ai-styling', description: 'Design Generation' },
  { name: 'AI Assistant', href: '/dev/ai-assistant', description: 'Contextual Help' },
  { name: 'Deployment', href: '/dev/deployment', description: 'CI/CD Setup' },
]

export default function DevLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dev" className="text-xl font-bold text-gray-900">
              SaaS Template Dev
            </Link>
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-2 flex-wrap mb-6">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">{section.name}</span>
              <span className="text-xs text-gray-500 ml-2">{section.description}</span>
            </Link>
          ))}
        </div>
        
        {children}
      </div>
    </div>
  )
}