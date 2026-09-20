import { nextListKey } from '@/shared/utils/stableListKey';

describe('nextListKey', () => {
  it('returns a prefixed key that increments on every call, even across prefixes', () => {
    const a = nextListKey('block');
    const b = nextListKey('block');
    const c = nextListKey('link');

    expect(a).toMatch(/^block-\d+$/);
    expect(b).toMatch(/^block-\d+$/);
    expect(c).toMatch(/^link-\d+$/);
    expect(a).not.toBe(b);

    const aNum = Number(a.split('-')[1]);
    const bNum = Number(b.split('-')[1]);
    const cNum = Number(c.split('-')[1]);
    expect(bNum).toBe(aNum + 1);
    expect(cNum).toBe(bNum + 1);
  });
});
