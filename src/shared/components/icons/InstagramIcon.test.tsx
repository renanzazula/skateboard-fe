import { render } from '@testing-library/react-native';

import { InstagramIcon } from '@/shared/components/icons/InstagramIcon';

describe('InstagramIcon', () => {
  it('renders at the default size/color', async () => {
    const view = await render(<InstagramIcon />);
    expect(view.toJSON()).toBeTruthy();
  });

  it('renders with a custom size/color', async () => {
    const view = await render(<InstagramIcon size={24} color="#fff" />);
    expect(view.toJSON()).toBeTruthy();
  });
});
