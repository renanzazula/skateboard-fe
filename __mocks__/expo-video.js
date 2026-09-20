// expo-video's VideoPlayer class extends a native TurboModule base class that
// doesn't exist under Jest, so importing it at all throws ("Cannot read
// properties of undefined (reading 'prototype')") before any test code runs.
// Jest auto-applies this file for every 'expo-video' import, same idea as
// __mocks__/react-native-reanimated.js.
const React = require('react');
const { View } = require('react-native');

function useVideoPlayer(source, setup) {
  const player = {
    play: () => {},
    pause: () => {},
    replace: () => {},
    seekBy: () => {},
    release: () => {},
    addListener: () => ({ remove: () => {} }),
    removeListener: () => {},
    currentTime: 0,
    duration: 0,
    playing: false,
    muted: false,
    loop: false,
    volume: 1,
    status: 'idle',
  };
  if (typeof setup === 'function') setup(player);
  return player;
}

const VideoView = React.forwardRef(function VideoView(props, ref) {
  return React.createElement(View, { ...props, ref, testID: props.testID ?? 'expo-video-view' });
});

module.exports = {
  __esModule: true,
  useVideoPlayer,
  VideoView,
  VideoPlayer: class VideoPlayer {},
};
