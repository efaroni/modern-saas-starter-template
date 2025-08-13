#!/usr/bin/env node

const crypto = require('crypto');
require('dotenv').config();

// Webhook configuration from environment - NO FALLBACKS ALLOWED
const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
const WEBHOOK_URL = process.env.CLERK_WEBHOOK_URL;

// Test payload
const payload = {
  type: 'user.created',
  data: {
    id: 'user_test_' + Date.now(),
    email_addresses: [
      {
        id: 'email_test_123',
        email_address: 'webhook-test@example.com',
      },
    ],
    primary_email_address_id: 'email_test_123',
    first_name: 'Test',
    last_name: 'User',
    image_url: null,
  },
};

const payloadString = JSON.stringify(payload);

// Generate Svix headers (simplified version for testing)
const timestamp = Math.floor(Date.now() / 1000);
const msgId = 'msg_test_' + Date.now();

// Create signature (this is a simplified version, real Svix uses a more complex algorithm)
const signedContent = `${msgId}.${timestamp}.${payloadString}`;
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET.replace('whsec_', ''))
  .update(signedContent)
  .digest('base64');

console.log(
  'Sending test webhook to:', WEBHOOK_URL,
);
console.log('Payload:', JSON.stringify(payload, null, 2));

// Send the request
fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'svix-id': msgId,
    'svix-timestamp': timestamp.toString(),
    'svix-signature': `v1,${signature}`,
  },
  body: payloadString,
})
  .then(res => {
    console.log('Response status:', res.status);
    return res.text();
  })
  .then(body => {
    console.log('Response body:', body);
  })
  .catch(err => {
    console.error('Error:', err);
  });
