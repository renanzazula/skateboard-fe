import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { SkateLoader } from '@/shared/components/loader';
import { BURST_MS, CYCLE_MS, DIVE_MS } from '@/shared/components/loader/SkateLoader';

describe('SkateLoader', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('announces itself as a busy progressbar with the generic loading label', async () => {
    await render(<SkateLoader />);
    const loader = screen.getByTestId('skate-loader');
    expect(loader.props.accessibilityRole).toBe('progressbar');
    expect(loader.props.accessibilityLabel).toBe('Loading...');
    expect(loader.props.accessibilityState).toEqual({ busy: true });
  });

  it('opens on the brand icon in the spinning wheel, with Barcelona, the mic and the pin on the orbits', async () => {
    await render(<SkateLoader />);
    expect(screen.getByTestId('skate-loader-scene-brand')).toBeTruthy();
    expect(screen.getByTestId('skate-loader-tyre')).toBeTruthy();
    expect(screen.getByTestId('skate-loader-splash')).toBeTruthy();
    for (const object of ['barcelona', 'podcast', 'places']) {
      expect(screen.getByTestId(`skate-loader-orbit-${object}`)).toBeTruthy();
    }
  });

  it('keeps the hub image until the diving object lands in the splash', async () => {
    jest.useFakeTimers();
    await render(<SkateLoader />);
    await act(async () => {});
    await act(async () => {
      jest.advanceTimersByTime(CYCLE_MS + DIVE_MS);
    });
    expect(screen.getByTestId('skate-loader-scene-brand')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(BURST_MS);
    });
    expect(screen.getByTestId('skate-loader-scene-barcelona')).toBeTruthy();
  });

  it('cycles the hub through each orbit object, then back to the icon', async () => {
    jest.useFakeTimers();
    await render(<SkateLoader />);
    await act(async () => {});

    // The first object dives in CYCLE_MS in; step one cycle at a time after it.
    await act(async () => {
      jest.advanceTimersByTime(CYCLE_MS + DIVE_MS + BURST_MS);
    });
    const nextScene = async () => {
      await act(async () => {
        jest.advanceTimersByTime(CYCLE_MS);
      });
    };
    expect(screen.getByTestId('skate-loader-scene-barcelona')).toBeTruthy();
    await nextScene();
    expect(screen.getByTestId('skate-loader-scene-podcast')).toBeTruthy();
    await nextScene();
    expect(screen.getByTestId('skate-loader-scene-places')).toBeTruthy();
    await nextScene();
    expect(screen.getByTestId('skate-loader-scene-brand')).toBeTruthy();
  });

  it('holds still on the brand icon when reduce motion is on', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    jest.useFakeTimers();
    await render(<SkateLoader />);
    await act(async () => {});
    await act(async () => {
      jest.advanceTimersByTime(CYCLE_MS * 3);
    });
    expect(screen.getByTestId('skate-loader-scene-brand')).toBeTruthy();
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
});
