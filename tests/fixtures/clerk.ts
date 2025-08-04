/**
 * Clerk test fixtures
 * Provides standard test data for Clerk-related tests
 */

import type { MockClerkUser } from '../mocks/clerk';

// Standard test users
export const testUsers = {
  basic: {
    id: 'user_test_basic',
    emailAddresses: [
      {
        id: 'email_test_basic',
        emailAddress: 'basic@test.com',
      },
    ],
    primaryEmailAddressId: 'email_test_basic',
    firstName: 'Basic',
    lastName: 'User',
    username: 'basicuser',
    publicMetadata: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as MockClerkUser,

  admin: {
    id: 'user_test_admin',
    emailAddresses: [
      {
        id: 'email_test_admin',
        emailAddress: 'admin@test.com',
      },
    ],
    primaryEmailAddressId: 'email_test_admin',
    firstName: 'Admin',
    lastName: 'User',
    username: 'adminuser',
    publicMetadata: { role: 'admin' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as MockClerkUser,

  orgMember: {
    id: 'user_test_org_member',
    emailAddresses: [
      {
        id: 'email_test_org',
        emailAddress: 'member@organization.com',
      },
    ],
    primaryEmailAddressId: 'email_test_org',
    firstName: 'Organization',
    lastName: 'Member',
    username: 'orgmember',
    publicMetadata: {
      organizationId: 'org_test_123',
      organizationRole: 'member',
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as MockClerkUser,

  // User with missing optional fields
  minimal: {
    id: 'user_test_minimal',
    emailAddresses: [
      {
        id: 'email_test_minimal',
        emailAddress: 'minimal@test.com',
      },
    ],
    primaryEmailAddressId: 'email_test_minimal',
    firstName: null,
    lastName: null,
    username: null,
    publicMetadata: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as MockClerkUser,
};

// Webhook event types
export interface ClerkWebhookEvent {
  type: string;
  data: unknown;
  object: string;
  id: string;
}

// Standard webhook payloads
export const webhookPayloads = {
  userCreated: {
    type: 'user.created',
    object: 'event',
    id: 'evt_test_created',
    data: {
      id: 'user_webhook_created',
      email_addresses: [
        {
          id: 'email_webhook_created',
          email_address: 'newuser@test.com',
          verification: {
            status: 'verified',
            strategy: 'email_code',
          },
        },
      ],
      primary_email_address_id: 'email_webhook_created',
      first_name: 'New',
      last_name: 'User',
      image_url: 'https://images.clerk.dev/uploaded/img_test_new_user.png',
      username: null,
      public_metadata: {},
      private_metadata: {},
      unsafe_metadata: {},
      created_at: 1704067200000, // 2024-01-01
      updated_at: 1704067200000,
    },
  } as ClerkWebhookEvent,

  userUpdated: {
    type: 'user.updated',
    object: 'event',
    id: 'evt_test_updated',
    data: {
      id: 'user_webhook_updated',
      email_addresses: [
        {
          id: 'email_webhook_updated',
          email_address: 'updated@test.com',
          verification: {
            status: 'verified',
            strategy: 'email_code',
          },
        },
      ],
      primary_email_address_id: 'email_webhook_updated',
      first_name: 'Updated',
      last_name: 'User',
      image_url: 'https://images.clerk.dev/uploaded/img_test_updated_user.png',
      username: 'updateduser',
      public_metadata: { role: 'premium' },
      private_metadata: {},
      unsafe_metadata: {},
      created_at: 1704067200000,
      updated_at: 1704153600000, // 2024-01-02
    },
  } as ClerkWebhookEvent,

  userDeleted: {
    type: 'user.deleted',
    object: 'event',
    id: 'evt_test_deleted',
    data: {
      id: 'user_webhook_deleted',
      deleted: true,
    },
  } as ClerkWebhookEvent,

  // Unknown event type for testing
  unknownEvent: {
    type: 'session.created',
    object: 'event',
    id: 'evt_test_unknown',
    data: {
      id: 'session_123',
      user_id: 'user_123',
    },
  } as ClerkWebhookEvent,
};

// Helper to create valid webhook headers using manual HMAC-SHA256 signing
export const createWebhookHeaders = (
  payload: ClerkWebhookEvent,
  secret: string = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw',
): Record<string, string> => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto');
  const payloadString = JSON.stringify(payload);

  // Generate timestamp
  const timestamp = Math.floor(Date.now() / 1000);

  // Create message ID
  const msgId = 'msg_' + Math.random().toString(36).substring(7);

  // Extract the base64 portion of the secret (after 'whsec_')
  const secretKey = secret.replace('whsec_', '');

  // Create the signed content: id.timestamp.payload
  const signedContent = `${msgId}.${timestamp}.${payloadString}`;

  // Generate HMAC-SHA256 signature
  const hmac = crypto.createHmac('sha256', Buffer.from(secretKey, 'base64'));
  hmac.update(signedContent, 'utf8');
  const signature = hmac.digest('base64');

  return {
    'svix-id': msgId,
    'svix-timestamp': timestamp.toString(),
    'svix-signature': `v1,${signature}`,
  };
};

// Helper to create invalid webhook headers
export const createInvalidWebhookHeaders = (): Record<string, string> => {
  return {
    'svix-id': 'msg_invalid',
    'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
    'svix-signature': 'v1,invalid_signature_that_will_fail_verification',
  };
};

// Organization test data
export const testOrganizations = {
  basic: {
    id: 'org_test_123',
    name: 'Test Organization',
    slug: 'test-org',
    membersCount: 5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  premium: {
    id: 'org_test_premium',
    name: 'Premium Organization',
    slug: 'premium-org',
    membersCount: 25,
    publicMetadata: { plan: 'premium' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

// Organization membership test data
export const testMemberships = {
  admin: {
    id: 'mem_test_admin',
    organizationId: 'org_test_123',
    userId: 'user_test_org_member',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  member: {
    id: 'mem_test_member',
    organizationId: 'org_test_123',
    userId: 'user_test_basic',
    role: 'member',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};
