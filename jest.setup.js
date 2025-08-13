import '@testing-library/jest-dom';
import { config } from 'dotenv';

// Load environment variables from .env.test (isolated test environment)
config({ path: '.env.test' });

// Fix setImmediate not defined error
global.setImmediate =
  global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args));
global.clearImmediate =
  global.clearImmediate || (id => global.clearTimeout(id));

// Add TextDecoder/TextEncoder polyfills for React Email
if (!global.TextDecoder) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextDecoder } = require('util');
  global.TextDecoder = TextDecoder;
}

if (!global.TextEncoder) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextEncoder } = require('util');
  global.TextEncoder = TextEncoder;
}

// Ensure NODE_ENV is set to test
process.env.NODE_ENV = 'test';

// Mock Next.js server components only for API route testing (not middleware tests)
// Middleware tests need the real NextRequest implementation
const mockNextResponse = {
  json: (data, init) => {
    const response = {
      _data: data,
      status: init?.status || 200,
      ok: (init?.status || 200) < 400,
      headers: new Map(),
      json() {
        return Promise.resolve(this._data);
      },
    };
    return response;
  },
  redirect: (url, status) => {
    return {
      _data: null,
      status: status || 302,
      headers: new Map([['location', url]]),
      json() {
        return Promise.resolve(null);
      },
    };
  },
  next: () => {
    return {
      _data: null,
      status: 200,
      headers: new Map(),
      json() {
        return Promise.resolve(null);
      },
    };
  },
};

// Only mock NextResponse, let NextRequest be the real implementation
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextResponse: mockNextResponse,
  };
});

// Minimal global Request/Response for Next.js compatibility
// These are base implementations that don't interfere with NextRequest
if (!global.Request) {
  global.Request = class Request {
    constructor(input, init = {}) {
      this._url = typeof input === 'string' ? input : input.url;
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
    }

    get url() {
      return this._url;
    }
  };
}

if (!global.Response) {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.ok = this.status < 400;
      this.headers = new Headers(init.headers);
    }
  };
}

if (!global.Headers) {
  global.Headers = class Headers {
    constructor(init = {}) {
      this.map = new Map(Object.entries(init));
    }
    get(name) {
      return this.map.get(name);
    }
    set(name, value) {
      this.map.set(name, value);
    }
    has(name) {
      return this.map.has(name);
    }
  };
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock server actions
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Mock Clerk to prevent ES module issues in tests
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    },
  }),
  SignedIn: ({ children: _children }) => _children,
  SignedOut: ({ children: _children }) => null,
  UserButton: () => null,
}));

// Mock Clerk backend to prevent ES module issues (but let individual tests mock server functions)
jest.mock('@clerk/backend', () => ({}));

// Removed global Clerk mock to allow individual tests to control auth state

// Global test setup and teardown
beforeAll(async () => {
  try {
    // Lazy import test database utilities to prevent early initialization
    const { initializeTestDatabase } = await import('./lib/db/test');

    // Initialize test database
    await initializeTestDatabase();
  } catch (error) {
    console.warn('Test database initialization failed:', error);
    // Don't throw - let individual tests handle database issues
  }
}, 60000); // 60 second timeout for database initialization

// Note: Individual tests handle their own cleanup to maintain control over data lifecycle
// Global cleanup only occurs at the suite level (beforeAll/afterAll) for proper isolation

afterAll(async () => {
  try {
    // Lazy import to avoid early initialization
    const { closeTestDatabase } = await import('./lib/db/test');

    // Close test database connections
    await closeTestDatabase();
  } catch (error) {
    console.warn('Test database cleanup failed:', error);
  }
}, 10000); // 10 second timeout for cleanup
