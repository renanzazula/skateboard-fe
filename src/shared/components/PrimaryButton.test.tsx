import { render, screen, userEvent } from '@testing-library/react-native';

import { PrimaryButton } from '@/shared/components/PrimaryButton';

describe('PrimaryButton', () => {
  it('renders the title and fires onPress when enabled', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<PrimaryButton title="Save" onPress={onPress} />);

    expect(screen.getByText('Save')).toBeTruthy();
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.props.accessibilityState?.disabled).toBeFalsy();

    await user.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled and does not fire onPress when disabled', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<PrimaryButton title="Save" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.props.accessibilityState?.disabled).toBe(true);

    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner instead of the title while loading, and reports busy state', async () => {
    await render(<PrimaryButton title="Save" loading />);

    expect(screen.queryByText('Save')).toBeNull();
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState?.busy).toBe(true);
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });
});
