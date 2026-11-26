# Coin Wallet & Ledger — Implementation Guide

**Audience:** teammates and AI agents implementing the virtual coin wallet, transaction ledger, and admin grant features end-to-end.  
**Repos:** backend (`audio-social-backend`) + mobile app (`audio-social-app`).  
**Status:** `Planned` (Arch Done) — Double-entry coin ledger, User coin balance, Admin grant API, and private mobile Wallet screen.  
**Do not** invent Prisma models or alternate APIs; read `prisma/schema.prisma` and this doc.

**Related docs:** [`../project-context.md`](../project-context.md), [`./admin.md`](./admin.md), [`./contests.md`](./contests.md)

**Terminology:**

| Term | Meaning |
|------|---------|
| **Coin Balance** | The current integer total of virtual coins owned by a user (`User.coinBalance`). |
| **Coin Transaction Ledger** | Immutable audit log table (`CoinTransaction`) recording every coin inflow (grant, reward) with running balance snapshot. |
| **Private Wallet** | User-facing mobile UI on `MyProfileScreen` showing coin balance and transaction history. Never visible on public profiles. |
| **Admin Grant** | Direct awarding of coins to a user by the Super Admin using `withAdminAuth`. |

---

## 1. Goal

1. Establish a secure **virtual coin currency system** for VibeOGram.
2. In v1, coins are **earned only** via:
   - **Contest Rewards** (winners confirmed by admin — see [`./contests.md`](./contests.md)).
   - **Super Admin Grants** (manual rewards or promotions).
3. Use a strict **double-entry ledger** pattern (`CoinTransaction`) so every coin balance change is recorded with an audit trail, description, and `balanceAfter` snapshot.
4. Provide Super Admin APIs under `withAdminAuth` to grant coins to any user.
5. Provide user APIs under `withAuth` to view personal private wallet balance and transaction history.
6. Provide a dedicated **Wallet Screen** in the mobile app, accessible exclusively from the user's own profile.
7. Enforce the invariant that coin balance can **never go negative** (`balance >= 0`).

```mermaid
flowchart TD
  subgraph Inflow [Earning Coins v1]
    Contest[Win Contest + admin confirm] --> Credit[WalletService.creditCoins]
    AdminGrant[Super Admin Manual Grant] --> Credit
  end

  Credit --> Transaction[Insert CoinTransaction Record]
  Transaction --> Update[Atomically Update User.coinBalance]

  subgraph Mobile Experience [Private Wallet]
    MyProfile[My Profile Screen] --> WalletBtn[Private Wallet Icon Button]
    WalletBtn --> WalletScreen[Wallet & History Screen /wallet]
    WalletScreen --> Display[View Balance 🪙 + Transaction History List]
  end
```

---

## 2. Scope

### In scope

| # | Item |
|---|------|
| 1 | **Prisma Migration**: Add `coinBalance Int @default(0)` to `User` and create `CoinTransaction` model + `CoinTransactionType` enum. |
| 2 | **Wallet Service**: Shared backend service `wallet.service.ts` with atomic transaction handling (`creditCoins`, `getBalance`, `getHistory`). |
| 3 | **Super Admin API**: `POST /api/admin/coins/grant` guarded by `withAdminAuth` to award coins to any user. |
| 4 | **User Wallet APIs**: `GET /api/me/wallet` returning balance and paginated history; update `GET /api/user` to include `coinBalance`. |
| 5 | **Mobile Profile Entry**: Add private wallet icon/button to `MyProfileScreen` (hidden on `PublicProfileScreen`). |
| 6 | **Mobile Wallet Screen**: Dedicated screen (`/wallet`) showing current coin balance card, explanatory info banner, and transaction list. |

### Out of scope (v1)

- Spending coins / purchasing digital goods (deferred to later monetization phase).
- Cashing out / withdrawing coins for fiat money.
- Peer-to-peer tipping between users.
- In-app purchase (IAP) integration with Apple StoreKit or Google Play Billing.

---

## 3. Locked Product Decisions

1. **Earned Only in v1:** In this phase, coins are acquired exclusively through **Contest Rewards** (admin grant after winner confirm) and **Super Admin Grants**. No spending or cashout mechanisms are enabled yet.
2. **Immutable Ledger Audit Trail:** Coin balances must **never** be updated in isolation. Any change to `User.coinBalance` MUST occur inside a Prisma interactive transaction (`prisma.$transaction`) alongside an inserted `CoinTransaction` record.
3. **No Negative Balance:** Under no circumstances can a user's coin balance drop below 0 (`balance >= 0`).
4. **Strictly Private:** A user's coin balance and transaction history are private financial data. They are **never** exposed on public artist profiles (`GET /api/users/:id`), public search, or feed cards.
5. **Admin Isolation:** Manual grants can only be issued by the authenticated Super Admin via `POST /api/admin/coins/grant` using `withAdminAuth`.
6. **Running Balance Snapshot:** Every ledger row stores `balanceAfter` at the moment of execution for instant reconciliation and fraud prevention.

---

## 4. Data Model & Prisma Migration

Add to `prisma/schema.prisma`:

```prisma
enum CoinTransactionType {
  CHALLENGE_REWARD
  ADMIN_GRANT
}

model CoinTransaction {
  id           String              @id @default(uuid(7)) @db.Uuid
  userId       String              @db.Uuid
  user         User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  /// Positive integer for earned coins in v1 (e.g. +500)
  amount       Int
  
  /// Running snapshot of balance after this transaction completed
  balanceAfter Int

  type         CoinTransactionType
  description  String              // e.g. "Awarded by admin: Great beta track feedback" or "Won 1st place in Summer Acoustic Jam"
  
  /// Optional reference key (e.g. challengeId)
  referenceId  String?
  
  createdAt    DateTime            @default(now())

  @@index([userId, createdAt(sort: Desc)])
}
```

Update `User` model in `prisma/schema.prisma`:
```prisma
model User {
  // ... existing fields
  coinBalance      Int               @default(0)
  coinTransactions CoinTransaction[]
  // ... existing relations
}
```

### Migration Instructions:
1. Run migration in development:
   ```sh
   npx prisma migrate dev --name add_coin_wallet_and_ledger
   ```
2. Generate the updated Prisma client:
   ```sh
   npx prisma generate
   ```

---

## 5. Backend Architecture & APIs

All endpoints follow `@/server/utils/route`, Zod validation, and the standard envelope:
`{ "success": true, "message": "...", "data": { ... } }`.

### 5.1 Super Admin: Grant Coins (`POST /api/admin/coins/grant`)
- **Auth:** Required via `withAdminAuth`.
- **Body Schema (Zod):**
  ```ts
  export const adminGrantCoinsSchema = z.object({
    userId: z.string().uuid(),
    amount: z.number().int().positive().max(100000), // Max 100k per grant
    reason: z.string().min(3).max(255).trim(),
  });
  ```
- **Service Behavior:**
  - Verifies target user exists.
  - Runs in `prisma.$transaction`:
    1. Updates `User`: `coinBalance = coinBalance + amount`.
    2. Inserts `CoinTransaction`:
       - `userId`: target user id
       - `amount`: `+amount`
       - `balanceAfter`: `user.coinBalance + amount`
       - `type`: `ADMIN_GRANT`
       - `description`: `reason`
  - Returns:
    ```json
    {
      "success": true,
      "message": "Coins granted successfully",
      "data": {
        "userId": "uuid",
        "grantedAmount": 500,
        "newBalance": 1500
      }
    }
    ```

### 5.2 Super Admin: View All Transactions (`GET /api/admin/coins/transactions`)
- **Auth:** Required via `withAdminAuth`.
- **Query:** `limit=20&cursor=...&userId=...`
- **Behavior:** Global audit view of all transactions across all users.

### 5.3 User: Get Private Wallet (`GET /api/me/wallet`)
- **Auth:** Required via `withAuth`.
- **Query:** `limit=20&cursor=...`
- **Behavior:**
  - Fetches viewer's `coinBalance`.
  - Fetches paginated list of `CoinTransaction` rows ordered by `createdAt desc`.
- **Response `200`:**
  ```ts
  export type WalletDto = {
    balance: number;
    transactions: {
      id: string;
      amount: number;
      balanceAfter: number;
      type: 'CHALLENGE_REWARD' | 'ADMIN_GRANT';
      description: string;
      createdAt: string;
    }[];
    nextCursor: string | null;
  };
  ```

### 5.4 Update Me Endpoint (`GET /api/user`)
- Add `coinBalance: number` to the private user session payload so mobile app header/profile has the current balance cached without an extra network call.

---

## 6. Shared Wallet Service (`wallet.service.ts`)

File: `src/server/modules/wallet/wallet.service.ts`

```ts
import { prisma } from '@/server/config/prisma';
import { AppError } from '@/server/utils/app-error';
import type { CoinTransactionType } from '@/generated/prisma';

export class WalletService {
  async creditCoins(params: {
    userId: string;
    amount: number;
    type: CoinTransactionType;
    description: string;
    referenceId?: string | null;
  }) {
    if (params.amount <= 0) {
      throw new AppError('Credit amount must be greater than zero', 400, 'BAD_REQUEST');
    }

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: params.userId },
        select: { id: true, coinBalance: true },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
      }

      const newBalance = user.coinBalance + params.amount;

      const [updatedUser, transaction] = await Promise.all([
        tx.user.update({
          where: { id: params.userId },
          data: { coinBalance: newBalance },
          select: { id: true, coinBalance: true },
        }),
        tx.coinTransaction.create({
          data: {
            userId: params.userId,
            amount: params.amount,
            balanceAfter: newBalance,
            type: params.type,
            description: params.description,
            referenceId: params.referenceId ?? null,
          },
        }),
      ]);

      return {
        newBalance: updatedUser.coinBalance,
        transaction,
      };
    });
  }

  async getWallet(userId: string, limit = 20, cursor?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coinBalance: true },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const items = await prisma.coinTransaction.findMany({
      where: { userId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    const hasNext = items.length > limit;
    const records = hasNext ? items.slice(0, limit) : items;
    const nextCursor = hasNext ? records[records.length - 1].id : null;

    return {
      balance: user.coinBalance,
      transactions: records,
      nextCursor,
    };
  }
}

export const walletService = new WalletService();
```

---

## 7. Mobile App Experience & Architecture

### 7.1 Profile Screen Integration
1. **`MyProfileScreen` (Owner View):**
   - Add a private **Wallet Button** (Wallet / Coins icon: 🪙) in the top-right header action row or right next to "Edit Profile".
   - Shows badge with cached balance: e.g. `🪙 1,500`.
   - Tapping navigates to `/wallet`.
2. **`PublicProfileScreen` (Other Users' View):**
   - Strictly **hidden**. No visitor can see another artist's coin balance or transactions.

### 7.2 Wallet Screen (`src/features/wallet/screens/wallet-screen.tsx`)
- **Route:** `/wallet` (Expo Router).
- **Header:** Back button + "Wallet & Rewards".
- **Balance Card (Hero):**
  - Gradient container with gold/purple accents.
  - Large label: `1,500` with gold coin icon.
  - Subtitle: *"Total Available Coins"*.
- **Info Banner:**
  - *"Earn coins by winning community vocal challenges and participating in events. Future perks coming soon!"*
- **Transaction History List:**
  - Title: *"Activity History"*.
  - Empty state: *"No transactions yet. Win your first challenge to earn coins!"*
  - Item Row:
    - Left: Icon badge (Trophy icon for `CHALLENGE_REWARD`, Star icon for `ADMIN_GRANT`).
    - Center: Transaction description and relative date (`2 days ago`).
    - Right: Bold green incoming pill: `+500 Coins`.

---

## 8. Implementation Checklist

### Backend:
- [ ] Update `prisma/schema.prisma` with `coinBalance` on `User` and `CoinTransaction` model.
- [ ] Run migration: `npx prisma migrate dev --name add_coin_wallet_and_ledger`.
- [ ] Run client generation: `npx prisma generate`.
- [ ] Create `src/server/modules/wallet/wallet.validator.ts`.
- [ ] Create `src/server/modules/wallet/wallet.service.ts`.
- [ ] Implement user route: `src/app/api/me/wallet/route.ts` (GET).
- [ ] Update `src/app/api/user/route.ts` to include `coinBalance` in payload.
- [ ] Implement admin route: `src/app/api/admin/coins/grant/route.ts` (POST with `withAdminAuth`).
- [ ] Register routes in OpenAPI under `src/server/openapi/paths/wallet.paths.ts`.

### Mobile App:
- [ ] Create `src/features/wallet/api/service.ts`, `hooks.ts`, and `types.ts`.
- [ ] Build `WalletScreen` in `src/features/wallet/screens/wallet-screen.tsx`.
- [ ] Add route `/wallet` in Expo Router (`src/app/wallet.tsx`).
- [ ] Add wallet button with coin badge to `MyProfileScreen` in `src/features/profile/screens/my-profile-screen.tsx`.
- [ ] Verify wallet icon is completely hidden on `PublicProfileScreen`.
