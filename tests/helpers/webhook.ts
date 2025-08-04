/**
 * Webhook testing helpers
 * Utilities for testing webhook endpoints
 */

import { NextRequest } from 'next/server';

/**
 * Creates a mock NextRequest for webhook testing
 */
export class MockWebhookRequest extends NextRequest {
  private bodyContent: string;

  constructor(
    url: string,
    body: Record<string, any>,
    headers: Record<string, string> = {},
  ) {
    const bodyString = JSON.stringify(body);

    // Create headers with webhook headers
    const requestHeaders = new Headers({
      'content-type': 'application/json',
      ...headers,
    });

    // Create the request with proper initialization
    super(url, {
      method: 'POST',
      headers: requestHeaders,
      body: bodyString,
    });

    this.bodyContent = bodyString;
  }

  // Override json() to return our body
  async json() {
    return JSON.parse(this.bodyContent);
  }

  // Override text() for webhook signature verification
  async text() {
    return this.bodyContent;
  }
}
