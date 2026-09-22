import { Alert } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { InlineEditField } from '@/features/settings/components/InlineEditField';

describe('InlineEditField', () => {
  it('shows the label and value, entering edit mode on press', async () => {
    const user = userEvent.setup();
    await render(<InlineEditField label="Username" value="skater8" onSave={jest.fn()} />);

    expect(screen.getByText('Username')).toBeTruthy();
    expect(screen.getByText('skater8')).toBeTruthy();

    await user.press(screen.getByLabelText('Edit Username'));

    expect(screen.getByDisplayValue('skater8')).toBeTruthy();
  });

  it('shows the placeholder when value is empty', async () => {
    await render(<InlineEditField label="Bio" value="" placeholder="Add a bio" onSave={jest.fn()} />);

    expect(screen.getByText('Add a bio')).toBeTruthy();
  });

  it('cancel reverts the draft and exits edit mode without saving', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    await render(<InlineEditField label="Username" value="skater8" onSave={onSave} />);

    await user.press(screen.getByLabelText('Edit Username'));
    await user.clear(screen.getByDisplayValue('skater8'));
    await user.type(screen.getByDisplayValue(''), 'newname');
    await user.press(screen.getByText('Cancel'));

    expect(screen.getByText('skater8')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('exits edit mode without saving when the trimmed draft is empty', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    await render(<InlineEditField label="Username" value="skater8" onSave={onSave} />);

    await user.press(screen.getByLabelText('Edit Username'));
    await user.clear(screen.getByDisplayValue('skater8'));
    await user.type(screen.getByDisplayValue(''), '   ');
    await user.press(screen.getByText('Save'));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('skater8')).toBeTruthy();
  });

  it('exits edit mode without calling onSave when the draft is unchanged', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    await render(<InlineEditField label="Username" value="skater8" onSave={onSave} />);

    await user.press(screen.getByLabelText('Edit Username'));
    await user.press(screen.getByText('Save'));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves a changed value and returns to the resting state', async () => {
    const onSave = jest.fn().mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await render(<InlineEditField label="Username" value="skater8" onSave={onSave} />);

    await user.press(screen.getByLabelText('Edit Username'));
    await user.clear(screen.getByDisplayValue('skater8'));
    await user.type(screen.getByDisplayValue(''), 'newname');
    await user.press(screen.getByText('Save'));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('newname'));
    // The component is controlled by `value`; it exits edit mode but relies
    // on the parent to re-render with the new value, which this test's
    // static prop never does — so the resting label still reads "skater8".
    expect(await screen.findByLabelText('Edit Username')).toBeTruthy();
    expect(screen.queryByDisplayValue('newname')).toBeNull();
  });

  it('shows an error alert and stays in edit mode when saving fails', async () => {
    const onSave = jest.fn().mockRejectedValueOnce(new Error('taken'));
    const alertSpy = jest.spyOn(Alert, 'alert');
    const user = userEvent.setup();
    await render(<InlineEditField label="Username" value="skater8" onSave={onSave} />);

    await user.press(screen.getByLabelText('Edit Username'));
    await user.clear(screen.getByDisplayValue('skater8'));
    await user.type(screen.getByDisplayValue(''), 'newname');
    await user.press(screen.getByText('Save'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Could not save', 'taken', undefined));
    expect(screen.getByDisplayValue('newname')).toBeTruthy();
  });
});
