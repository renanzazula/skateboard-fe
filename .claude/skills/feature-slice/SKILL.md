---
name: feature-slice
description: >-
  How to add or extend a feature in skateboard-fe (Expo / React Native / Expo
  Router). Use when building a new screen, feature folder, BFF-backed data flow,
  admin/role-gated area, or wiring a feature into Settings or the tab bar.
  Covers the feature-slice layout, the generated BFF client, i18n across
  en/es/pt, role gating, dark-only theming, and the jest test boundary.
---

# Building a feature in skateboard-fe

This app is the mobile/web frontend for the Skateboard platform. It talks only
to the BFF (`skateboard-ui-backend`), never to domain services. Architecture
rationale lives in `README-skateboard-fe.md`; how to run it against real
backends is in `DEVELOPMENT.md`.

## Before writing code

- **Expo is pinned to SDK 57.** Per `AGENTS.md`, check the versioned docs at
  <https://docs.expo.dev/versions/v57.0.0/> before using any Expo / Expo Router
  API — do not rely on memory of older SDKs.
- Imports use the `@/` alias for `src/` (`@/features/...`, `@/core/...`,
  `@/shared/...`). See `tsconfig.json`.
- The app is **dark-only by design** (`.docs/README-skateboard-dark-ux-design.md`,
  `app.json` pins `userInterfaceStyle: "dark"`). Never add a light palette or a
  `useColorScheme` branch. Pull every colour from `useTheme()` /
  `@/shared/constants/theme`; no hardcoded hex outside `theme.ts` (brand-icon
  colours and text-over-image white are the only sanctioned exceptions).

## Feature-slice layout

Each feature is a folder under `src/features/<name>/` — feature-oriented, not
global buckets. Follow the shape the existing slices use (`about/`, `campaign/`,
`podcast/`, `branding/`, `home/`):

```
src/features/<name>/
  types.ts            # types derived from the generated BFF schema + normalizers
  api/<verb><Thing>.ts # thin one-call functions against bffClient (optional; hooks may call bffClient directly)
  hooks/use<Thing>.ts  # data loading / mutation hooks, own the loading+error state
  components/*.tsx      # presentational components for this feature
  admin/               # admin-only sub-tree, when the feature has a management UI
    components/*.tsx
    hooks/*.ts
  index.ts             # re-export only what other features/app routes consume
```

Screens live in `src/app/` (Expo Router file routes), not in the feature
folder — the feature folder holds everything the screen composes.

## Talking to the BFF

- Use the shared client: `import { bffClient } from '@/core/api/client'`. It
  attaches the bearer token and handles 401 refresh/retry — never build an
  `Authorization` header in feature code.
- Types come from the generated OpenAPI schema. Do **not** hand-write request /
  response shapes and do **not** edit `src/core/api/generated/schema.ts`:

  ```ts
  import type { components } from '@/core/api/generated/schema';
  export type Thing = components['schemas']['ThingResponse'];
  ```

  When the BFF contract changes: re-copy `api/bff-openapi.yaml` from
  `skateboard-ui-backend/api/openapi.yaml` by hand, then `npm run generate:api`.
- `bffClient.GET(...)` returns `{ data, error, response }`. On a truthy `error`,
  convert with `toBffError(error, response.status)` from `@/shared/api/errors`
  so callers catch one `BffError` type. Use `isBffError(err)` before reading
  `err.message`; fall back to a translated generic string otherwise.
- Handle `204` explicitly where "nothing published yet" is a valid state — map
  it to `null`/empty, not an error (see `features/about/hooks/useAboutPage.ts`).
- Image / multipart uploads: build a `FormData` and use `appendImageFile` from
  `@/shared/api/formDataImage` — web and native need different file-part shapes.

### Hook shape

Loader hooks own `{ data, loading, error, refetch }` with a `useCallback` `load`
run from `useEffect`. Mutation hooks expose `{ submitting, <action>() }` and
`throw` a `BffError` for the screen to catch. Match
`features/about/hooks/useAboutPage.ts` (loader) and
`features/about/hooks/useAboutAdmin.ts` (mutations).

## Screens & routing

- Add the route file under `src/app/(tabs)/...` (or `src/app/(auth)/...`).
  Settings sub-screens go in `src/app/(tabs)/settings/` and **must** be
  registered as a `<Stack.Screen name="..." />` in
  `src/app/(tabs)/settings/_layout.tsx`.
- Settings screens hide the native header and render `SettingsHeader`
  themselves. Link to a new screen from the relevant Settings list with a
  `SettingsRow` (`onPress={() => router.push('/settings/<route>')}`).
- The default export is the screen component. It reads `useTheme()`,
  `useTranslation()`, and its feature hook, and renders through `ThemedView`.
- Auth/tab routing is decided in `src/app/_layout.tsx` via `<Stack.Protected>`.
  New top-level provider wiring goes there, inside the existing provider nest
  (`AppConfigProvider > I18nProvider > AuthProvider`).

## Role gating (UX only)

Frontend role checks are for hiding UI, never a security boundary — the BFF
enforces authorization independently.

```ts
const { hasAuthority } = useAuth();           // from '@/core/auth'
const canManage = hasAuthority('FUNC_<AREA>_MANAGE');
if (!canManage) return <Redirect href="/settings" />;
```

Authority strings are `FUNC_*` (e.g. `FUNC_ABOUT_US_MANAGE`,
`FUNC_CAMPAIGN_PUBLISH`, `FUNC_TAB_SETTINGS`). Admin management rows in
`src/app/(tabs)/settings/administration.tsx` are each wrapped in their own
`hasAuthority(...)` check, and the screen redirects out if the user holds none
of them. Add new admin screens the same way. Test users and their roles are in
`DEVELOPMENT.md` (`admin@example.com` / `user@example.com`).

## i18n — all three locales, always

User-facing strings go through `useTranslation()`:

```ts
const { t } = useTranslation();
t('admin.aboutUs.title')
t('podcast.recordedOn', { date })   // {token} interpolation
```

`src/shared/locales/en.ts` is the **source locale** and its exported object is
typed `TranslationKeys`. `es.ts` and `pt.ts` are typed as `TranslationKeys`, so
**adding a key to `en.ts` without adding it to `es.ts` and `pt.ts` is a compile
error** — add the key to all three files in the same change. Keys are nested by
area (`common`, `settings`, `admin`, `campaign`, ...). Given the show is
Brazilian, get the `pt` copy right, not just a placeholder.

Note: `shared/locales/` (the live app strings, EN/ES/PT) is distinct from
`core/i18n/` (the language store / picker wiring).

## Theming

```ts
const theme = useTheme();   // from '@/shared/hooks/use-theme' — Record<ThemeColor, string>
// theme.background, theme.surface, theme.primary, theme.textPrimary, theme.textSecondary,
// theme.border, theme.destructive, theme.success ...
```

Spacing / radii / fonts: `Spacing`, `RADII`, `Fonts`, `DisplayFontFamily`,
`MAX_FORM_WIDTH`, `MAX_CONTENT_WIDTH` from `@/shared/constants/theme`. Reuse
`@/shared/components/*` (`PrimaryButton`, `SecondaryButton`, `TextField`,
`ErrorBanner`, `EmptyState`, `ThemedView`, `ThemedText`, `AppHeader`, ...)
before building new primitives.

## Tests

Jest runs **only `src/**/*.test.ts`** (not `.tsx`) — see `jest.config.js`.
Component/native-renderer tests are deliberately not wired up. Keep testable
logic (resolvers, date/frequency math, matching, cache freshness) in plain
`.ts` modules with **no `react-native` imports** so it runs under the bare
`jest-expo` transform, and co-locate `<module>.test.ts` beside it. Examples:
`features/campaign/dates.test.ts`, `resolver/resolveCampaign.test.ts`.

Run: `npm test`. Lint: `npm run lint`.

## Checklist for a new feature

1. Read the relevant `.docs/*.md` brief if one exists; check Expo v57 docs for
   any Expo API you'll touch.
2. If the BFF contract is new/changed: update `api/bff-openapi.yaml`, run
   `npm run generate:api`.
3. Create `src/features/<name>/` with `types.ts` (schema-derived), `hooks/`,
   `components/`, and `index.ts`.
4. Add the screen(s) under `src/app/...`; register Settings screens in
   `settings/_layout.tsx`; add the entry `SettingsRow`.
5. Gate admin screens with `hasAuthority('FUNC_...')` + `<Redirect>`.
6. Add every new string key to `en.ts`, `es.ts`, **and** `pt.ts`.
7. Use `useTheme()` / shared components; no new colours.
8. Add `.test.ts` for any non-trivial pure logic.
9. `npm run lint && npm test`.
