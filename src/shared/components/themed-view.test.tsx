import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ThemedView } from '@/shared/components/themed-view';
import { Colors } from '@/shared/constants/theme';

describe('ThemedView', () => {
  it('defaults to the background color token', async () => {
    await render(
      <ThemedView testID="view">
        <Text>child</Text>
      </ThemedView>
    );

    const view = screen.getByTestId('view');
    const flatStyle = [view.props.style].flat(Infinity);
    expect(flatStyle).toEqual(expect.arrayContaining([expect.objectContaining({ backgroundColor: Colors.background })]));
  });

  it('uses the given theme token for its background', async () => {
    await render(<ThemedView testID="surface-view" type="surface" />);

    const view = screen.getByTestId('surface-view');
    const flatStyle = [view.props.style].flat(Infinity);
    expect(flatStyle).toEqual(expect.arrayContaining([expect.objectContaining({ backgroundColor: Colors.surface })]));
  });

  it('merges a passed-in style with the resolved background', async () => {
    await render(<ThemedView testID="styled-view" style={{ padding: 10 }} />);

    const view = screen.getByTestId('styled-view');
    const flatStyle = [view.props.style].flat(Infinity);
    expect(flatStyle).toEqual(expect.arrayContaining([expect.objectContaining({ padding: 10 })]));
  });
});
