import { render, screen, userEvent } from '@testing-library/react-native';

import { RouteErrorFallback } from '@/shared/components/RouteErrorFallback';

describe('RouteErrorFallback', () => {
  it('renders the error name/message and stack, and fires retry on press', async () => {
    const error = new Error('boom');
    error.name = 'CustomError';
    const retry = jest.fn();
    const user = userEvent.setup();

    await render(<RouteErrorFallback error={error} retry={retry} />);

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('CustomError: boom')).toBeTruthy();
    if (error.stack) {
      expect(screen.getByText(error.stack)).toBeTruthy();
    }

    await user.press(screen.getByText('Try again'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('omits the stack trace block when the error has none', async () => {
    const error = new Error('boom');
    error.stack = undefined;

    await render(<RouteErrorFallback error={error} retry={jest.fn()} />);

    expect(screen.getByText(`${error.name}: boom`)).toBeTruthy();
  });
});
