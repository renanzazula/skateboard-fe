# Development

See `README-skateboard-fe.md` for the intended architecture. This covers how
to actually run the app against the real backend services.

## Run order

1. Keycloak + Postgres — from `skateboard-podcast-be`:
   `docker compose -f .docker/docker-compose.yaml up` (realm `skateboard-podcast`, `:8180`).
   Realm data is only (re-)imported on a fresh volume — if you change
   `realm-export.json`, you need a clean volume for it to take effect, not a
   restart.
2. `skateboard-podcast-be` (`:8080`) — `mvn spring-boot:run`.
3. `skateboard-ui-backend`, the BFF this app talks to (`:8090`) — `mvn spring-boot:run`.
4. This app — `npm start`, then press `a`/`i`/`w`, or scan the QR code with
   Expo Go.

For push notifications you also need `skateboard-notification-be` (`:8084`) and
the RabbitMQ broker from the same compose file, and podcast-be started with
`PODCAST_NOTIFICATIONS_ENABLED=true` (it is off by default).

## Push notifications

Everything except delivery works in Expo Go. Actually **receiving** a push does
not: since SDK 53 Expo Go has no push support on Android, so use a development
build — `npx expo run:android` / `npx expo run:ios` — on a **physical device**.
Simulators have no APNs/FCM registration, and `registerPushDevice()` returns
null there rather than pretending otherwise.

How it fits together:

- `features/notifications/PushNotificationsGate` is mounted inside
  `AuthProvider` and registers the device once `status === 'signedIn'` — the
  call is authenticated and the device is recorded against the JWT's subject.
- The device is keyed by a stable per-install id in secure storage, not by the
  push token, because the token rotates. See
  `features/notifications/deviceIdentifier.ts`.
- Taps are handled with `useLastNotificationResponse`, not a listener, because
  the tap that *launches* the app happens before any listener could attach.
  `PODCAST` targets route to `/video/[slug]`.
- Logout de-registers the device *before* clearing the token — otherwise the
  previous account's notifications keep arriving on the handset.
- The Settings → Notifications switches are an app preference. The OS has its
  own and it wins; the screen shows a hint when the OS is blocking.

End-to-end check: sign in, accept the permission prompt, then publish a podcast
in the admin screen (or `POST /api/podcast`) and confirm the push arrives and
opens the right episode. A back-dated episode should *not* notify — that is the
recency window in podcast-be doing its job, not a bug.

## Environment

Config lives in `src/core/config/env.ts`, overridable via `EXPO_PUBLIC_*` env
vars (see that file for the full list and dev defaults). The defaults assume
everything above is running on `localhost`.

**Android emulator**: its `localhost` is the emulator's own loopback, not
your machine's — set `EXPO_PUBLIC_KEYCLOAK_ISSUER` and `EXPO_PUBLIC_BFF_BASE_URL`
to use `10.0.2.2` instead of `localhost`.

**Physical device**: use your dev machine's LAN IP instead of `localhost`
for both, and make sure the device can actually reach ports `8180`/`8090` on
that machine (same network, firewall allows it).

## Test users

Seeded in `skateboard-podcast-be/.docker/keycloak/realm-export.json`:

| Email | Password | Role | Notes |
|---|---|---|---|
| `admin@example.com` | `admin123` | `ADMIN` | Sees every tab; can create/edit/delete/import podcast posts. |
| `user@example.com` | `password123` | `STANDARD` | Only `FUNC_TAB_SETTINGS` by default — good for confirming role-gating actually hides tabs, not just the podcast admin actions. |

## Regenerating the API client

`api/bff-openapi.yaml` is a vendored copy of `skateboard-ui-backend/api/openapi.yaml`
(the BFF's own exposed contract). When that changes upstream, re-copy it here
by hand and run:

```
npm run generate:api
```

This regenerates `src/core/api/generated/schema.ts` — don't hand-edit that file.

## Auth redirect scheme

This app registers as `skateboardfe://` with Keycloak (`app.json`'s
`expo.scheme`, matching `skateboard-podcast-fe`'s `redirectUris` in
`realm-export.json`). If you rename the app or change its scheme, update
both places together.
