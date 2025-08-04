-- Create webhook_events table for idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY, -- Provider event ID (svix-id for Clerk)
  provider TEXT DEFAULT 'clerk' NOT NULL,
  event_type TEXT NOT NULL, -- user.created, user.deleted, etc.
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for webhook_events (only if table doesn't already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'webhook_events' 
        AND indexname = 'idx_webhook_events_provider'
    ) THEN
        CREATE INDEX idx_webhook_events_provider ON webhook_events(provider);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'webhook_events' 
        AND indexname = 'idx_webhook_events_event_type'
    ) THEN
        CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'webhook_events' 
        AND indexname = 'idx_webhook_events_processed_at'
    ) THEN
        CREATE INDEX idx_webhook_events_processed_at ON webhook_events(processed_at);
    END IF;
END $$;