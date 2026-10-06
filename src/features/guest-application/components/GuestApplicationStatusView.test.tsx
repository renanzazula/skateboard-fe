import { render, screen } from '@testing-library/react-native';

import { GuestApplicationStatusView } from '@/features/guest-application/components/GuestApplicationStatusView';
import type { GuestApplication } from '@/features/guest-application/types';

describe('GuestApplicationStatusView', () => {
  const application: GuestApplication = {
    id: '1',
    userId: 'u1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    message: 'I love skating',
    socialLinks: ['https://instagram.com/jane'],
    status: 'NEW',
    createdAt: '2026-10-05T00:00:00Z',
    updatedAt: '2026-10-05T00:00:00Z',
    reviewedBy: null,
  };

  it('shows the status badge, message, and social links', async () => {
    await render(<GuestApplicationStatusView application={application} />);

    expect(screen.getByText('New')).toBeTruthy();
    expect(screen.getByText('I love skating')).toBeTruthy();
    expect(screen.getByText('https://instagram.com/jane')).toBeTruthy();
  });

  it('omits the social links section when there are none', async () => {
    await render(<GuestApplicationStatusView application={{ ...application, socialLinks: [] }} />);

    expect(screen.queryByText('https://instagram.com/jane')).toBeNull();
  });
});
