/**
 * Clerk mock utilities for testing
 * Provides reusable mocks for Clerk authentication functions
 */

import type { User } from '@clerk/nextjs/server';

// Mock user type that matches Clerk's User interface
export interface MockClerkUser {
  id: string;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
  }>;
  primaryEmailAddressId: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  publicMetadata: Record<string, unknown>;
  privateMetadata?: Record<string, unknown>;
  unsafeMetadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Default mock implementations
export const mockAuth = jest.fn();
export const mockCurrentUser = jest.fn();
export const mockClerkClient = {
  users: {
    getUser: jest.fn(),
    updateUser: jest.fn(),
    updateUserMetadata: jest.fn(),
    deleteUser: jest.fn(),
  },
  organizations: {
    getOrganization: jest.fn(),
    getOrganizationMembershipList: jest.fn(),
  },
};

// Client-side mocks
export const mockUseUser = jest.fn();
export const mockUseAuth = jest.fn();
export const mockUseOrganization = jest.fn();
export const mockSignedIn = jest.fn();
export const mockSignedOut = jest.fn();
export const mockUserButton = jest.fn();

// Helper to create consistent mock setup
export const setupClerkMocks = (overrides?: {
  auth?: jest.Mock;
  currentUser?: jest.Mock;
  useUser?: jest.Mock;
  clerkClient?: any;
}) => {
  // Server-side mocks
  jest.doMock('@clerk/nextjs/server', () => ({
    auth: overrides?.auth || mockAuth,
    currentUser: overrides?.currentUser || mockCurrentUser,
    clerkClient: overrides?.clerkClient || mockClerkClient,
  }));

  // Client-side mocks
  jest.doMock('@clerk/nextjs', () => ({
    useUser: overrides?.useUser || mockUseUser,
    useAuth: mockUseAuth,
    useOrganization: mockUseOrganization,
    SignedIn: ({ children }: { children: React.ReactNode }) =>
      mockSignedIn() ? children : null,
    SignedOut: ({ children }: { children: React.ReactNode }) =>
      mockSignedOut() ? children : null,
    UserButton: mockUserButton,
  }));
};

// Helper to reset all mocks
export const resetClerkMocks = () => {
  mockAuth.mockReset();
  mockCurrentUser.mockReset();
  mockUseUser.mockReset();
  mockUseAuth.mockReset();
  mockUseOrganization.mockReset();
  mockSignedIn.mockReset();
  mockSignedOut.mockReset();
  mockUserButton.mockReset();

  // Reset clerkClient mocks
  Object.values(mockClerkClient.users).forEach(mock => mock.mockReset());
  Object.values(mockClerkClient.organizations).forEach(mock =>
    mock.mockReset(),
  );
};

// Helpers for common authentication scenarios
export const mockAuthenticatedUser = (user: Partial<MockClerkUser> = {}) => {
  const fullUser = createMockUser(user);

  mockAuth.mockResolvedValue({ userId: fullUser.id });
  mockCurrentUser.mockResolvedValue(fullUser);
  mockUseUser.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    user: fullUser,
  });
  mockSignedIn.mockReturnValue(true);
  mockSignedOut.mockReturnValue(false);

  return fullUser;
};

export const mockUnauthenticatedUser = () => {
  mockAuth.mockResolvedValue({ userId: null });
  mockCurrentUser.mockResolvedValue(null);
  mockUseUser.mockReturnValue({
    isLoaded: true,
    isSignedIn: false,
    user: null,
  });
  mockSignedIn.mockReturnValue(false);
  mockSignedOut.mockReturnValue(true);
};

export const mockLoadingAuth = () => {
  mockAuth.mockResolvedValue({ userId: undefined });
  mockCurrentUser.mockResolvedValue(undefined);
  mockUseUser.mockReturnValue({
    isLoaded: false,
    isSignedIn: false,
    user: undefined,
  });
};

// Helper to create a mock user with defaults
export const createMockUser = (
  overrides: Partial<MockClerkUser> = {},
): MockClerkUser => {
  const userId =
    overrides.id || 'user_' + Math.random().toString(36).substring(7);
  const email =
    overrides.emailAddresses?.[0]?.emailAddress || 'test@example.com';
  const emailId =
    overrides.emailAddresses?.[0]?.id ||
    'email_' + Math.random().toString(36).substring(7);

  return {
    id: userId,
    emailAddresses: [
      {
        id: emailId,
        emailAddress: email,
      },
    ],
    primaryEmailAddressId: emailId,
    firstName: 'Test',
    lastName: 'User',
    username: null,
    publicMetadata: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
};
