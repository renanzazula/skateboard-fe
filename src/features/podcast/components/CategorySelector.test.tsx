import { render, screen, userEvent } from '@testing-library/react-native';

import { CategorySelector } from '@/features/podcast/components/CategorySelector';
import type { Category } from '@/shared/types/category';

const CATEGORIES: Category[] = [
  { id: 'c1', name: 'Skateboarding', slug: 'skateboarding' } as Category,
  { id: 'c2', name: 'Interviews', slug: 'interviews' } as Category,
];

describe('CategorySelector', () => {
  it('renders nothing when there are no categories', async () => {
    const { toJSON } = await render(<CategorySelector categories={[]} selectedSlug={undefined} onSelect={jest.fn()} />);

    expect(toJSON()).toBeNull();
  });

  it('renders each category and marks the selected one', async () => {
    await render(<CategorySelector categories={CATEGORIES} selectedSlug="interviews" onSelect={jest.fn()} />);

    expect(screen.getByText('Skateboarding')).toBeTruthy();
    expect(screen.getByText('Interviews')).toBeTruthy();
  });

  it('calls onSelect with the pressed category', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await render(<CategorySelector categories={CATEGORIES} selectedSlug={undefined} onSelect={onSelect} />);

    await user.press(screen.getByText('Interviews'));

    expect(onSelect).toHaveBeenCalledWith(CATEGORIES[1]);
  });
});
