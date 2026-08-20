// Learn more https://docs.expo.dev/router/reference/static-rendering/#root-html

import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {

  // This is only required for server-side rendering.
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/*
          Favicons — served from public/ (stable root-relative URLs, not
          Metro's hashed asset paths) so a plain <link href="/..."> resolves.
          public/favicon.ico also overrides Expo's auto-generated favicon
          (from web.favicon in app.json), which only covers 16/32/48px.
        */}
        <link rel="icon" type="image/png" sizes="16x16" href="/genfavicon-16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/genfavicon-32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/genfavicon-48.png" />
        <link rel="icon" type="image/png" sizes="64x64" href="/genfavicon-64.png" />
        <link rel="icon" type="image/png" sizes="128x128" href="/genfavicon-128.png" />
        <link rel="icon" type="image/png" sizes="256x256" href="/genfavicon-256.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/genfavicon-512.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="57x57" href="/apple-touch-icon-57x57.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/apple-touch-icon-114x114.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {headNodes}

        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
