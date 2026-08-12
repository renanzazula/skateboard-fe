# Skateboard Mobile Frontend

## Overview

`skateboard-fe` is the mobile frontend for the Skateboard platform.

Recommended stack:

-   React Native
-   Expo
-   TypeScript
-   Expo Router
-   Keycloak / OpenID Connect
-   OpenAPI-generated TypeScript client
-   Expo Go for initial development
-   Expo Development Builds when native capabilities are required
-   EAS Build for production builds

## Architecture

``` text
                         Keycloak
                            ^
                            |
                 Authorization Code + PKCE
                            |
                            |
                    skateboard-fe
                 React Native + Expo
                            |
                            | Keycloak JWT
                            v
                 skateboard-ui-backend
                            |
                 +----------+----------+
                 |          |          |
                 v          v          v
             podcast-be  events-be  spots-be
```

The mobile application should communicate only with
`skateboard-ui-backend`.

It should not call domain microservices directly.

## Expo and Expo Go

Expo is the platform/tooling used to develop and build the React Native
application.

Expo Go is primarily a convenient development application.

``` text
React Native
    -> Mobile UI framework

Expo
    -> Development/build/platform tooling

Expo Go
    -> Fast initial development and testing on a device

Expo Development Build
    -> Custom development application when native modules are required

EAS Build
    -> Production Android/iOS builds
```

Start with Expo Go while the application only needs capabilities
supported by it.

Move to an Expo Development Build when custom native modules or
unsupported native functionality becomes necessary.

## Recommended Project Structure

``` text
src/
├── app/
│   ├── (auth)/
│   ├── (tabs)/
│   └── _layout.tsx
│
├── features/
│   ├── podcast/
│   ├── spots/
│   ├── events/
│   ├── profile/
│   └── admin/
│
├── core/
│   ├── api/
│   │   └── generated/
│   ├── auth/
│   ├── config/
│   └── storage/
│
└── shared/
    ├── components/
    ├── hooks/
    ├── models/
    └── utils/
```

Prefer a feature-oriented structure instead of global folders containing
every component or service.

## Navigation

Use Expo Router.

Typical route groups:

``` text
app/
├── (auth)/
│   └── login.tsx
│
├── (tabs)/
│   ├── index.tsx
│   ├── podcasts.tsx
│   ├── spots.tsx
│   └── profile.tsx
│
└── _layout.tsx
```

Authentication state should determine whether the user enters the
authenticated application or the authentication flow.

## Authentication

Use Keycloak with OAuth2/OpenID Connect.

For mobile authentication use:

``` text
Authorization Code Flow + PKCE
```

Do not send the user's username and password directly from React Native
to a custom backend login endpoint.

Recommended flow:

``` text
Mobile App
    |
    | Open authentication
    v
System Browser
    |
    v
Keycloak
    |
    | Authentication
    | Authorization Code
    v
Deep Link / Redirect
    |
    v
Mobile App
    |
    | Exchange code / obtain tokens
    v
Authenticated Session
```

The frontend then sends the access token to the UI Backend:

``` http
Authorization: Bearer <KEYCLOAK_ACCESS_TOKEN>
```

The UI Backend must validate the JWT and enforce backend authorization.

Frontend role checks are only for UX.

For example:

``` text
ADMIN
  -> Show administration screens/buttons

STANDARD
  -> Show standard functionality

GUEST
  -> Limited functionality
```

The backend must still validate permissions independently.

## API Communication

The frontend should have one backend entry point:

``` text
skateboard-ui-backend
```

Example API:

``` text
GET    /api/podcasts
GET    /api/podcasts/{id}
POST   /api/podcasts

GET    /api/events
GET    /api/spots
GET    /api/profile
GET    /api/home
```

Avoid:

``` text
Mobile -> podcast-be
Mobile -> events-be
Mobile -> spots-be
```

Prefer:

``` text
Mobile
   |
   v
UI Backend
   |
   +--> podcast-be
   +--> events-be
   +--> spots-be
```

## OpenAPI Client

If `skateboard-ui-backend` exposes an OpenAPI specification, generate a
TypeScript client from that contract.

``` text
skateboard-ui-backend
        |
        | OpenAPI specification
        v
OpenAPI Generator
        |
        v
TypeScript Client
        |
        v
React Native Application
```

Generated code should be kept separate from handwritten application
code:

``` text
src/core/api/generated/
```

Do not manually modify generated files.

Regenerate them when the BFF OpenAPI contract changes.

Prefer typed generated calls such as:

``` typescript
podcastApi.getPodcastById(id);
```

instead of manually duplicating endpoints throughout the application:

``` typescript
fetch(`/api/podcasts/${id}`);
```

Feature code may wrap generated APIs when additional
presentation/orchestration logic is needed:

``` text
Podcast Screen
      |
      v
Podcast Service / Hook
      |
      v
Generated PodcastApi
      |
      v
skateboard-ui-backend
```

Do not add wrappers purely for abstraction if they provide no value.

## Token Handling

Centralize authenticated API communication.

Feature screens should not manually construct authorization headers.

Conceptually:

``` text
Feature
   |
   v
API Client
   |
   +--> Get current access token
   |
   +--> Authorization: Bearer <token>
   |
   v
UI Backend
```

Store sensitive authentication data using an appropriate secure storage
mechanism rather than plain application storage.

## Responsibilities

### Mobile Frontend

Responsible for:

-   UI
-   navigation
-   authentication flow
-   frontend state
-   presentation logic
-   role-based UI visibility
-   calling the BFF
-   handling mobile-specific behavior

### UI Backend

Responsible for:

-   JWT validation
-   API authorization
-   user context
-   API aggregation
-   orchestration
-   downstream communication
-   error translation
-   frontend-oriented API responses

### Domain Microservices

Responsible for:

-   business rules
-   domain models
-   persistence
-   business validation
-   domain authorization
-   domain use cases

## State Management

Start simple.

Prefer:

``` text
Local component state
+
React hooks
+
Feature services/hooks
+
Authentication state
```

Do not introduce a large global state-management library until there is
a concrete requirement for complex shared state.

Server data should normally be fetched and cached as server data instead
of being duplicated unnecessarily into global application state.

## Error Handling

Handle common backend errors consistently:

``` text
401 -> authentication/session handling
403 -> permission denied
404 -> resource not found
5xx -> service/general error
```

The BFF should provide a consistent error response so the mobile
application does not need to understand errors from individual
downstream microservices.

## Development Workflow

Initial development:

``` text
React Native + Expo
        |
        v
Expo Go
        |
        v
Physical Android/iOS device
```

When native functionality requires modules unavailable in Expo Go:

``` text
React Native + Expo
        |
        v
Expo Development Build
```

For release builds:

``` text
EAS Build
   |
   +--> Android
   |
   +--> iOS
```

## Implementation Steps

1.  Create the React Native application with Expo and TypeScript.
2.  Configure Expo Router.
3.  Create the feature-oriented project structure.
4.  Configure Keycloak/OIDC authentication using Authorization Code +
    PKCE.
5.  Configure deep linking/redirect handling.
6.  Implement secure token/session handling.
7.  Configure the base URL for `skateboard-ui-backend`.
8.  Generate the TypeScript API client from the BFF OpenAPI
    specification.
9.  Add centralized authentication to API requests.
10. Implement the first feature, such as Podcasts.
11. Add role-based UI visibility where required.
12. Add centralized error handling.
13. Continue using Expo Go while supported.
14. Move to an Expo Development Build when native requirements make it
    necessary.
15. Use EAS Build for production Android/iOS releases.

## Design Rules

Prefer:

``` text
React Native + Expo
TypeScript
Expo Router
Keycloak OIDC + PKCE
OpenAPI-generated TypeScript client
Feature-oriented structure
Thin frontend API layer
Single BFF entry point
```

Avoid:

``` text
Frontend calling microservices directly
Username/password authentication through a custom mobile API
Business rules implemented only in the frontend
Manual API URLs duplicated throughout features
Manually editing generated OpenAPI code
Using frontend role checks as the security boundary
Introducing complex global state before it is needed
```

## Final Recommendation

The recommended frontend architecture is:

``` text
React Native
    +
Expo
    +
TypeScript
    +
Expo Router
    +
Keycloak / OIDC PKCE
    +
OpenAPI-generated BFF client
```

Use Expo Go to get started quickly, but design the application around
Expo rather than around Expo Go.

The long-term flow should remain:

``` text
Mobile App
    |
    | Keycloak JWT
    v
skateboard-ui-backend
    |
    +--> skateboard-podcast-be
    +--> skateboard-events-be
    +--> skateboard-spots-be
```

This keeps the mobile application focused on presentation while the BFF
acts as the frontend API/security boundary and the domain microservices
retain the business logic.
