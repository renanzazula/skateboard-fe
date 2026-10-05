import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { GuestApplicationSettingsForm } from '@/features/guest-application/components/GuestApplicationSettingsForm';
import type { GuestApplicationSettings } from '@/features/guest-application/types';

const baseSettings: GuestApplicationSettings = {
  enabled: true,
  recipientIds: ['11111111-1111-1111-1111-111111111111'],
  confirmationSubject: 'Subject',
  confirmationBody: 'Body {name}',
};

describe('GuestApplicationSettingsForm', () => {
  it('submits the current values unchanged', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<GuestApplicationSettingsForm initialSettings={baseSettings} submitting={false} onSubmit={onSubmit} />);

    await user.press(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith(baseSettings);
  });

  it('adds a valid recipient id', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<GuestApplicationSettingsForm initialSettings={baseSettings} submitting={false} onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText('User ID (UUID)'), '22222222-2222-2222-2222-222222222222');
    await user.press(screen.getByLabelText('Add recipient'));
    await user.press(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientIds: ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'],
      })
    );
  });

  it('rejects a non-UUID recipient id', async () => {
    const user = userEvent.setup();
    await render(<GuestApplicationSettingsForm initialSettings={baseSettings} submitting={false} onSubmit={jest.fn()} />);

    await user.type(screen.getByPlaceholderText('User ID (UUID)'), 'not-a-uuid');
    await user.press(screen.getByLabelText('Add recipient'));

    expect(screen.getByText('Must be a valid user ID (UUID).')).toBeTruthy();
  });

  it('blocks enabling with no recipients', async () => {
    const onSubmit = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(
      <GuestApplicationSettingsForm
        initialSettings={{ ...baseSettings, recipientIds: [] }}
        submitting={false}
        onSubmit={onSubmit}
      />
    );

    await user.press(screen.getByText('Save'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Add at least one recipient before enabling this feature.',
      undefined
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('toggles enabled off without requiring a recipient', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(
      <GuestApplicationSettingsForm
        initialSettings={{ ...baseSettings, recipientIds: [] }}
        submitting={false}
        onSubmit={onSubmit}
      />
    );

    // enabled starts true but recipientIds is empty; toggle off first.
    fireEvent(screen.getByRole('switch'), 'valueChange', false);
    await user.press(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});
