import { render, screen, userEvent } from '@testing-library/react-native';

import { TextField } from '@/shared/components/TextField';
import { Colors } from '@/shared/constants/theme';

describe('TextField', () => {
  it('renders a label when given and omits it otherwise', async () => {
    await render(<TextField label="Username" placeholder="username" />);
    expect(screen.getByText('Username')).toBeTruthy();

    screen.unmount();
    await render(<TextField placeholder="no label field" />);
    expect(screen.queryByText('Username')).toBeNull();
  });

  it('shows an error message and a destructive border when error is set', async () => {
    await render(<TextField label="Email" placeholder="email" error="Invalid email" />);

    expect(screen.getByText('Invalid email')).toBeTruthy();
    const input = screen.getByPlaceholderText('email');
    const flatStyle = [input.props.style].flat(Infinity);
    expect(flatStyle).toEqual(expect.arrayContaining([expect.objectContaining({ borderColor: Colors.destructive })]));
  });

  it('forwards TextInput props like value/onChangeText', async () => {
    const onChangeText = jest.fn();
    const user = userEvent.setup();
    await render(<TextField placeholder="type here" value="" onChangeText={onChangeText} />);

    await user.type(screen.getByPlaceholderText('type here'), 'hi');
    expect(onChangeText).toHaveBeenCalled();
  });
});
