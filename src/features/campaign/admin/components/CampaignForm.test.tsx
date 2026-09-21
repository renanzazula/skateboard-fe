import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';

import { CampaignForm } from '@/features/campaign/admin/components/CampaignForm';
import type { Campaign } from '@/features/campaign/types';

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: { testID?: string; mode?: string }) => <View testID={props.testID ?? `datetimepicker-${props.mode}`} {...props} />,
  };
});

describe('CampaignForm', () => {
  it('disables save until a name is entered', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<CampaignForm submitting={false} onSubmit={onSubmit} />);

    await user.press(screen.getByText('Save'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits defaults once a name is entered', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<CampaignForm submitting={false} onSubmit={onSubmit} />);

    await user.type(screen.getAllByDisplayValue('')[0], 'Summer Drop');
    await user.press(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Summer Drop',
        description: undefined,
        priority: 0,
        audience: 'ALL',
        frequencyType: 'ALWAYS',
        maxDisplaysPerDay: undefined,
      })
    );
  });

  it('pre-fills fields from the initial campaign for editing', async () => {
    const initial: Campaign = {
      id: 'c1',
      name: 'Existing',
      description: 'A note',
      priority: 5,
      startAt: '2026-01-01T00:00:00.000Z',
      endAt: '2026-01-08T00:00:00.000Z',
      audience: 'AUTHENTICATED',
      frequencyType: 'MAX_PER_DAY',
      maxDisplaysPerDay: 2,
    } as Campaign;

    await render(<CampaignForm initial={initial} submitting={false} onSubmit={jest.fn()} />);

    expect(screen.getByDisplayValue('Existing')).toBeTruthy();
    expect(screen.getByDisplayValue('A note')).toBeTruthy();
    expect(screen.getByDisplayValue('5')).toBeTruthy();
    expect(screen.getByDisplayValue('2')).toBeTruthy();
  });

  it('shows the max-displays-per-day field only for MAX_PER_DAY frequency, and includes it on submit', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<CampaignForm submitting={false} onSubmit={onSubmit} />);

    expect(screen.queryByText('Max displays per day')).toBeNull();

    await user.press(screen.getByText('A few times per day'));
    expect(screen.getByText('Max displays per day')).toBeTruthy();

    await user.type(screen.getAllByDisplayValue('')[0], 'Summer Drop');
    // The max-displays field defaults to "3" once shown.
    await user.press(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ frequencyType: 'MAX_PER_DAY', maxDisplaysPerDay: 3 }));
  });

  it('shows a validation error and disables save when the end date is not after the start date', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<CampaignForm submitting={false} onSubmit={onSubmit} />);

    await user.type(screen.getAllByDisplayValue('')[0], 'Summer Drop');

    const pickers = screen.getAllByTestId('datetimepicker-datetime');
    const startPicker = pickers[0];
    const endPicker = pickers[1];

    const sameInstant = new Date('2026-06-01T00:00:00.000Z');
    fireEvent(startPicker, 'onChange', { type: 'set' }, sameInstant);
    fireEvent(endPicker, 'onChange', { type: 'set' }, sameInstant);

    expect(await screen.findByText('The end time must be after the start time.')).toBeTruthy();

    await user.press(screen.getByText('Save'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
