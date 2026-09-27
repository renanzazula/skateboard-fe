import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { SkateLoader } from '@/shared/components/loader';

describe('SkateLoader', () => {
  it('announces itself as a busy progressbar with the generic loading label', async () => {
    await render(<SkateLoader />);
    const loader = screen.getByTestId('skate-loader');
    expect(loader.props.accessibilityRole).toBe('progressbar');
    expect(loader.props.accessibilityLabel).toBe('Loading...');
    expect(loader.props.accessibilityState).toEqual({ busy: true });
  });

  it('shows and announces a custom label', async () => {
    await render(<SkateLoader label="Dropping in…" size={64} />);
    expect(screen.getByText('Dropping in…')).toBeTruthy();
    expect(screen.getByTestId('skate-loader').props.accessibilityLabel).toBe('Dropping in…');
  });

  it('renders statically when reduce motion is on', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const view = await render(<SkateLoader />);
    expect(view.toJSON()).toBeTruthy();
    await view.unmount();
  });
});
