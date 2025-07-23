// Client-safe database exports - no Node.js dependencies
// This module can be safely imported by client components

// Export only types and schemas
export * from './schema';

// Re-export commonly used Drizzle types
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
