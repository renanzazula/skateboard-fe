// react-native-reanimated (and the react-native-worklets package it now
// delegates to) register a real native module on import, which doesn't
// exist under Jest — even the library's own mock.js pulls in its real
// index.ts internally and hits the same native bootstrap. Jest auto-applies
// any file placed at __mocks__/<node_module_name>.js, so every consumer of
// 'react-native-reanimated' gets this instead, no per-test jest.mock() needed.
const { View, Text, Image, ScrollView } = require('react-native');

const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  createAnimatedComponent: (Component) => Component,
};

module.exports = {
  __esModule: true,
  default: Animated,
  Easing: {
    linear: (t) => t,
    ease: (t) => t,
    in: (fn) => fn,
    out: (fn) => fn,
    inOut: (fn) => fn,
    bezier: () => (t) => t,
  },
  Keyframe: class Keyframe {
    duration() {
      return this;
    }
    delay() {
      return this;
    }
  },
  useAnimatedStyle: (factory) => (typeof factory === 'function' ? factory() : {}),
  useSharedValue: (initial) => ({ value: initial }),
  withRepeat: (animation) => animation,
  withTiming: (toValue) => toValue,
  withSpring: (toValue) => toValue,
  runOnJS:
    (fn) =>
    (...args) =>
      fn(...args),
  cancelAnimation: () => {},
};
