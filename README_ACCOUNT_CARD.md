# "Your account" — proposed additions

Improvements to the profile card at the top of Settings
(`features/settings/components/ProfileCard.tsx`).

> **The list of fields you wanted included did not come through** — the request
> ended before it. What follows is a proposal derived from what the backend
> already returns and already accepts, so every item here is wiring that exists
> and is unused rather than new API work. Treat it as a starting point to cut
> or extend.

---

## 1. What the card shows today

| Element | Source |
|---|---|
| Avatar (upload control) | `/api/me` → `profilePictureUrl`, initials fallback |
| Username, inline-editable | `/api/me` → `username`, saved via `POST /api/me/username` |
| Email | the JWT's `email` claim — **not** `/api/me`, which has no email field |
| `MEMBER` / `ADMIN` badge | derived client-side from four admin authorities |

## 2. What the API already gives us and the card ignores

`UserResponse` (`core/api/generated/schema.ts:696`) returns seven fields. The
card uses three.

| Field | Status |
|---|---|
| `displayName` | **Read but never settable** — see §3 |
| `createdAt` | Unused — a "Member since" line |
| `status` | Unused — `ACTIVE` / `DEACTIVATED` / `DELETED` |
| `id` | Unused, and should stay that way in the UI |
| `updatedAt` | Unused, no obvious user value |

## 3. The gap worth fixing first: display name

`useProfile.ts:111` already implements it:

```ts
const updateDisplayName = useCallback(async (displayName: string) => {
  const { data, error, response } = await bffClient.PATCH('/api/me', { body: { displayName } });
```

**Nothing in the app calls it.** `UpdateUserRequest` accepts exactly one field
— `displayName` — so the entire purpose of `PATCH /api/me` is currently
unreachable from the UI.

It is not cosmetic. `ProfileCard` computes
`profile?.displayName || profile?.username` and feeds it to the avatar's
initials, and `HomeHeader` does the same for the greeting. So `displayName`
already changes what the user sees in two places — they simply have no way to
set it. Right now everyone's initials are derived from their username by
accident.

Add it as a second `InlineEditField` above Username, using the existing
component and the existing hook. No API change.

## 4. Proposed card contents

```
┌──────────────────────────────────────────────────┐
│  ⬤ RE     Display name                        ✎  │
│   📷      Renan Zazula                           │
│           Username                            ✎  │
│           renanzazula                            │
│                                                  │
│  renanzazula@gmail.com                  MEMBER   │
│  Member since August 2026                        │
└──────────────────────────────────────────────────┘
```

1. **Display name** — new, inline-editable (§3).
2. **Username** — unchanged.
3. **Email** — unchanged. Read-only: it comes from the identity provider, and
   there is no endpoint to change it.
4. **Role badge** — unchanged.
5. **Member since** — new, from `createdAt`, formatted as month + year. A small
   piece of dignity for long-standing users, and free.
6. **Account status** — new, **rendered only when not `ACTIVE`**. A
   `DEACTIVATED` pill in the destructive tone. Showing "ACTIVE" to every user
   is noise; showing nothing when an account is deactivated is a bug.

## 5. What I deliberately did not propose

- **User id.** Returned by the API, but a UUID is meaningless to the person
  reading it and invites support-ticket copy-paste. If a support identifier is
  wanted, a short prefix behind a long-press "copy" is a better shape.
- **`updatedAt`.** "Last updated" on a profile card answers a question nobody
  asks.
- **Notification preferences.** Already a separate endpoint
  (`/api/me/preferences`) and belongs in its own Settings section, not in an
  identity card.
- **Anything needing new backend work.** Email verification state, login
  history, connected identity providers and session management are all
  plausible and all absent from `UserResponse`. Say the word and I will scope
  them separately — but this document is deliberately limited to what can ship
  as frontend-only.

## 6. Implementation notes

- **One component changes.** `ProfileCard.tsx` gains a field and a meta line;
  `InlineEditField` and `useProfile.updateDisplayName` already exist.
- **Height grows by roughly 44pt** with a second inline field. The card is the
  first thing on the Settings screen and is not in a scroll-constrained space,
  so this is safe, but it does push the first section further down.
- **Empty display name.** `displayName` is optional. When unset, show the
  field with a placeholder rather than hiding it — hiding it is what makes the
  feature undiscoverable today.
- **`createdAt` may be absent** on accounts predating the field. Render the
  line only when it parses, the same way `duration` is treated on the episode
  detail screen.
