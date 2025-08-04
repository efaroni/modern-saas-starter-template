/**
 * Unit tests for user data transformations and authorization logic
 * Tests how Clerk user data is processed and used in the application
 */

import { testUsers } from '@/tests/fixtures/clerk';

// User transformation utilities
export const formatUserDisplayName = (user: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
}): string => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) {
    return user.firstName;
  }
  if (user.username) {
    return user.username;
  }
  return user.emailAddresses[0]?.emailAddress || 'User';
};

export const getUserPrimaryEmail = (user: {
  emailAddresses: Array<{ id: string; emailAddress: string }>;
  primaryEmailAddressId: string | null;
}): string | null => {
  if (!user.primaryEmailAddressId) {
    return user.emailAddresses[0]?.emailAddress || null;
  }

  const primaryEmail = user.emailAddresses.find(
    email => email.id === user.primaryEmailAddressId,
  );

  return (
    primaryEmail?.emailAddress || user.emailAddresses[0]?.emailAddress || null
  );
};

export const hasRole = (
  user: { publicMetadata: Record<string, unknown> },
  role: string,
): boolean => {
  return user.publicMetadata?.role === role;
};

export const isOrganizationMember = (
  user: { publicMetadata: Record<string, unknown> },
  organizationId: string,
): boolean => {
  return user.publicMetadata?.organizationId === organizationId;
};

export const getOrganizationRole = (user: {
  publicMetadata: Record<string, unknown>;
}): string | null => {
  return (user.publicMetadata?.organizationRole as string) || null;
};

// Tests
describe('User Data Transformations', () => {
  describe('formatUserDisplayName', () => {
    it('should format full name when both first and last name exist', () => {
      const displayName = formatUserDisplayName(testUsers.basic);
      expect(displayName).toBe('Basic User');
    });

    it('should use first name only when last name is missing', () => {
      const user = {
        ...testUsers.basic,
        lastName: null,
      };
      const displayName = formatUserDisplayName(user);
      expect(displayName).toBe('Basic');
    });

    it('should use username when names are missing', () => {
      const user = {
        ...testUsers.basic,
        firstName: null,
        lastName: null,
      };
      const displayName = formatUserDisplayName(user);
      expect(displayName).toBe('basicuser');
    });

    it('should use email when all other fields are missing', () => {
      const displayName = formatUserDisplayName(testUsers.minimal);
      expect(displayName).toBe('minimal@test.com');
    });

    it('should return "User" when no data is available', () => {
      const user = {
        firstName: null,
        lastName: null,
        username: null,
        emailAddresses: [],
      };
      const displayName = formatUserDisplayName(user);
      expect(displayName).toBe('User');
    });
  });

  describe('getUserPrimaryEmail', () => {
    it('should return primary email when specified', () => {
      const email = getUserPrimaryEmail(testUsers.basic);
      expect(email).toBe('basic@test.com');
    });

    it('should return first email when no primary is specified', () => {
      const user = {
        ...testUsers.basic,
        primaryEmailAddressId: null,
      };
      const email = getUserPrimaryEmail(user);
      expect(email).toBe('basic@test.com');
    });

    it('should handle missing primary email ID gracefully', () => {
      const user = {
        emailAddresses: [
          { id: 'email_1', emailAddress: 'first@test.com' },
          { id: 'email_2', emailAddress: 'second@test.com' },
        ],
        primaryEmailAddressId: 'email_3', // Non-existent ID
      };
      const email = getUserPrimaryEmail(user);
      expect(email).toBe('first@test.com'); // Falls back to first
    });

    it('should return null when no emails exist', () => {
      const user = {
        emailAddresses: [],
        primaryEmailAddressId: null,
      };
      const email = getUserPrimaryEmail(user);
      expect(email).toBeNull();
    });
  });
});

describe('Authorization Logic', () => {
  describe('hasRole', () => {
    it('should return true when user has specified role', () => {
      expect(hasRole(testUsers.admin, 'admin')).toBe(true);
    });

    it('should return false when user has different role', () => {
      expect(hasRole(testUsers.admin, 'user')).toBe(false);
    });

    it('should return false when user has no role', () => {
      expect(hasRole(testUsers.basic, 'admin')).toBe(false);
    });

    it('should handle undefined publicMetadata', () => {
      const user = { publicMetadata: {} };
      expect(hasRole(user, 'admin')).toBe(false);
    });
  });

  describe('isOrganizationMember', () => {
    it('should return true when user belongs to organization', () => {
      expect(isOrganizationMember(testUsers.orgMember, 'org_test_123')).toBe(
        true,
      );
    });

    it('should return false when user belongs to different organization', () => {
      expect(isOrganizationMember(testUsers.orgMember, 'org_different')).toBe(
        false,
      );
    });

    it('should return false when user has no organization', () => {
      expect(isOrganizationMember(testUsers.basic, 'org_test_123')).toBe(false);
    });
  });

  describe('getOrganizationRole', () => {
    it('should return organization role when present', () => {
      expect(getOrganizationRole(testUsers.orgMember)).toBe('member');
    });

    it('should return null when no organization role exists', () => {
      expect(getOrganizationRole(testUsers.basic)).toBeNull();
    });
  });
});

// Example of authorization middleware test
describe('Authorization Middleware', () => {
  const requireRole = (requiredRole: string) => {
    return (user: { publicMetadata: Record<string, unknown> }) => {
      if (!hasRole(user, requiredRole)) {
        throw new Error(`Unauthorized: Requires ${requiredRole} role`);
      }
    };
  };

  const requireOrganizationMembership = (organizationId: string) => {
    return (user: { publicMetadata: Record<string, unknown> }) => {
      if (!isOrganizationMember(user, organizationId)) {
        throw new Error('Unauthorized: Not a member of this organization');
      }
    };
  };

  it('should allow access with correct role', () => {
    const adminOnly = requireRole('admin');
    expect(() => adminOnly(testUsers.admin)).not.toThrow();
  });

  it('should deny access without correct role', () => {
    const adminOnly = requireRole('admin');
    expect(() => adminOnly(testUsers.basic)).toThrow(
      'Unauthorized: Requires admin role',
    );
  });

  it('should allow organization members', () => {
    const orgOnly = requireOrganizationMembership('org_test_123');
    expect(() => orgOnly(testUsers.orgMember)).not.toThrow();
  });

  it('should deny non-organization members', () => {
    const orgOnly = requireOrganizationMembership('org_test_123');
    expect(() => orgOnly(testUsers.basic)).toThrow(
      'Not a member of this organization',
    );
  });
});
