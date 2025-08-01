import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';
import { Webhook } from 'svix';

import { db } from '@/lib/db';
import { users, webhookEvents } from '@/lib/db/schema';

// Add logging utility
const logWebhookEvent = (message: string, data?: unknown) => {
  console.warn(
    `[Clerk Webhook] ${message}`,
    data ? JSON.stringify(data, null, 2) : '',
  );
};

export async function POST(req: Request) {
  logWebhookEvent('Received webhook request');

  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    logWebhookEvent('ERROR: Missing CLERK_WEBHOOK_SECRET');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 },
    );
  }

  // Get the headers
  const svix_id = req.headers.get('svix-id');
  const svix_timestamp = req.headers.get('svix-timestamp');
  const svix_signature = req.headers.get('svix-signature');

  logWebhookEvent('Webhook headers received', {
    svix_id: !!svix_id,
    svix_timestamp: !!svix_timestamp,
    svix_signature: !!svix_signature,
  });

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    logWebhookEvent('ERROR: Missing required svix headers');
    return NextResponse.json(
      { error: 'Missing required webhook headers' },
      { status: 400 },
    );
  }

  // Get the body
  let payload: unknown;
  try {
    payload = await req.json();
    logWebhookEvent('Payload parsed successfully', {
      eventType: (payload as { type?: string })?.type,
    });
  } catch (err) {
    logWebhookEvent('ERROR: Failed to parse request body', err);
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 },
    );
  }

  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: { type: string; data: unknown };

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as { type: string; data: unknown };
    logWebhookEvent('Webhook verification successful', { eventType: evt.type });
  } catch (err) {
    logWebhookEvent('ERROR: Webhook verification failed', err);
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 400 },
    );
  }

  // Handle the webhook
  const eventType = evt.type;
  const webhookId = svix_id; // Use svix-id as unique identifier

  logWebhookEvent('Processing event', {
    eventType,
    userId: (evt.data as { id?: string })?.id,
    webhookId,
  });

  // Check if we've already processed this webhook
  const existingWebhook = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.id, webhookId),
  });

  if (existingWebhook) {
    logWebhookEvent('Webhook already processed, skipping', {
      webhookId,
      processedAt: existingWebhook.processedAt,
    });
    return NextResponse.json({
      received: true,
      skipped: true,
      reason: 'Already processed',
    });
  }

  try {
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { id, email_addresses, primary_email_address_id } = evt.data;

      logWebhookEvent(`Processing ${eventType}`, {
        userId: id,
        emailCount: email_addresses?.length,
        primaryEmailId: primary_email_address_id,
      });

      // Find the primary email
      const primaryEmail = email_addresses?.find(
        (email: { id: string; email_address: string }) =>
          email.id === primary_email_address_id,
      );

      if (!primaryEmail) {
        logWebhookEvent('ERROR: No primary email found', { userId: id });
        return NextResponse.json(
          { error: 'No primary email found', userId: id },
          { status: 400 },
        );
      }

      // Upsert user in our database
      const result = await db
        .insert(users)
        .values({
          id,
          email: primaryEmail.email_address,
        })
        .onConflictDoUpdate({
          target: [users.id],
          set: {
            email: primaryEmail.email_address,
            updatedAt: new Date(),
          },
        })
        .returning({ id: users.id, email: users.email });

      logWebhookEvent(
        `User ${eventType === 'user.created' ? 'created' : 'updated'} successfully`,
        {
          userId: id,
          email: primaryEmail.email_address,
          dbResult: result[0],
        },
      );
    }

    if (eventType === 'user.deleted') {
      const { id } = evt.data;

      logWebhookEvent('Processing user deletion', { userId: id });

      // First check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!existingUser) {
        logWebhookEvent('WARNING: User not found in database for deletion', {
          userId: id,
        });
        return NextResponse.json({
          received: true,
          warning: 'User not found in database',
          userId: id,
        });
      }

      // Delete user from our database
      const deleteResult = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id });

      if (deleteResult.length > 0) {
        logWebhookEvent('User deleted successfully', {
          userId: id,
          deletedUser: deleteResult[0],
        });
      } else {
        logWebhookEvent('WARNING: No rows deleted', { userId: id });
      }
    }

    // Mark webhook as processed
    await db.insert(webhookEvents).values({
      id: webhookId,
      provider: 'clerk',
      eventType,
    });

    logWebhookEvent('Webhook processed successfully', { eventType, webhookId });
    return NextResponse.json({ received: true, eventType });
  } catch (error) {
    logWebhookEvent('ERROR: Database operation failed', {
      eventType,
      userId: (evt.data as { id?: string })?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Database operation failed',
        eventType,
        userId: (evt.data as { id?: string })?.id,
      },
      { status: 500 },
    );
  }
}
