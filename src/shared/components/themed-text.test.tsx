import { render, screen } from '@testing-library/react-native';

import { ThemedText } from '@/shared/components/themed-text';
import { Colors } from '@/shared/constants/theme';

describe('ThemedText', () => {
  it('defaults to textPrimary color and the default type style', async () => {
    await render(<ThemedText>Hello</ThemedText>);

    const node = screen.getByText('Hello');
    const flatStyle = [node.props.style].flat(Infinity);
    expect(flatStyle).toEqual(expect.arrayContaining([expect.objectContaining({ color: Colors.textPrimary })]));
    expect(flatStyle).toEqual(expect.arrayContaining([expect.objectContaining({ fontSize: 16 })]));
  });

  it('defaults linkPrimary type to the primary color', async () => {
    await render(<ThemedText type="linkPrimary">Link</ThemedText>);

    const node = screen.getByText('Link');
    const flatStyle = [node.props.style].flat(Infinity);
    expect(flatStyle).toEqual(expect.arrayContaining([expect.objectContaining({ color: Colors.primary })]));
  });

  it('lets an explicit themeColor override the type default', async () => {
    await render(
      <ThemedText type="linkPrimary" themeColor="destructive">
        Danger link
      </ThemedText>
    );

    const node = screen.getByText('Danger link');
    const flatStyle = [node.props.style].flat(Infinity);
    expect(flatStyle).toEqual(expect.arrayContaining([expect.objectContaining({ color: Colors.destructive })]));
  });

  it.each(['title', 'small', 'smallBold', 'subtitle', 'link', 'code'] as const)(
    'renders the %s type without crashing',
    async (type) => {
      await render(<ThemedText type={type}>{type} text</ThemedText>);
      expect(screen.getByText(`${type} text`)).toBeTruthy();
    }
  );
});
