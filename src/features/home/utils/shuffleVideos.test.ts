import { shuffleVideos } from '@/features/home/utils/shuffleVideos';

describe('shuffleVideos', () => {
  it('returns a new array with the same items', () => {
    const items = [1, 2, 3, 4, 5];
    const result = shuffleVideos(items);

    expect(result).not.toBe(items);
    expect(result.slice().sort()).toEqual(items.slice().sort());
  });

  it('does not mutate the input array', () => {
    const items = [1, 2, 3];
    const copy = [...items];
    shuffleVideos(items);
    expect(items).toEqual(copy);
  });

  it('handles an empty array', () => {
    expect(shuffleVideos([])).toEqual([]);
  });

  it('handles a single-item array', () => {
    expect(shuffleVideos([1])).toEqual([1]);
  });
});
