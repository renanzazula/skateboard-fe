import { render, screen, userEvent } from '@testing-library/react-native';

import { ErrorBanner } from '@/shared/components/ErrorBanner';

describe('ErrorBanner', () => {
  it('renders the message and omits detail/retry when not given', async () => {
    await render(<ErrorBanner message="Something broke" />);

    expect(screen.getByText('Something broke')).toBeTruthy();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('renders the detail text when given', async () => {
    await render(<ErrorBanner message="Something broke" detail="TypeError: x is undefined" />);

    expect(screen.getByText('TypeError: x is undefined')).toBeTruthy();
  });

  it('renders a retry action and fires onRetry when pressed', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    await render(<ErrorBanner message="Something broke" onRetry={onRetry} />);

    await user.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
