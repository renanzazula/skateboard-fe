import { Platform } from 'react-native';
import { act, render, screen, userEvent, fireEvent } from '@testing-library/react-native';

import { DateTimeField } from '@/shared/components/DateTimeField';

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: { testID?: string; mode?: string; onChange: (...args: unknown[]) => void }) => (
      <View testID={props.testID ?? `datetimepicker-${props.mode}`} {...props} />
    ),
  };
});

const VALUE = '2024-03-10T12:30:00.000Z';

// The render tree exposed by @testing-library/react-native's `render()` here
// has no UNSAFE_getByProps/getByType (this RNTL version's `screen` singleton
// only carries the standard text/role/testID queries) — walking the raw JSON
// tree is the simplest way to reach a node (the web <input>, or a callback
// prop like onLayout) that isn't reachable by text/role/testID.
type JsonNode = { type: string; props: Record<string, any>; children: JsonNode[] | string[] | null };

function findNode(node: JsonNode | JsonNode[] | string | null, predicate: (n: JsonNode) => boolean): JsonNode | null {
  if (!node) return null;
  const nodes = Array.isArray(node) ? node : [node];
  for (const n of nodes) {
    if (typeof n === 'string') continue;
    if (predicate(n)) return n;
    const found = findNode(n.children as JsonNode[] | null, predicate);
    if (found) return found;
  }
  return null;
}

describe('DateTimeField', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  describe('on web', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    });

    it('renders a datetime-local input reflecting the value', async () => {
      const onChange = jest.fn();
      const view = await render(<DateTimeField value={VALUE} onChange={onChange} />);

      const input = findNode(view.toJSON(), (n) => n.type === 'input');
      expect(input?.props.value).toContain('2024-03-10T');
      expect(input?.props.type).toBe('datetime-local');
    });

    it('calls onChange with an ISO string when the input changes', async () => {
      const onChange = jest.fn();
      const view = await render(<DateTimeField value={VALUE} onChange={onChange} />);

      const input = findNode(view.toJSON(), (n) => n.type === 'input')!;
      await act(async () => {
        input.props.onChange({ target: { value: '2024-05-01T08:00' } });
      });

      expect(onChange).toHaveBeenCalledWith(expect.stringContaining('2024-05-01'));
    });

    it('ignores an unparsable input value', async () => {
      const onChange = jest.fn();
      const view = await render(<DateTimeField value={VALUE} onChange={onChange} />);

      const input = findNode(view.toJSON(), (n) => n.type === 'input')!;
      await act(async () => {
        input.props.onChange({ target: { value: 'not-a-date' } });
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('falls back to the current date when the value prop is unparsable', async () => {
      const onChange = jest.fn();
      const view = await render(<DateTimeField value="not-a-date" onChange={onChange} />);

      const input = findNode(view.toJSON(), (n) => n.type === 'input');
      expect(input).toBeTruthy();
    });
  });

  describe('on iOS', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    });

    it('renders a single inline datetime picker and forwards changes as ISO strings', async () => {
      const onChange = jest.fn();
      await render(<DateTimeField value={VALUE} onChange={onChange} />);

      const picker = screen.getByTestId('datetimepicker-datetime');
      const next = new Date('2024-06-01T00:00:00.000Z');
      await fireEvent(picker, 'onChange', { type: 'set' }, next);

      expect(onChange).toHaveBeenCalledWith(next.toISOString());
    });

    it('does not call onChange when no date is provided', async () => {
      const onChange = jest.fn();
      await render(<DateTimeField value={VALUE} onChange={onChange} />);

      const picker = screen.getByTestId('datetimepicker-datetime');
      await fireEvent(picker, 'onChange', { type: 'dismissed' }, undefined);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('on Android', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    });

    it('opens the date picker on press, then the time picker, merging both into one onChange call each', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();
      await render(<DateTimeField value={VALUE} onChange={onChange} />);

      // No picker visible until the pressable is tapped.
      expect(screen.queryByTestId('datetimepicker-date')).toBeNull();

      await user.press(screen.getByText(new Date(VALUE).toLocaleString()));

      const datePicker = screen.getByTestId('datetimepicker-date');
      const pickedDate = new Date('2024-07-15T00:00:00.000Z');
      await fireEvent(datePicker, 'onChange', { type: 'set' }, pickedDate);

      expect(onChange).toHaveBeenCalledTimes(1);
      const dateOnlyResult = new Date(onChange.mock.calls[0][0]);
      expect(dateOnlyResult.getUTCFullYear()).toBe(2024);
      expect(dateOnlyResult.getUTCMonth()).toBe(6); // July
      expect(dateOnlyResult.getUTCDate()).toBe(15);

      // After picking the date, the flow advances to the time step.
      const timePicker = screen.getByTestId('datetimepicker-time');
      const pickedTime = new Date('2000-01-01T09:45:00.000Z');
      await fireEvent(timePicker, 'onChange', { type: 'set' }, pickedTime);

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(screen.queryByTestId('datetimepicker-time')).toBeNull();
    });

    it('cancels the step and hides the picker when dismissed', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();
      await render(<DateTimeField value={VALUE} onChange={onChange} />);

      await user.press(screen.getByText(new Date(VALUE).toLocaleString()));
      const datePicker = screen.getByTestId('datetimepicker-date');
      await fireEvent(datePicker, 'onChange', { type: 'dismissed' }, undefined);

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByTestId('datetimepicker-date')).toBeNull();
    });
  });
});
