# Guest access

Design for a **Continue as guest** button on the login screen that drops a
visitor straight into the app with read-only access, driven by a `GUEST` role
in Keycloak.

Spans four repos: `skateboard-fe`, `skateboard-ui-backend`,
`skateboard-podcast-be` (unchanged, listed for completeness) and
`skateboard-infrastructure` (Keycloak realm).

---

## 1. What the review turned up first

Three findings that shape the design. The first two are pre-existing bugs
worth fixing regardless of whether guest access ships.

### 1.1 The `GUEST` role already exists — and grants nothing

`.docker/keycloak/realm-export.json` already declares a realm role `GUEST`
with **zero composites**. A user holding it today receives an empty
`authorities` claim, so every screen and every endpoint refuses them. The role
is declared but was never wired up. This design fills it in.

### 1.2 `FUNC_HOME_FEATURED_PLAYER_CONFIG` does not exist in the realm

The frontend gates the Featured Player admin screen on it
(`settings/featured-player.tsx:50`, `settings/administration.tsx:19`) and the
BFF's OpenAPI spec documents a 403 for it — but the realm defines no such
role, and it is not in `ADMIN`'s composites.

**No user can ever hold it, so that screen is permanently unreachable — including for admins.**
Compare `FUNC_HOME_CATEGORY_CONFIG`, which does exist and is in `ADMIN`. This
looks like an authority that was added to the code and never added to the
realm. Fix it in the same realm change as `GUEST`.

### 1.3 Every new user silently inherits `STANDARD`

```
default-roles-skateboard-podcast  →  STANDARD  →  9 FUNC_* authorities
```

`registrationAllowed` is `true`, so anyone who signs up gets `STANDARD`
automatically. **This is the single biggest trap for this feature**: create the
guest account the ordinary way and it silently holds all nine `STANDARD`
authorities — including `FUNC_USER_ACCOUNT_DELETE` — no matter what `GUEST`
says. `GUEST` is additive; it does not subtract.

The guest account must have the realm's default-roles mapping **removed**, not
merely have `GUEST` added. This is the step most likely to be missed, and it
fails open.

---

## 2. Authority model

### 2.1 The endpoint map, as it stands today

| Endpoint | Required authority |
|---|---|
| `GET /api/config` | *(public — the only pre-auth route)* |
| `GET /api/home/videos` | *(authenticated, no specific authority)* |
| `GET /api/podcast`, `/api/podcast/{slug}` | `FUNC_TAB_PODCAST` |
| `GET /api/categories`, `/api/categories/{slug}/posts` | `FUNC_TAB_PODCAST` |
| `GET /api/me`, `/api/me/preferences` | `FUNC_USER_SELF_READ` |
| Every podcast mutation | `FUNC_PODCAST_*` |
| Every account mutation | `FUNC_USER_SELF_UPDATE` / `_PASSWORD_CHANGE` / … |
| All branding | `FUNC_TAB_SETTINGS_BRANDING` |
| Home category config | `FUNC_HOME_CATEGORY_CONFIG` |

Tabs are gated separately in the frontend by `FUNC_TAB_*`
(`app/(tabs)/_layout.tsx`), where `href: null` both hides a tab and blocks
direct navigation to it.

### 2.2 What `GUEST` should hold

```
GUEST  →  FUNC_TAB_HOME
          FUNC_TAB_PODCAST
          FUNC_TAB_SETTINGS
          FUNC_USER_SELF_READ
```

Four authorities. Why each:

- **`FUNC_TAB_HOME`** — the masonry gallery. `/api/home/videos` needs only a
  valid token, so the tab gate is the real control.
- **`FUNC_TAB_PODCAST`** — the episode list and detail screens. This one
  authority covers all four podcast read endpoints.
- **`FUNC_USER_SELF_READ`** — `GET /api/me`, which `useProfile` calls for the
  Home header's avatar and username. **Omit it and the header 403s on every
  screen**, which is the least obvious dependency in this list.
- **`FUNC_TAB_SETTINGS`** — see §2.3; a guest needs a way out.

Everything else is deliberately excluded: all `FUNC_PODCAST_*`, all account
mutations, branding, and the home-config authorities. A guest can read and
play; they cannot change anything, including anything about the shared guest
account itself.

### 2.3 Settings, and why the guest needs it

Tempting to withhold `FUNC_TAB_SETTINGS` — every row on that screen is an
account mutation a guest cannot perform. But **Log out lives there**, and
without it a guest is trapped in the app with no way back to the login screen.

Two options:

1. **Grant `FUNC_TAB_SETTINGS` and make the screen guest-aware** *(recommended)*.
   `settings/index.tsx` already gates its rows on individual `FUNC_USER_*`
   authorities, so most collapse to nothing on their own. Add a guest banner —
   *"You're browsing as a guest — sign in to comment, save and manage
   episodes"* — with a **Sign in / Create account** button, and relabel Log out
   to **Exit guest mode**.
2. Withhold it and move the exit affordance into the Home header, where the
   avatar already routes to `/settings`.

Option 1 is less frontend churn and gives the sign-up prompt a natural home —
which is the point of guest mode commercially.

---

## 3. How a guest obtains a token

This is the real design decision. The frontend's whole data layer assumes a
bearer token (`core/api/client.ts` attaches one to every request via
`ensureFreshAccessToken`), so the cheapest option that preserves the existing
architecture is to give guests a *real* token for a restricted account.

### Recommended: BFF-brokered guest login

```
FE  ──POST /api/auth/guest──▶  ui-backend  ──Direct Access Grant──▶  Keycloak
                                (confidential client,                  guest user,
                                 secret in env)                        GUEST only
    ◀────── token response ─────┘
```

1. **New Keycloak client** `skateboard-guest-broker` — confidential,
   `directAccessGrantsEnabled: true`, `standardFlowEnabled: false`. It needs
   the same `audience` and `authorities` protocol mappers the
   `skateboard-podcast-fe` client carries, or the minted token will be rejected
   downstream for a missing `aud` or arrive with no authorities.
2. **New Keycloak user** `guest@skateboard.app` — realm role `GUEST`, with the
   `default-roles-skateboard-podcast` mapping **removed** (§1.3). Password
   generated, stored only as the broker's secret.
3. **New BFF endpoint** `POST /api/auth/guest`, added to `permitAll` in
   `SecurityConfig` alongside `/api/config`. It performs the grant server-side
   and returns the token response unchanged.
4. **Frontend** gains `loginAsGuest()` in `core/auth/authStore.ts`, which posts
   to that endpoint and hands the result to the existing
   `applyTokenResponse` — the same path `loginWithPassword` already uses.

The client secret never leaves the server. Nothing else in the token pipeline
changes: relay, validation and `@PreAuthorize` all behave exactly as they do
for a normal user.

**Caveat — refresh.** The frontend currently refreshes directly against
Keycloak using `env.keycloakClientId`. A guest token is issued to a *different*
client, so that refresh will fail. Either add `POST /api/auth/guest/refresh`
alongside it, or have `refreshAccessToken` fall back to re-issuing a fresh
guest token when the session is a guest session. Decide this before
implementing — it is easy to miss and surfaces only when the token expires
mid-session, which no quick test will catch.

### Alternatives considered

| Option | Trade-off |
|---|---|
| **Guest password shipped in the app** (reuse the existing public client) | Simplest — a few lines. But the credential is in the JS bundle and extractable. Tolerable for a demo build, not for production. |
| **`permitAll` on guest-readable endpoints, no token at all** | Architecturally cleanest and removes Keycloak from the path. But it makes `/api/home/videos` and all podcast reads fully public, and the FE assumes a token everywhere — a much larger change with a wider blast radius. |
| **Keycloak anonymous / service account** | Service accounts use `client_credentials`, which needs a confidential client; the FE is public, so this can't be driven from the app directly. Reduces to the recommended option anyway. |

---

## 4. The login screen

`app/(auth)/index.tsx` renders logo → title → message → username → password →
**Log in**. Add below the primary button:

```
────────────────  or  ────────────────

        [ Continue as guest ]
```

A secondary/outline button, so it reads as the lesser path. It calls
`loginAsGuest()`; the existing root layout redirect handles routing once
`status` flips to authenticated, so no navigation code is needed.

The screen already has an error slot (`styles.error`) — reuse it rather than
adding a second one. The button should show the same `loading` treatment
`PrimaryButton` uses, since the broker call is a network round trip.

---

## 5. Work breakdown

| # | Repo | Change |
|---|---|---|
| 1 | `skateboard-infrastructure` | `GUEST` composites (§2.2); add missing `FUNC_HOME_FEATURED_PLAYER_CONFIG` and put it in `ADMIN` (§1.2); add `skateboard-guest-broker` client with audience + authorities mappers; add the guest user **without** default-roles (§1.3) |
| 2 | `skateboard-ui-backend` | `POST /api/auth/guest` (+ refresh, §3); `permitAll` for it; broker secret via env; rate limiting (§6) |
| 3 | `skateboard-fe` | `loginAsGuest()` in `authStore`; `isGuest` on the auth state; **Continue as guest** button; guest-aware Settings (§2.3) |
| 4 | `skateboard-podcast-be` | None — it already authorises on `FUNC_*` from the relayed token |

Phase 1 and 2 are independently testable with `curl`; phase 3 is the only
user-visible one. If you want to ship something in a day, do 1 + 3 with the
shipped-password variant, then swap in the broker without touching the FE
beyond one URL.

---

## 6. Risks

- **Shared subject.** Every guest is the same Keycloak user, so
  `resolveCurrentUserId()` (the JWT `sub`) is identical for all of them. Fine
  while guests are read-only; it becomes a data-collision bug the moment
  anything writes per-user state keyed on `sub`. Worth a comment in the code
  next to the guest user, so the constraint is discoverable later.
- **Token minting is a public endpoint.** `POST /api/auth/guest` is
  unauthenticated by definition. Rate-limit it per IP, and keep the guest
  token's lifetime short.
- **The realm export is not the live realm.** As with the earlier
  `FUNC_PODCAST_MANAGE_CATEGORIES` work, editing `realm-export.json` does not
  change a running Keycloak. Either re-import the realm or apply the role via
  `kcadm`, and confirm on the live instance before testing.
- **`GUEST` is additive.** Restated because it fails open: adding `GUEST` to an
  account that already has `STANDARD` grants the union, not the intersection.

---

## 7. Suggestions beyond the ask

- **Fix `FUNC_HOME_FEATURED_PLAYER_CONFIG` now** (§1.2). It is a one-line realm
  change, and it means an admin screen that has never worked starts working.
- **A conversion prompt is the real value.** Guest mode exists to turn visitors
  into users. The moment a guest taps something they can't do is the moment to
  offer sign-up — a single `GuestGate` component wrapping blocked actions
  would beat a passive banner.
- **Consider a `FUNC_TAB_*` for guests rather than reusing the user tabs**, if
  guest and user home screens ever diverge. Not needed today; noted so the
  option isn't lost.
- **Frontend authority checks are UX, not security.** They already sit
  alongside `@PreAuthorize` on every endpoint, which is the real boundary. Keep
  that discipline for guest features: no new capability should be gated in the
  app alone.
