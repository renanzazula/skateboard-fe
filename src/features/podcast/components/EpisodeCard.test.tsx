import { act, render, screen, userEvent } from '@testing-library/react-native';

import { EpisodeCard } from '@/features/podcast/components/EpisodeCard';
import type { Post } from '@/shared/types/posts';

// screen's standard queries can't reach an <Image>'s source prop — see the
// same pattern (and its rationale) in DateTimeField.test.tsx.
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

const BASE_POST: Post = {
  id: 'p1',
  title: 'Big Air Session',
  publishAt: '2026-01-15T00:00:00Z',
  createdAt: '2026-01-14T00:00:00Z',
  coverUrl: 'https://x/cover.jpg',
  blocks: [],
  durationSeconds: 754,
} as unknown as Post;

describe('EpisodeCard', () => {
  it('renders the title, episode number, formatted date, and duration', async () => {
    await render(<EpisodeCard post={BASE_POST} episodeNumber={12} onPress={jest.fn()} />);

    expect(screen.getByText('Big Air Session')).toBeTruthy();
    expect(screen.getByText('EP #12')).toBeTruthy();
    expect(screen.getByText('January 15, 2026')).toBeTruthy();
    expect(screen.getByText('12:34')).toBeTruthy();
  });

  it('calls onPress with an accessible combined label', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<EpisodeCard post={BASE_POST} episodeNumber={12} onPress={onPress} />);

    await user.press(screen.getByLabelText('Big Air Session, episode 12'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('omits the duration when none can be determined', async () => {
    const post = { ...BASE_POST, durationSeconds: undefined };
    await render(<EpisodeCard post={post} episodeNumber={1} onPress={jest.fn()} />);

    expect(screen.queryByText('12:34')).toBeNull();
  });

  it('falls back to createdAt when publishAt is missing', async () => {
    const post = { ...BASE_POST, publishAt: undefined };
    await render(<EpisodeCard post={post} episodeNumber={1} onPress={jest.fn()} />);

    expect(screen.getByText('January 14, 2026')).toBeTruthy();
  });

  it('shows a placeholder icon when there is no cover and no derivable YouTube thumbnail', async () => {
    const post = { ...BASE_POST, coverUrl: undefined, youtubeVideoId: undefined, youtubeUrl: undefined };
    const { toJSON } = await render(<EpisodeCard post={post} episodeNumber={1} onPress={jest.fn()} />);

    expect(JSON.stringify(toJSON())).not.toContain('"type":"Image"');
  });

  it('falls back to the hqdefault thumbnail after the maxres thumbnail fails to load', async () => {
    const post = { ...BASE_POST, coverUrl: undefined, youtubeVideoId: 'abc12345678' };
    const view = await render(<EpisodeCard post={post} episodeNumber={1} onPress={jest.fn()} />);

    const image = findNode(view.toJSON(), (n) => n.type === 'Image')!;
    expect(image.props.source.uri).toContain('maxresdefault');

    await act(async () => image.props.onError());

    const updated = findNode(view.toJSON(), (n) => n.type === 'Image')!;
    expect(updated.props.source.uri).toContain('hqdefault');
  });
});
