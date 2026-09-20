// react-native-webview's native module (RNCWebViewModule) isn't registered
// under Jest, so importing it throws before any test code runs. Jest
// auto-applies this file for every 'react-native-webview' import.
const React = require('react');
const { View } = require('react-native');

const WebView = React.forwardRef(function WebView(props, ref) {
  return React.createElement(View, { ...props, ref, testID: props.testID ?? 'react-native-webview' });
});

module.exports = {
  __esModule: true,
  default: WebView,
  WebView,
};
