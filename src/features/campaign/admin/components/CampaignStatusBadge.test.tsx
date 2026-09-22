import { render, screen } from '@testing-library/react-native';

import { CampaignStatusBadge } from '@/features/campaign/admin/components/CampaignStatusBadge';
import type { CampaignStatus } from '@/features/campaign/types';

describe('CampaignStatusBadge', () => {
  it.each<[CampaignStatus, string]>([
    ['DRAFT', 'Draft'],
    ['SCHEDULED', 'Scheduled'],
    ['ACTIVE', 'Active'],
    ['PAUSED', 'Paused'],
    ['EXPIRED', 'Expired'],
    ['ARCHIVED', 'Archived'],
  ])('renders the label for %s', async (status, label) => {
    await render(<CampaignStatusBadge status={status} />);

    expect(screen.getByText(label)).toBeTruthy();
  });
});
