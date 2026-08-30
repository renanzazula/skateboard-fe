# Appearance and language in Settings

Answering "do we have a theme setting?" — **no** — plus a plan to add one, and
a finding about the language setting that is more urgent than the theme.

---

## 1. Theme: not implemented, anywhere

No theme control exists. Searching the whole of `src/` for `Appearance`,
`colorScheme` or `useColorScheme` returns **zero** matches, and
`useLocalSettings` stores only language, Wi-Fi-only downloads and cache size.

The app is dark-only on purpose. `shared/constants/theme.ts` says so, and
`useTheme()` is a bare passthrough:

```ts
export function useTheme(): Record<ThemeColor, string> {
  return Colors;
}
```

`app.json` also pins the native side with `"userInterfaceStyle": "dark"`.

## 2. Language: the control exists and does nothing

More pressing than the theme. Settings has a working Language picker —
English / Español / Português — and `useLocalSettings` persists the choice.
But:

```ts
// shared/hooks/useTranslation.ts
const language = 'en' as const;
```

```ts
// shared/locales/index.ts
export type Language = 'en';
export const translations: Record<Language, TranslationKeys> = { en };
```

There is no `es.ts` and no `pt.ts`. **A user picks Português, the app stores
it, the row updates to say "Português" — and not one word changes.** Both files
carry comments admitting the gap ("no language-switcher exists in this app
yet"), written before the picker was built; the picker arrived and the wiring
never followed.

That is worse than having no picker at all: a setting that appears to work and
silently doesn't. Translations are being added on another branch — see §5.

---

## 3. Why a light theme is cheaper than it looks

The codebase is disciplined about tokens. Outside `theme.ts` there are only
**eight** hardcoded colours, in five files, and most should never change:

| Location | Colour | Verdict |
|---|---|---|
| `icons/GoogleIcon.tsx` | 4 brand colours | Must not change |
| `PodcastEpisodeDetail.tsx` | `#FFFFFF` on imagery | Correct as-is — text over a scrim stays white |
| `EpisodeCard.tsx` | `#FFFFFF` on imagery | Same |
| `EditableAvatar.tsx` | `#FFFFFF` spinner | On a dark scrim; fine |
| `animated-icon.tsx` | `#080808` | The only real one to tokenise |

So the work is a palette plus one hook — not a sweep through every screen.

## 4. Plan

**Phase 1 — make the theme selectable (frontend only)**

1. **A light palette.** ~30 tokens mirroring `Colors`. The accent needs care:
   `#F5C518` on white fails contrast for text, so light mode needs a darker
   accent for text and links while keeping the yellow for fills.
2. **`useTheme()` becomes reactive.** Read a stored preference — `system` /
   `light` / `dark` — and fall back to React Native's `useColorScheme()` when
   `system`. Every screen already calls `useTheme()`, so nothing else changes.
3. **Persist it** in `useLocalSettings`, beside language, with the same
   `secureStorage` shape.
4. **Settings UI.** An **Appearance** section above Language, with a row per
   option and a check on the active one — the same treatment the Language
   picker uses.
5. **`app.json`**: `"userInterfaceStyle": "automatic"`, or native surfaces
   (keyboard, status bar) stay dark under a light app.
6. **Audit the literals** in the table above and tokenise `animated-icon.tsx`.

**Phase 2 — things a light theme exposes**

- The status bar style must follow the theme.
- The tab bar takes `theme.background`, so it follows automatically.
- The Keycloak login pages are separately dark-only (`darkMode=false`,
  `kcHtmlClass=…pf-v5-theme-dark` in the theme's `theme.properties`). A user on
  light mode meets a dark login page. Out of scope here, but it is the seam
  where the illusion breaks.

**Estimate.** Phase 1 is a day, most of it spent choosing the light palette
rather than wiring it. Phase 2 is smaller and can follow.

## 5. Language: being translated elsewhere

**This is in progress on another branch** — translations are being added
there, so do not hide or remove the picker on the strength of this document.

What that branch needs to finish: `es.ts` and `pt.ts` beside `en.ts`, the
`Language` union widened, and `useTranslation` reading the stored language
instead of its `'en'` constant. The key set already exists in `en.ts`, so the
remaining work is translation more than engineering.

Given the show is Brazilian, `pt` is the one that earns its place first.

## 6. Language flags (done)

The Language row and picker now show a flag beside each label:
🇬🇧 English · 🇪🇸 Español · 🇧🇷 Português.

Portuguese flies the Brazilian flag, not Portugal's — the show is Brazilian and
its episodes are pt-BR.

One caveat: **Windows does not render regional-indicator pairs as flags**, so
on the web build a Windows visitor sees "GB" rather than 🇬🇧. The label always
sits beside the flag for that reason; a flag alone would be unreadable there.
