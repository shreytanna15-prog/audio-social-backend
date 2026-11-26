# Admin Foundation — Implementation Guide

**Audience:** teammates and AI agents implementing the backend admin authentication and role isolation.  
**Repos:** backend (`audio-social-backend`) only (future Next.js admin portal in same repo).  
**Status:** `Planned` (Arch Done) — Independent `Admin` model, dedicated `ADMIN_JWT_SECRET`, and `withAdminAuth` middleware.  
**Do not** invent Prisma models or alternate APIs; read `prisma/schema.prisma` and this doc.

**Related docs:** [`../project-context.md`](../project-context.md), [`./coins-and-wallet.md`](./coins-and-wallet.md), [`./contests.md`](./contests.md)

---

## 1. Goal

1. Provide an isolated **`Admin`** table completely separated from the mobile app `User` table.
2. Implement isolated admin authentication using a distinct **`ADMIN_JWT_SECRET`** so user tokens can never access admin routes and vice-versa.
3. Build a dedicated **`withAdminAuth`** middleware to protect all future `/api/admin/*` routes (e.g. challenges, coin grants, moderation).
4. Expose core admin auth routes: `/login`, `/me`, and `/logout`.
5. Provide a seed script to create the initial Super Admin account safely.

```mermaid
flowchart LR
  subgraph User Auth [Mobile App Users]
    UserClient[Expo App] --> UserLogin[/api/auth/login]
    UserLogin --> UserJWT[User JWT: JWT_SECRET]
    UserJWT --> withAuth[withAuth Middleware]
  end

  subgraph Admin Auth [Admin Portal / Super Admin]
    AdminClient[Next.js Admin / Postman] --> AdminLogin[/api/admin/auth/login]
    AdminLogin --> AdminJWT[Admin JWT: ADMIN_JWT_SECRET]
    AdminJWT --> withAdminAuth[withAdminAuth Middleware]
    withAdminAuth --> AdminRoutes[/api/admin/* Challenges / Coins / Stats]
  end
```

---

## 2. Scope

### In scope

| # | Item |
|---|------|
| 1 | **Prisma Model**: `Admin` table with `id`, `email`, `password` (hashed), `name`, `createdAt`, `updatedAt`. |
| 2 | **Environment Variable**: `ADMIN_JWT_SECRET` for signing admin session tokens. |
| 3 | **Middleware**: `withAdminAuth` in `src/server/middlewares/with-admin-auth.ts`. |
| 4 | **Admin Auth Module**: `src/server/modules/admin/` (`admin-auth.service.ts`, `admin-auth.validator.ts`). |
| 5 | **API Routes**: `POST /api/admin/auth/login`, `GET /api/admin/auth/me`, `POST /api/admin/auth/logout`. |
| 6 | **Seed Script**: Initial super admin creation CLI script / seed logic. |

### Out of scope

- Admin frontend UI dashboard (out of scope for now; APIs will be tested via Postman / curl).
- Multi-role permission matrices (strictly single Super Admin tier in v1).
- Merging admin with regular user table.

---

## 3. Locked Product Decisions

1. **Strict Table Separation:** The `Admin` entity is separate from `User`. Mobile user accounts cannot be promoted to admin via table flags; they are fundamentally distinct database models.
2. **Dedicated Token Signing:** Admin JWTs are signed with a dedicated `ADMIN_JWT_SECRET`. Passing a regular user JWT to an admin endpoint will fail signature verification immediately.
3. **Dedicated Middleware:** Only `withAdminAuth` guards `/api/admin/*` endpoints. It resolves `req.admin` (not `req.user`).
4. **Single Super Admin:** Designed for one primary administrator. Seeded initially via environment variables or seed script.
5. **Session Expiry:** Admin access tokens expire after 24 hours (or 7 days if configured).

---

## 4. Data Model & Prisma Migration

Add the `Admin` model to `prisma/schema.prisma`:

```prisma
model Admin {
  id        String   @id @default(uuid(7)) @db.Uuid
  email     String   @unique
  password  String   // Hashed with bcrypt / argon2
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}
```

### Migration Instructions:
1. Run migration in development:
   ```sh
   npx prisma migrate dev --name add_admin_table
   ```
2. Generate the updated Prisma client:
   ```sh
   npx prisma generate
   ```
*(Note: Output is automatically mapped to `src/generated/prisma` as configured in `schema.prisma`).*

---

## 5. Backend Architecture & APIs

All endpoints follow `@/server/utils/route`, Zod validation, and the standard envelope:
`{ "success": true, "message": "...", "data": { ... } }`.

### 5.1 Admin Login (`POST /api/admin/auth/login`)
- **Auth:** Public.
- **Body Schema (Zod):**
  ```ts
  export const adminLoginSchema = z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(8),
  });
  ```
- **Behavior:**
  - Verifies email and hashed password against the `Admin` table.
  - Generates an Admin JWT using `ADMIN_JWT_SECRET`:
    ```ts
    { adminId: admin.id, email: admin.email, type: "ADMIN" }
    ```
  - Returns:
    ```json
    {
      "success": true,
      "message": "Admin authenticated successfully",
      "data": {
        "accessToken": "eyJhbGciOi...",
        "admin": {
          "id": "uuid",
          "email": "admin@vibeogram.com",
          "name": "Super Admin"
        }
      }
    }
    ```

### 5.2 Admin Profile (`GET /api/admin/auth/me`)
- **Auth:** Required via `withAdminAuth`.
- **Behavior:**
  - Decodes token, validates admin exists in database.
  - Returns authenticated admin profile `{ id, email, name, createdAt }`.

### 5.3 Admin Logout (`POST /api/admin/auth/logout`)
- **Auth:** Required via `withAdminAuth`.
- **Behavior:**
  - Clears cookies (if cookie-based session is used) or returns success confirmation for client-side token discard.

---

## 6. Middleware: `withAdminAuth`

File: `src/server/middlewares/with-admin-auth.ts`

```ts
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/server/config/prisma';
import { AppError } from '@/server/utils/app-error';

export async function withAdminAuth(req: any, next: () => Promise<NextResponse>) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Unauthorized: Missing admin bearer token', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new AppError('Server configuration error: ADMIN_JWT_SECRET missing', 500, 'INTERNAL_SERVER_ERROR');
  }

  try {
    const decoded = jwt.verify(token, secret) as { adminId: string; type: string };
    if (decoded.type !== 'ADMIN') {
      throw new AppError('Forbidden: Not an admin token', 403, 'FORBIDDEN');
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
      select: { id: true, email: true, name: true },
    });

    if (!admin) {
      throw new AppError('Admin account no longer exists', 401, 'UNAUTHORIZED');
    }

    req.admin = admin;
    return next();
  } catch (err: any) {
    throw new AppError('Invalid or expired admin token', 401, 'UNAUTHORIZED');
  }
}
```

---

## 7. Super Admin Seed Script

File: `scripts/seed-admin.ts`
- Reads `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` from `.env`.
- Checks if an admin with that email exists.
- Hashes password using the repo's existing password utility (e.g. bcrypt/argon2) and creates the record.
- Allows bootstrapping the primary admin in development or production deployments.

---

## 8. Implementation Checklist

### Backend:
- [ ] Add `model Admin` in `prisma/schema.prisma`.
- [ ] Run Prisma migration: `add_admin_table`.
- [ ] Add `ADMIN_JWT_SECRET` to `.env.example` and validation config (`src/server/config/env.ts`).
- [ ] Create `withAdminAuth` middleware in `src/server/middlewares/with-admin-auth.ts`.
- [ ] Create `src/server/modules/admin/admin-auth.validator.ts`.
- [ ] Create `src/server/modules/admin/admin-auth.service.ts`.
- [ ] Implement `src/app/api/admin/auth/login/route.ts`.
- [ ] Implement `src/app/api/admin/auth/me/route.ts`.
- [ ] Implement `src/app/api/admin/auth/logout/route.ts`.
- [ ] Register routes in OpenAPI under `src/server/openapi/paths/admin.paths.ts`.
- [ ] Add `scripts/seed-admin.ts` to `package.json`.
