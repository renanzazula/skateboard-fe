# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
This app is on Expo SDK 57 / React 19.2 / React Native 0.86 — assume defaults from
memory or older tutorials (e.g. `react-test-renderer` for testing, `babel.config.js`
being required) are wrong until you've checked the versioned docs or the code here.

## What this is

`skateboard-fe` is the mobile frontend (Expo + Expo Router) for the Skateboard
platform — a skateboarding content/podcast app. It is one repo in a multi-repo
system (siblings: `skateboard-ui-backend` the BFF, several domain microservices,
`skateboard-infrastructure` for local Keycloak/Postgres). **This app talks only
to `skateboard-ui-backend`, never to a domain microservice directly.**

`README-skateboard-fe.md` is the original architecture/planning doc — useful for
the *why*, but some of it is aspirational and doesn't match what's actually
built (e.g. it lists `features/{podcast,spots,events,profile,admin}` and
"OpenAPI Generator" typed wrapper calls like `podcastApi.getPodcastById(id)`;
the real feature set and API client are described below). `DEVELOPMENT.md` has
the actual run order against the real backend stack, push notification setup,
test users, and the auth redirect scheme — read it before trying to run this
against live services.

## Structure (current, verified against the code)

```
src/
├── app/        expo-router routes: (auth) = login, (tabs) = signed-in app, video/[slug]
├── core/       api (bffClient), auth, config, i18n, storage — cross-cutting, not UI
├── features/   about, account, branding, home, notifications, podcast, settings
└── shared/     api, components, constants, hooks, locales, types, utils
```

## State: module-level stores, not a state library

Global state (auth, app config, i18n language, the signed-in profile) each live
in a plain module-level store — `subscribe()`/`getState()`/`setState()` outside
React — read via `useSyncExternalStore`. See `core/auth/authStore.ts` as the
reference shape; `core/config/appConfigStore.ts`, `core/i18n/languageStore.ts`
and `features/account/hooks/useProfile.ts` all mirror it. Follow this pattern
for new cross-screen state instead of reaching for a state library or prop
drilling.

## Auth

Keycloak via `expo-auth-session`. Two flows, both in `core/auth/authStore.ts`:
- Username/password: Direct Access Grant (password grant) — requires
  `directAccessGrantsEnabled` on the Keycloak client.
- Google: real Authorization Code + PKCE with `kc_idp_hint=google`, since
  Direct Access Grant can't hand off to an external IdP.

Frontend role checks (`hasAuthority()`, decoded from the JWT's `authorities`
claim) are UX only — hiding a tab or button, nothing more. The BFF enforces
authorization for real; never trust the client-side check as a security
boundary.

## API

Only `bffClient` (`core/api/client.ts`, built on `openapi-fetch`) talks to the
network. Types are generated from a vendored copy of the BFF's own OpenAPI
contract: `api/bff-openapi.yaml` → `npm run generate:api` →
`src/core/api/generated/schema.ts`. Don't hand-edit the generated file, and
re-copy the yaml from `skateboard-ui-backend/api/openapi.yaml` by hand when
the BFF's contract changes (see `DEVELOPMENT.md`).

Images (branding assets, About Us content blocks) are presigned S3 URLs —
the backend stores only the bare object key and re-signs on every read. The FE
just renders whatever URL it's given; never try to persist or reuse one past
its request.

## i18n

Homegrown, not i18next — see `core/i18n/`, `shared/hooks/useTranslation.ts`.
Three locales: `en` (source of truth), `es`, `pt`. `shared/locales/{es,pt}.ts`
are typed against `en.ts`'s `TranslationKeys`, so a missing key fails `tsc`,
but their *content* is machine-drafted and needs native-speaker review before
release — don't treat es/pt copy as final.

## Testing

Jest + `jest-expo` + `@testing-library/react-native` 14, set up under
`jest.config.js` / `jest.setup.js`. Run with `npm test`. A few things that
aren't obvious if you're adding more tests:
- RNTL 14 uses React 19's `test-renderer` package, **not** the deprecated
  `react-test-renderer` — don't add the latter back as a dependency.
- `render()` and `userEvent` actions are async now (`await render(...)`,
  `await user.press(...)`) — a sync `render()` call fails with a cryptic
  "`render` function has not been called" from the next `screen.getBy...`.
- `react-native-reanimated` (and the separate `react-native-worklets`
  package it now delegates to) registers a real native module on import,
  which crashes under Jest. `__mocks__/react-native-reanimated.js` is a
  manual mock Jest auto-applies to every consumer — extend it if a component
  under test needs more of the Reanimated API than it currently stubs, rather
  than trying to mock reanimated per-test.
- `react-native-safe-area-context` needs a provider at runtime;
  `jest.setup.js` mocks the whole module with the library's own
  `react-native-safe-area-context/jest/mock` so `SafeAreaView`/
  `useSafeAreaInsets` work with no wrapper needed in individual tests.

## Startup / splash sequencing

`AnimatedSplashOverlay` (`shared/components/animated-icon.tsx`) must stay
**unconditionally mounted** in `app/_layout.tsx`, on top of the real
`<Stack>`, until app init (fonts, auth bootstrap, language) is ready — it
takes a `ready` prop that gates only its *exit* animation. If it's ever
changed back to `{ready && <AnimatedSplashOverlay />}`, the login/home screen
underneath — which mounts unconditionally from the first render — becomes
visible before the overlay does. See `.docs/README-app-startup-splash-improvement.md`
for the full symptom writeup if this regresses.

## App is dark-only

No light/dark mode toggle — `useTheme()` is a passthrough to a single
`Colors` token set. Don't add light-mode branching without a product
decision behind it.
