import { render, screen, userEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

import EmailTemplatesAdminScreen from '@/app/(tabs)/settings/email-templates-admin';
import { useAuth } from '@/core/auth';
import { useEmailTemplatesAdmin } from '@/features/email-templates/hooks/useEmailTemplatesAdmin';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
}));

jest.mock('@/core/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/email-templates/hooks/useEmailTemplatesAdmin', () => ({
  useEmailTemplatesAdmin: jest.fn(),
}));

const { Redirect } = jest.requireMock('expo-router');
const mockUseAuth = useAuth as jest.Mock;
const mockUseEmailTemplatesAdmin = useEmailTemplatesAdmin as jest.Mock;

const RECEIVED_EN = {
  id: 'r-en',
  type: 'GUEST_APPLICATION_RECEIVED',
  language: 'en',
  subject: 'We received your application',
  body: 'Thanks {{name}}!',
  enabled: true,
};

const ADMIN_EN = {
  id: 'a-en',
  type: 'GUEST_APPLICATION_ADMIN_NOTIFICATION',
  language: 'en',
  subject: 'New application from {{name}}',
  body: '{{name}} ({{email}}): {{message}}',
  enabled: false,
};

describe('EmailTemplatesAdminScreen', () => {
  const listTemplates = jest.fn();
  const updateTemplate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(true) });
    mockUseEmailTemplatesAdmin.mockReturnValue({ submitting: false, listTemplates, updateTemplate });
    listTemplates.mockResolvedValue([RECEIVED_EN, ADMIN_EN]);
  });

  it('redirects to settings when unauthorized', async () => {
    mockUseAuth.mockReturnValue({ hasAuthority: jest.fn().mockReturnValue(false) });
    await render(<EmailTemplatesAdminScreen />);

    expect(Redirect).toHaveBeenCalled();
    expect(Redirect.mock.calls[0][0]).toEqual({ href: '/settings' });
  });

  it('shows an error banner with retry when loading fails', async () => {
    listTemplates.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    await render(<EmailTemplatesAdminScreen />);

    expect(await screen.findByText('Could not load email templates.')).toBeTruthy();
    listTemplates.mockResolvedValueOnce([RECEIVED_EN, ADMIN_EN]);
    await user.press(screen.getByText('Retry'));

    expect(await screen.findByText('We received your application')).toBeTruthy();
  });

  it('lists every template with its subject preview', async () => {
    await render(<EmailTemplatesAdminScreen />);

    expect(await screen.findByText('We received your application')).toBeTruthy();
    expect(screen.getByText('Guest Application — Applicant Confirmation')).toBeTruthy();
    expect(screen.getByText('Guest Application — Admin Notification')).toBeTruthy();
    expect(screen.getByText('Disabled')).toBeTruthy();
  });

  it('edits and saves a template', async () => {
    const updated = { ...RECEIVED_EN, subject: 'Updated subject' };
    updateTemplate.mockResolvedValueOnce(updated);
    const user = userEvent.setup();
    await render(<EmailTemplatesAdminScreen />);
    await screen.findByText('We received your application');

    await user.press(screen.getByLabelText('Guest Application — Applicant Confirmation — English'));
    const subjectInput = screen.getByDisplayValue('We received your application');
    await user.clear(subjectInput);
    await user.type(subjectInput, 'Updated subject');
    await user.press(screen.getByText('Save'));

    expect(updateTemplate).toHaveBeenCalledWith('r-en', {
      subject: 'Updated subject',
      body: 'Thanks {{name}}!',
      enabled: true,
    });
    expect(await screen.findByText('Updated subject')).toBeTruthy();
  });

  it('blocks saving with an empty subject', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<EmailTemplatesAdminScreen />);
    await screen.findByText('We received your application');

    await user.press(screen.getByLabelText('Guest Application — Applicant Confirmation — English'));
    const subjectInput = screen.getByDisplayValue('We received your application');
    await user.clear(subjectInput);
    await user.press(screen.getByText('Save'));

    expect(alertSpy).toHaveBeenCalledWith('Error', 'Subject and body are required.', undefined);
    expect(updateTemplate).not.toHaveBeenCalled();
  });

  it('shows an error alert when saving fails', async () => {
    updateTemplate.mockRejectedValueOnce(new Error('offline'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<EmailTemplatesAdminScreen />);
    await screen.findByText('We received your application');

    await user.press(screen.getByLabelText('Guest Application — Applicant Confirmation — English'));
    await user.press(screen.getByText('Save'));

    expect(alertSpy).toHaveBeenCalledWith('Could not save the email template.', 'Try again.', undefined);
  });

  it('cancels out of the edit modal without saving', async () => {
    const user = userEvent.setup();
    await render(<EmailTemplatesAdminScreen />);
    await screen.findByText('We received your application');

    await user.press(screen.getByLabelText('Guest Application — Applicant Confirmation — English'));
    await user.press(screen.getByText('Cancel'));

    expect(updateTemplate).not.toHaveBeenCalled();
  });
});
