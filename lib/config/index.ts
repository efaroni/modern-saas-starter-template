// Configuration service that works with or without database
export const config = {
  database: {
    enabled: !!process.env.DATABASE_URL,
    url: process.env.DATABASE_URL,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'dev-key-32-chars-change-in-prod!!',
  },
  services: {
    stripe: {
      enabled: !!process.env.STRIPE_SECRET_KEY,
      publicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock',
    },
    openai: {
      enabled: !!process.env.OPENAI_API_KEY,
    },
    resend: {
      enabled: !!process.env.RESEND_API_KEY,
    },
  },
}