// SafeAreaView/useSafeAreaInsets need a <SafeAreaProvider> ancestor at
// runtime; every screen test would otherwise have to wrap its tree in one
// just to get past this. The library ships its own jest mock for exactly
// this reason — see react-native-safe-area-context/jest/mock.tsx.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// userEvent.setup()'s per-keystroke/press timers are real timers by default,
// so a couple of `user.type()` calls in one test can outrun Jest's 5s default.
jest.setTimeout(20000);
