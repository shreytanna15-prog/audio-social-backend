---
name: nextjs-admin-api-patterns
description: >-
  Admin portal data layer for audio-social-backend: folder layout, HTTP client,
  envelope unwrapping, React Query registries, React Hook Form + Zod, and
  session rules for the Next.js admin UI calling /api/admin/*.
---

# VibeOGram Admin Portal: API & Data Layer

Use this skill for **browser-side** admin data fetching in `audio-social-backend`.

**Not for:** Prisma services, `src/app/api/**` route handlers, or the Expo app. Those use `audio-backend-api-patterns` / app skills.

**Related:** `nextjs-admin-design-system`, `docs/features/admin.md`, `docs/features/coins-and-wallet.md`, `docs/features/contests.md`.

---

## 1. Same-repo layout

Admin UI and mobile API share one Next.js repo. Keep the **client** data layer isolated:

```text
src/admin/api/
├── client.ts           # fetch/axios instance, credentials, 401 handling, unwrap data
├── registry.ts         # QUERY_REGISTRY & MUTATION_REGISTRY
├── types.ts            # ApiResponse, ApiError, QueryOptions, MutationOptions
└── <feature>/          # auth | users | coins | contests | ...
    ├── api.ts          # Pure HTTP functions only
    ├── types.ts        # DTOs aligned with backend
    ├── queries.ts      # useQuery hooks
    └── mutations.ts    # useMutation hooks
```

Pages under `src/app/admin/**` only use hooks from `src/admin/api/**`. Never `fetch`/`axios` inside page components.

**Server modules** stay under `src/server/modules/**` and `/api/admin/**` as today.

---

## 2. Parity notes (vs Expo app)

| Layer | Expo (`audio-social-app`) | Admin portal (this repo) |
|-------|---------------------------|---------------------------|
| Feature API files | `api/service.ts` + `hooks.ts` | 4-file rule: `api` / `types` / `queries` / `mutations` |
| Keys | Feature query key constants | `QUERY_REGISTRY` / `MUTATION_REGISTRY` with `admin:` prefix |
| Envelope | Unwrap `{ success, message, data }` | Same unwrap of `data` |
| Auth | User JWT Bearer | Admin session (see §4) |
| Forms | Screen state / RHF as used | React Hook Form + Zod |
| Toasts | App feedback dialogs | Sonner |

Do not invent a second envelope shape. Match existing API responses.

---

## 3. Core rules

### 3.1 Four files per feature
1. `api.ts` - HTTP only, returns `Promise<T>` after unwrap  
2. `types.ts` - request/response DTOs  
3. `queries.ts` - `useQuery`  
4. `mutations.ts` - `useMutation` + invalidation + `toast.error` on failure  

### 3.2 Registry (no raw key strings)

```ts
export const QUERY_REGISTRY = {
  auth: {
    me: ['admin', 'auth', 'me'] as const,
  },
  users: {
    list: (params?: Record<string, unknown>) =>
      ['admin', 'users', 'list', params] as const,
    detail: (id: string) => ['admin', 'users', id] as const,
  },
  coins: {
    transactions: (params?: Record<string, unknown>) =>
      ['admin', 'coins', 'transactions', params] as const,
  },
  contests: {
    list: (params?: Record<string, unknown>) =>
      ['admin', 'contests', 'list', params] as const,
    detail: (id: string) => ['admin', 'contests', id] as const,
  },
} as const;

export const MUTATION_REGISTRY = {
  auth: {
    login: ['admin', 'auth', 'login'] as const,
    logout: ['admin', 'auth', 'logout'] as const,
  },
  coins: {
    grant: ['admin', 'coins', 'grant'] as const,
  },
  contests: {
    create: ['admin', 'contests', 'create'] as const,
    update: ['admin', 'contests', 'update'] as const,
    confirmWinners: ['admin', 'contests', 'confirm-winners'] as const,
  },
} as const;
```

Prefer **array keys** (React Query style) over string-only keys.

### 3.3 Envelope unwrap

Backend success bodies follow the project envelope (`success`, `message`, `data`; errors also carry `code`). Client helpers must return **`data`** (typed `T`) to hooks.

Do not assume a success field named `code: "OK"` unless the route actually returns it. Prefer reading `message` + `data`; map error `code` from error JSON when present.

### 3.4 Single-argument mutations

```ts
mutationFn: ({ id, body }: { id: string; body: UpdateContestBody }) =>
  updateContest(id, body);
```

### 3.5 Mutation errors

Always `toast.error(error.message)` in shared mutation wrappers; allow callers to append `onError`.

---

## 4. Admin session contract (web)

`docs/features/admin.md` currently documents **Bearer `accessToken` in login `data`** and `withAdminAuth` on `Authorization`. Logout notes cookies *if* cookie sessions are used.

**For the admin portal in this same Next app, prefer HttpOnly cookies** (same-origin `/api/admin/*` + `/admin/*`):

1. Login route sets HttpOnly cookie(s) (and may still return `admin` profile in `data`).
2. Browser client sends cookies automatically on same origin (no cross-port `withCredentials` required when UI and API share the host).
3. If using a short-lived access cookie + refresh cookie, implement `POST /api/admin/auth/refresh` and a single-flight 401 retry; **add that route to `admin.md` before coding it**.
4. If v1 stays Bearer-in-JSON: store token only in memory or a carefully scoped cookie; never `localStorage` for admin tokens if avoidable.
5. On refresh failure or hard 401: redirect to `/admin/login`.

**Do not** accept mobile user JWTs on admin routes. Admin tokens use `ADMIN_JWT_SECRET` only.

Base paths:
- Auth: `/api/admin/auth/login` | `me` | `logout` (+ `refresh` if added)
- Future: `/api/admin/users`, `/api/admin/coins/*`, `/api/admin/contests/*`

---

## 5. Shared types template (`src/admin/api/types.ts`)

```ts
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
  code?: string;
};

export type ApiErrorBody = {
  success?: false;
  code?: string;
  message: string;
};

export class AdminApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, AdminApiError, TData>,
  'queryKey' | 'queryFn'
>;

export type MutationOptions<TData, TVariables = void> = Omit<
  UseMutationOptions<TData, AdminApiError, TVariables>,
  'mutationKey' | 'mutationFn'
>;
```

Align field names with real route responses when wiring each feature.

---

## 6. Hook templates

### Query
```ts
export function useAdminMe(options?: QueryOptions<AdminProfile>) {
  return useQuery({
    queryKey: QUERY_REGISTRY.auth.me,
    queryFn: getAdminMe,
    ...options,
  });
}
```

### Mutation
```ts
export function useAdminLogin(
  options?: MutationOptions<AdminLoginResult, AdminLoginBody>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: MUTATION_REGISTRY.auth.login,
    mutationFn: loginAdmin,
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_REGISTRY.auth.me });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      toast.error(error.message);
      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
```

(Adjust `onSuccess` arity to the installed TanStack Query major version.)

---

## 7. Forms

- Login and admin forms: **React Hook Form + Zod** (`zodResolver`).
- Reuse Zod shapes from `src/server/modules/admin/**` validators when practical, or duplicate a client-safe subset under `src/admin/api/<feature>/types.ts` / a shared schema module. Do not import server-only modules (`server-only`, Prisma) into client bundles.

---

## 8. Implementation order (agents)

1. `client.ts` + `types.ts` + `registry.ts`  
2. `auth` feature (login / me / logout)  
3. Shell gate: redirect unauthenticated users to `/admin/login`  
4. `users` list/detail when APIs exist  
5. `coins` / `contests` when those admin APIs ship  

Never invent Prisma models from the admin client. Read `prisma/schema.prisma` + feature docs first.
