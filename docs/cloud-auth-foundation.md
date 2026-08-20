# K-Roadmap Cloud Auth Foundation

## Phase 1 scope

Authentication only. This phase does not upload, download, or synchronize K-Roadmap state.

## Persistence audit

- Journey store: `k-roadmap-storage-v2`, persistence version `5`. It contains roadmap phases/tasks, majors, skills, journal entries, budget, documents, achievements, major-decision snapshots, and `myWhy`.
- Experiment store: `k-roadmap-experiments-v1`, persistence version `4`. It contains experiments, attempts, reflections, experiment names, and duration metadata.
- Application tracker: `k-roadmap-application-tracker-v1`, persistence version `1`. It contains application targets and status/deadline metadata.
- Budget is nested in the Journey store; current local state has estimated items, target amount, and current savings.

## Auth architecture

### Guest mode
Guest mode remains the default. Existing localStorage continues to work unchanged while signed out.

### Authenticated mode
Supabase Auth provides the stable identity. The authenticated user's `auth.users.id` matches the cloud schema's `user_id` columns and `profiles.id`.

### Provider
Phase 1 targets Google OAuth. Email/password is intentionally out of scope.

### Flow

```text
Guest
  |
  | Sign in
  v
Google OAuth
  |
  v
Authenticated session
  |
  +--> localStorage remains untouched
  +--> Phase 2 may offer explicit local-data import
```

## Safety rules

1. Auth must not mutate Zustand stores.
2. Auth must not upload local data.
3. Auth must not delete or overwrite localStorage.
4. Sign-out leaves local data untouched.
5. Guest mode remains fully usable.
6. Cloud synchronization starts only in Phase 2 after an explicit migration/preview flow.

## Implementation pieces

1. Supabase browser client.
2. Auth helper for sign-in, sign-out, and current-session lookup.
3. OAuth callback route.
4. Login/auth page with Google sign-in and guest continuation.
5. Session-aware navigation/status UI.
6. Environment-variable documentation.

## Environment variables

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Never expose a service-role key in browser code or repository files.

## Definition of done

- Google sign-in works locally.
- OAuth callback returns to K-Roadmap.
- Refresh preserves the session.
- Sign-out works.
- Guest mode still works.
- Existing localStorage is unchanged before and after auth.
- `npm run build` passes.

No cloud data synchronization is part of Phase 1.
