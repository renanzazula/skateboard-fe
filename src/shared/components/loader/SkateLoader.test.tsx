import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { SkateLoader } from '@/shared/components/loader';

describe('SkateLoader', () => {
  it('announces itself as a busy progressbar with the generic loading label', async () => {
    await render(<SkateLoader />);
    const loader = screen.getByTestId('skate-loader');
    expect(loader.props.accessibilityRole).toBe('progressbar');
    expect(loader.props.accessibilityLabel).toBe('Loading...');
    expect(loader.props.accessibilityState).toEqual({ busy: true });
  });

  it('renders the four orbiting illustrations', async () => {
    await render(<SkateLoader />);
    for (const kind of ['deck', 'barcelona', 'mic', 'pin']) {
      expect(screen.getByTestId(`skate-loader-${kind}`)).toBeTruthy();
    }
  });

  it('fills its screen and centres itself when fullScreen, letting touches through', async () => {
    await render(<SkateLoader fullScreen />);
    const style = StyleSheet.flatten(screen.getByTestId('skate-loader').props.style);
    expect(style).toMatchObject({
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
    });
  });

  it('stays in the layout flow by default', async () => {
    await render(<SkateLoader />);
    const style = StyleSheet.flatten(screen.getByTestId('skate-loader').props.style);
    expect(style.position).toBeUndefined();
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
