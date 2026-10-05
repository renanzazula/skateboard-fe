import { render, screen, userEvent } from '@testing-library/react-native';

import { StringListEditor } from '@/shared/components/StringListEditor';

describe('StringListEditor', () => {
  it('renders every value and adds a new one on submit', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <StringListEditor
        values={['https://a.example']}
        onChange={onChange}
        maxItems={3}
        placeholder="https://..."
        addLabel="Add link"
      />
    );

    expect(screen.getByText('https://a.example')).toBeTruthy();

    const input = screen.getByPlaceholderText('https://...');
    await user.type(input, 'https://b.example');
    await user.press(screen.getByLabelText('Add link'));

    expect(onChange).toHaveBeenCalledWith(['https://a.example', 'https://b.example']);
  });

  it('rejects an invalid entry and does not call onChange', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <StringListEditor
        values={[]}
        onChange={onChange}
        maxItems={3}
        placeholder="https://..."
        addLabel="Add link"
        validate={(value) => (value.startsWith('http') ? null : 'Invalid')}
      />
    );

    const input = screen.getByPlaceholderText('https://...');
    await user.type(input, 'not-a-link');
    await user.press(screen.getByLabelText('Add link'));

    expect(screen.getByText('Invalid')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a value when its remove button is pressed', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <StringListEditor
        values={['https://a.example', 'https://b.example']}
        onChange={onChange}
        maxItems={3}
        addLabel="Add link"
      />
    );

    await user.press(screen.getAllByLabelText('Remove')[0]);

    expect(onChange).toHaveBeenCalledWith(['https://b.example']);
  });

  it('hides the add row once maxItems is reached', async () => {
    await render(
      <StringListEditor
        values={['https://a.example']}
        onChange={jest.fn()}
        maxItems={1}
        placeholder="https://..."
        addLabel="Add link"
      />
    );

    expect(screen.queryByPlaceholderText('https://...')).toBeNull();
  });

  it('hides add/remove controls when disabled', async () => {
    await render(
      <StringListEditor
        values={['https://a.example']}
        onChange={jest.fn()}
        maxItems={3}
        placeholder="https://..."
        addLabel="Add link"
        disabled
      />
    );

    expect(screen.queryByPlaceholderText('https://...')).toBeNull();
    expect(screen.queryByLabelText('Remove')).toBeNull();
  });

  it('ignores a blank entry', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <StringListEditor values={[]} onChange={onChange} maxItems={3} placeholder="https://..." addLabel="Add link" />
    );

    await user.press(screen.getByLabelText('Add link'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
