import { render, screen, userEvent } from '@testing-library/react-native';

import { GuestApplicationForm } from '@/features/guest-application/components/GuestApplicationForm';

describe('GuestApplicationForm', () => {
  it('submits the trimmed name/message and the account email', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(
      <GuestApplicationForm initialName="Jane Doe" email="jane@example.com" submitting={false} onSubmit={onSubmit} />
    );

    await user.type(screen.getByPlaceholderText('Tell us about yourself...'), '  I love skating  ');
    await user.press(screen.getByText('Submit application'));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane@example.com',
      message: 'I love skating',
      socialLinks: [],
    });
  });

  it('shows the account email as read-only', async () => {
    await render(
      <GuestApplicationForm initialName="Jane Doe" email="jane@example.com" submitting={false} onSubmit={jest.fn()} />
    );

    const emailField = screen.getByDisplayValue('jane@example.com');
    expect(emailField.props.editable).toBe(false);
  });

  it('rejects a blank name', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<GuestApplicationForm initialName="" email="jane@example.com" submitting={false} onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText('Tell us about yourself...'), 'I love skating');
    await user.press(screen.getByText('Submit application'));

    expect(screen.getByText('Please enter your name.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a blank message', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(
      <GuestApplicationForm initialName="Jane Doe" email="jane@example.com" submitting={false} onSubmit={onSubmit} />
    );

    await user.press(screen.getByText('Submit application'));

    expect(screen.getByText('Please tell us why you’d like to join.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('adds a valid social link and includes it on submit', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(
      <GuestApplicationForm initialName="Jane Doe" email="jane@example.com" submitting={false} onSubmit={onSubmit} />
    );

    await user.type(screen.getByPlaceholderText('https://...'), 'https://instagram.com/jane');
    await user.press(screen.getByLabelText('Add link'));
    await user.type(screen.getByPlaceholderText('Tell us about yourself...'), 'I love skating');
    await user.press(screen.getByText('Submit application'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ socialLinks: ['https://instagram.com/jane'] })
    );
  });

  it('rejects a social link with no http(s) scheme', async () => {
    const user = userEvent.setup();
    await render(
      <GuestApplicationForm initialName="Jane Doe" email="jane@example.com" submitting={false} onSubmit={jest.fn()} />
    );

    await user.type(screen.getByPlaceholderText('https://...'), 'not-a-link');
    await user.press(screen.getByLabelText('Add link'));

    expect(screen.getByText('Links must start with http:// or https://')).toBeTruthy();
  });

  it('disables the submit button while submitting', async () => {
    await render(
      <GuestApplicationForm initialName="Jane Doe" email="jane@example.com" submitting onSubmit={jest.fn()} />
    );

    expect(screen.getByRole('button').props.accessibilityState?.disabled).toBe(true);
  });
});
