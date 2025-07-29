import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Navigation } from '@/components/navigation';
import type { AuthUser } from '@/lib/auth/types';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock logoutAction
jest.mock('@/app/actions/auth', () => ({
  logoutAction: jest.fn(),
}));

import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';

describe('Navigation Component', () => {
  const mockUsePathname = usePathname as jest.MockedFunction<
    typeof usePathname
  >;
  const mockLogoutAction = logoutAction as jest.MockedFunction<
    typeof logoutAction
  >;

  const mockUser: AuthUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/configuration');
    // Mock window.location
    delete (window as any).location;
    window.location = { href: 'http://localhost:3000/configuration' } as any;
  });

  describe('Rendering', () => {
    it('should not render when user is null', () => {
      const { container } = render(<Navigation user={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render navigation when user is authenticated', () => {
      render(<Navigation user={mockUser} />);

      expect(screen.getByText('SaaS Starter')).toBeInTheDocument();
      expect(screen.getByText('API Keys')).toBeInTheDocument();
      expect(screen.getByText('AI Styling')).toBeInTheDocument();
      expect(screen.getByText('Generators')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Rate Limiting')).toBeInTheDocument();
    });

    it('should display user email', () => {
      render(<Navigation user={mockUser} />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should highlight active navigation item', () => {
      mockUsePathname.mockReturnValue('/styling');
      render(<Navigation user={mockUser} />);

      const stylingLink = screen.getByRole('link', { name: /AI Styling/i });
      expect(stylingLink).toHaveClass('bg-blue-100', 'text-blue-700');
    });
  });

  describe('Desktop Menu', () => {
    it('should show all navigation links', () => {
      render(<Navigation user={mockUser} />);

      const navLinks = [
        { name: 'API Keys', href: '/configuration' },
        { name: 'AI Styling', href: '/styling' },
        { name: 'Generators', href: '/generators' },
        { name: 'Performance', href: '/performance' },
        { name: 'Rate Limiting', href: '/rate-limiting' },
      ];

      navLinks.forEach(link => {
        const element = screen.getByRole('link', {
          name: new RegExp(link.name, 'i'),
        });
        expect(element).toHaveAttribute('href', link.href);
      });
    });

    it('should handle sign out', async () => {
      render(<Navigation user={mockUser} />);

      // Find and click sign out button
      const signOutButton = screen.getByRole('button', { name: /Sign Out/i });
      fireEvent.click(signOutButton);

      await waitFor(() => {
        expect(mockLogoutAction).toHaveBeenCalled();
      });

      // In the component, window.location.href is set, but in jsdom it becomes absolute
      expect(window.location.href).toContain('/?message=logged-out');
    });
  });

  describe('Mobile Menu', () => {
    it('should toggle mobile menu', () => {
      render(<Navigation user={mockUser} />);

      // Mobile menu should be hidden initially
      expect(screen.queryByText('Signed in as')).not.toBeInTheDocument();

      // Open mobile menu
      const menuButton = screen.getByRole('button', {
        name: /Open main menu/i,
      });
      fireEvent.click(menuButton);

      // Mobile menu should be visible
      expect(screen.getByText('Signed in as')).toBeInTheDocument();

      // Close mobile menu
      fireEvent.click(menuButton);

      // Mobile menu should be hidden again
      expect(screen.queryByText('Signed in as')).not.toBeInTheDocument();
    });

    it('should close mobile menu when link is clicked', () => {
      render(<Navigation user={mockUser} />);

      // Open mobile menu
      const menuButton = screen.getByRole('button', {
        name: /Open main menu/i,
      });
      fireEvent.click(menuButton);

      // Click a link
      const apiKeysLinks = screen.getAllByRole('link', { name: /API Keys/i });
      fireEvent.click(apiKeysLinks[apiKeysLinks.length - 1]); // Get mobile version

      // Mobile menu should be closed
      expect(screen.queryByText('Signed in as')).not.toBeInTheDocument();
    });
  });

  describe('User Menu', () => {
    it('should show account settings link', () => {
      render(<Navigation user={mockUser} />);

      const accountLink = screen.getByRole('link', {
        name: /Account Settings/i,
      });
      expect(accountLink).toHaveAttribute('href', '/auth');
    });

    it('should truncate long email addresses', () => {
      const longEmailUser = {
        ...mockUser,
        email: 'verylongemailaddress@extremelylongdomainname.com',
      };

      render(<Navigation user={longEmailUser} />);

      const emailElement = screen.getByText(longEmailUser.email);
      expect(emailElement).toHaveClass('truncate');
    });
  });
});
