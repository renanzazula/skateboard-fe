// react-native-youtube-iframe renders a WebView-backed player that needs a
// real native host; under Jest it's swapped for a plain View so components
// embedding it (BlockRenderer) can render without touching native code.
const React = require('react');
const { View } = require('react-native');

const YoutubePlayer = React.forwardRef(function YoutubePlayer(props, ref) {
  return React.createElement(View, { ...props, ref, testID: props.testID ?? 'youtube-player' });
});

module.exports = {
  __esModule: true,
  default: YoutubePlayer,
};
