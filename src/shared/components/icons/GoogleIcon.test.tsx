import { render } from '@testing-library/react-native';

import { GoogleIcon } from '@/shared/components/icons/GoogleIcon';

describe('GoogleIcon', () => {
  it('renders at the default size', async () => {
    const view = await render(<GoogleIcon />);
    expect(view.toJSON()).toBeTruthy();
  });

  it('renders at a custom size', async () => {
    const view = await render(<GoogleIcon size={32} />);
    expect(view.toJSON()).toBeTruthy();
  });
});
