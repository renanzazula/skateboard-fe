import { render, screen } from '@testing-library/react-native';

import { Badge } from '@/shared/components/Badge';

describe('Badge', () => {
  it('renders the label text', async () => {
    await render(<Badge label="NEW" />);

    expect(screen.getByText('NEW')).toBeTruthy();
  });

  it('merges a custom style with the default badge style', async () => {
    await render(<Badge label="LIVE" style={{ marginLeft: 4 }} />);

    const text = screen.getByText('LIVE');
    const flatStyle = [text.props.style].flat(Infinity);
    expect(flatStyle).toEqual(expect.arrayContaining([expect.objectContaining({ marginLeft: 4 })]));
  });
});
