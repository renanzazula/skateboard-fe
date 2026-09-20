import { render, screen, userEvent } from '@testing-library/react-native';
import { Inbox } from 'lucide-react-native';

import { EmptyState } from '@/shared/components/EmptyState';

describe('EmptyState', () => {
  it('renders the title and no description/action when not given', async () => {
    await render(<EmptyState icon={Inbox} title="Nothing here" />);

    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders the description when given', async () => {
    await render(<EmptyState icon={Inbox} title="Nothing here" description="Try again later" />);

    expect(screen.getByText('Try again later')).toBeTruthy();
  });

  it('renders the action button only when both actionLabel and onAction are given, and fires onAction when pressed', async () => {
    const onAction = jest.fn();
    const user = userEvent.setup();
    await render(<EmptyState icon={Inbox} title="Nothing here" actionLabel="Retry" onAction={onAction} />);

    const button = screen.getByText('Retry');
    await user.press(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('omits the action button when actionLabel is given without onAction', async () => {
    await render(<EmptyState icon={Inbox} title="Nothing here" actionLabel="Retry" />);

    expect(screen.queryByText('Retry')).toBeNull();
  });
});
