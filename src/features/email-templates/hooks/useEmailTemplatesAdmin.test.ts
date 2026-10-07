import { renderHook, waitFor } from '@testing-library/react-native';

import { bffClient } from '@/core/api/client';
import { useEmailTemplatesAdmin } from '@/features/email-templates/hooks/useEmailTemplatesAdmin';

jest.mock('@/core/api/client', () => ({
  bffClient: { GET: jest.fn(), PUT: jest.fn() },
}));

const mockGet = bffClient.GET as jest.Mock;
const mockPut = bffClient.PUT as jest.Mock;

const TEMPLATE = {
  id: '11111111-1111-1111-1111-111111111111',
  type: 'GUEST_APPLICATION_RECEIVED',
  language: 'en',
  subject: 'Subject',
  body: 'Body {{name}}',
  enabled: true,
};

describe('useEmailTemplatesAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listTemplates returns the templates', async () => {
    mockGet.mockResolvedValueOnce({ data: [TEMPLATE], error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useEmailTemplatesAdmin());

    const templates = await result.current.listTemplates();

    expect(templates).toEqual([TEMPLATE]);
    expect(mockGet).toHaveBeenCalledWith('/api/email-templates');
  });

  it('listTemplates throws a BffError on failure', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'forbidden' }, response: { status: 403 } });
    const { result } = await renderHook(() => useEmailTemplatesAdmin());

    await expect(result.current.listTemplates()).rejects.toThrow('forbidden');
  });

  it('updateTemplate puts the input by id and returns the saved template', async () => {
    const input = { subject: 'New subject', body: 'New body', enabled: false };
    const updated = { ...TEMPLATE, ...input };
    mockPut.mockResolvedValueOnce({ data: updated, error: undefined, response: { status: 200 } });
    const { result } = await renderHook(() => useEmailTemplatesAdmin());

    const saved = await result.current.updateTemplate(TEMPLATE.id, input);

    expect(saved).toEqual(updated);
    expect(mockPut).toHaveBeenCalledWith('/api/email-templates/{id}', {
      params: { path: { id: TEMPLATE.id } },
      body: input,
    });
  });

  it('updateTemplate throws a BffError on failure', async () => {
    mockPut.mockResolvedValueOnce({ data: undefined, error: { code: 'X', message: 'bad' }, response: { status: 400 } });
    const { result } = await renderHook(() => useEmailTemplatesAdmin());

    await expect(
      result.current.updateTemplate(TEMPLATE.id, { subject: 'S', body: 'B', enabled: true })
    ).rejects.toThrow('bad');
  });

  it('toggles submitting around a call', async () => {
    let resolveFn: (value: unknown) => void = () => {};
    mockGet.mockReturnValueOnce(new Promise((resolve) => (resolveFn = resolve)));
    const { result } = await renderHook(() => useEmailTemplatesAdmin());

    expect(result.current.submitting).toBe(false);
    const promise = result.current.listTemplates();
    await waitFor(() => expect(result.current.submitting).toBe(true));

    resolveFn({ data: [TEMPLATE], error: undefined, response: { status: 200 } });
    await promise;
    await waitFor(() => expect(result.current.submitting).toBe(false));
  });
});
