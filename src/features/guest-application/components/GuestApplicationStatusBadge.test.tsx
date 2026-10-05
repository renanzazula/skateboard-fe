import { render, screen } from '@testing-library/react-native';

import { GuestApplicationStatusBadge } from '@/features/guest-application/components/GuestApplicationStatusBadge';
import type { GuestApplicationStatus } from '@/features/guest-application/types';

describe('GuestApplicationStatusBadge', () => {
  it.each<[GuestApplicationStatus, string]>([
    ['NEW', 'New'],
    ['CONTACTED', 'Contacted'],
    ['ACCEPTED', 'Accepted'],
    ['DECLINED', 'Declined'],
  ])('renders the label for %s', async (status, label) => {
    await render(<GuestApplicationStatusBadge status={status} />);

    expect(screen.getByText(label)).toBeTruthy();
  });
});
