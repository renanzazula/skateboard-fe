import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { View } from 'react-native';
test('rngh import works', () => {
  const g = Gesture.Pan();
  expect(g).toBeTruthy();
});
