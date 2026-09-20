import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

import { SecondaryButton } from '@/shared/components/SecondaryButton';

describe('SecondaryButton', () => {
  it('renders the title, an optional icon, and fires onPress when enabled', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<SecondaryButton title="Cancel" icon={<Text>icon</Text>} onPress={onPress} />);

    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('icon')).toBeTruthy();

    await user.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled and does not fire onPress when disabled', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<SecondaryButton title="Cancel" onPress={onPress} disabled />);

    const button = screen.getByRole('button');
    expect(button.props.accessibilityState?.disabled).toBe(true);

    await user.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner instead of the title/icon while loading', async () => {
    await render(<SecondaryButton title="Cancel" icon={<Text>icon</Text>} loading />);

    expect(screen.queryByText('Cancel')).toBeNull();
    expect(screen.queryByText('icon')).toBeNull();
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState?.busy).toBe(true);
  });
});
