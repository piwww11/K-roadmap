# K-Roadmap Cloud Auth Foundation

## Phase 1 scope

This phase establishes authentication only. It does not upload, download, or synchronize K-Roadmap state.

## Current persistence audit

### Journey store
- Zustand persist key: `k-roadmap-storage-v2`
- Current persisted state contains roadmap phases/tasks, majors, skills, journal entries, budget, documents, achievements, major-decision snapshots, and `myWhy`.
- Store persistence version is currently `5`.
- Existing export/import methods remain available as a safety mechanism.

### Experiment store
- Zustand persist key: `k-roadmap-experiments-v1`
- Persists experiments, attempts, reflection data, experiment names, and duration metadata.
- Current store persistence version is `4`.

### Application tracker
- Zustand persist key: `k-roadmap-application-tracker-v1`
- Persists application targets and their status/deadline metadata.
- Current persistence version is `1`.

### Budget
- Budget is persisted inside the Journey store under `budget`.
- The existing local state includes estimated items, target amount, and current savings.
- Cloud schema intentionally stores savings as transactions and derives the current total.

## Auth architecture

### Guest mode
Guest mode remains the default experience. Existing localStorage continues to work exactly as it does today when the user is not authenticated.

### Authenticated mode
A Supabase Auth session identifies the user. The stable identity is `auth.users.id`, which matches the validated cloud schema's `user_id` columns and `profiles.id`.

### Provider
The first implementation targets Google OAuth because it gives the user one account that can be reused on laptop and phone without introducing a second password system. Email/password is not part of Phase 1.

### Flow

```text
Guest
  |
  | Sign in
  v
Supabase Google OAuth
  |
  v
Authenticated session
  |
  +--> Existing local data remains untouched
  |
  +--> Phase 2 may offer a one-time local-data import
```

## Phase 1 safety rules

1. Authentication must not mutate existing Zustand stores.
2. Authentication must not trigger a cloud upload.
3. Authentication must not delete or overwrite localStorage.
4. Sign-out must leave local data untouched.
5. A user can continue using K-Roadmap as a guest without an account.
6. Cloud sync begins only in Phase 2 after explicit local-data migration/preview is implemented.

## Required implementation pieces

1. Supabase browser client.
2. Auth helper for sign-in, sign-out, and current-session lookup.
3. Auth callback route for OAuth exchange.
4. Login/auth page with Google sign-in and guest continuation.
5. Session-aware navigation/status UI.
6. Environment-variable documentation for the Supabase URL and publishable/anon key.

## Environment variables

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

No service-role key belongs in the browser or repository.

## Phase boundary

Phase 1 is complete only when:

- Google sign-in succeeds locally.
- OAuth callback returns to K-Roadmap.
- Refresh preserves the authenticated session.
- Sign-out works.
- Guest mode still works.
- Existing localStorage data is unchanged before and after login/sign-out.
- `npm run build` passes.

No cloud data synchronization is considered part of this phase.
