import { render, screen, userEvent } from '@testing-library/react-native';

import { ChoiceChips } from '@/features/campaign/admin/components/ChoiceChips';

const OPTIONS = [
  { value: 'ALL', label: 'Everyone' },
  { value: 'AUTHENTICATED', label: 'Signed-in users' },
] as const;

describe('ChoiceChips', () => {
  it('renders the label, hint, and options, marking the selected one', async () => {
    await render(<ChoiceChips label="Audience" hint="Who sees this" value="ALL" options={OPTIONS} onChange={jest.fn()} />);

    expect(screen.getByText('Audience')).toBeTruthy();
    expect(screen.getByText('Who sees this')).toBeTruthy();
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].props.accessibilityState).toEqual({ selected: true });
    expect(buttons[1].props.accessibilityState).toEqual({ selected: false });
  });

  it('omits the hint when none is given', async () => {
    await render(<ChoiceChips label="Audience" value="ALL" options={OPTIONS} onChange={jest.fn()} />);

    expect(screen.queryByText('Who sees this')).toBeNull();
  });

  it('calls onChange with the pressed option value', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<ChoiceChips label="Audience" value="ALL" options={OPTIONS} onChange={onChange} />);

    await user.press(screen.getByText('Signed-in users'));

    expect(onChange).toHaveBeenCalledWith('AUTHENTICATED');
  });
});
