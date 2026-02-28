# StoriWrite Admin Panel — Specification

**Platform:** StoriWrite (อ่านและเขียนนิยายออนไลน์)  
**Version:** 1.0.0  
**Stack:** Next.js / TypeScript / Prisma ORM / PostgreSQL  
**Last Updated:** 2026-02-28

---

## Table of Contents

1. [Overview](#overview)
2. [Roles & Permissions](#roles--permissions)
3. [Admin Panel Modules](#admin-panel-modules)
   - [Dashboard & Analytics](#1-dashboard--analytics)
   - [User Management](#2-user-management)
   - [Content Management](#3-content-management)
   - [Report & Moderation](#4-report--moderation)
   - [Monetization & Finance](#5-monetization--finance)
   - [Notification Management](#6-notification-management)
   - [System Settings](#7-system-settings)
   - [Security & Audit](#8-security--audit)
4. [API Endpoints](#api-endpoints)
5. [Database Schema Overview](#database-schema-overview)
6. [Non-Functional Requirements](#non-functional-requirements)

---

## Overview

StoriWrite Admin Panel is a secure, role-based management interface for platform administrators and moderators. It provides full control over users, content, transactions, and system configuration.

**Admin Panel Base URL:** `/admin`  
**Authentication:** Session-based with 2FA required for Admin role  
**Access Control:** Role-Based Access Control (RBAC)

---

## Roles & Permissions

| Role        | Description                          | Access Level |
|-------------|--------------------------------------|--------------|
| `superadmin`| Full access to all modules           | All          |
| `admin`     | Full access except system internals  | High         |
| `moderator` | Content & report management only     | Medium       |
| `finance`   | Monetization & transaction read/write| Medium       |
| `viewer`    | Read-only dashboard & analytics      | Low          |

---

## Admin Panel Modules

### 1. Dashboard & Analytics

**Route:** `/admin/dashboard`

#### Features
- [ ] Overview cards: Total Users, Active Users (DAU/MAU), Total Novels, Total Chapters
- [ ] Revenue summary: Daily / Monthly / Yearly
- [ ] Top 10 Popular Novels (by views, likes, comments)
- [ ] Top 10 Writers (by followers, novel count)
- [ ] New registrations chart (line chart, 30-day rolling)
- [ ] Content upload trend (novels/chapters per day)
- [ ] Report queue count (pending moderation)

#### Data Sources
- Aggregated from `users`, `novels`, `chapters`, `transactions`, `reports` tables
- Cached with Redis (TTL: 5 minutes)

---

### 2. User Management

**Route:** `/admin/users`

#### Features
- [ ] List all users with search, filter (role, status, date joined)
- [ ] Pagination (default 50 per page)
- [ ] View user profile detail: bio, stats, novels, comments
- [ ] Edit user role (reader → writer → moderator)
- [ ] Suspend / Ban account (with reason & duration)
- [ ] Unban / Restore account
- [ ] Force logout (invalidate all sessions)
- [ ] Reset password (send email link)
- [ ] View login history (IP, device, timestamp)
- [ ] Export user list as CSV

#### User Status Types
| Status      | Description                        |
|-------------|------------------------------------|
| `active`    | Normal account                     |
| `suspended` | Temporarily restricted             |
| `banned`    | Permanently banned                 |
| `unverified`| Email not yet verified             |
| `deleted`   | Soft-deleted account               |

---

### 3. Content Management

**Route:** `/admin/content`

#### 3.1 Novels
- [ ] List all novels with search, filter (genre, status, rating, language)
- [ ] View novel detail with all chapters
- [ ] Approve / Reject novel submission (for review-required categories)
- [ ] Feature novel (set as Featured / Trending / Editor's Pick)
- [ ] Set content warning labels (Violence, Adult, Sensitive)
- [ ] Hide / Unpublish a novel (with reason)
- [ ] Delete novel (soft delete, requires confirmation)
- [ ] Manage genres / categories / tags (CRUD)

#### 3.2 Chapters
- [ ] List chapters per novel
- [ ] Hide / Restore individual chapters
- [ ] View chapter content (read-only)

#### 3.3 Comments
- [ ] List all comments with search
- [ ] Delete / Hide comment
- [ ] Bulk delete by user

#### Novel Status Types
| Status       | Description                         |
|--------------|-------------------------------------|
| `draft`      | Not yet published                   |
| `published`  | Live and visible                    |
| `under_review` | Awaiting moderation              |
| `hidden`     | Admin-hidden, not visible           |
| `completed`  | Story marked complete by writer     |
| `deleted`    | Soft deleted                        |

---

### 4. Report & Moderation

**Route:** `/admin/reports`

#### Features
- [ ] Report queue with priority sorting (High / Medium / Low)
- [ ] Report types: `spam`, `hate_speech`, `adult_content`, `copyright`, `harassment`, `other`
- [ ] View reported content in context
- [ ] Assign report to moderator
- [ ] Actions: Dismiss, Warn User, Remove Content, Ban User
- [ ] Track resolution history per report
- [ ] Auto-flag keywords (configurable list)
- [ ] Bulk action on multiple reports

#### Report Status
| Status       | Description                  |
|--------------|------------------------------|
| `pending`    | Awaiting review              |
| `in_review`  | Assigned to moderator        |
| `resolved`   | Action taken                 |
| `dismissed`  | No action required           |

---

### 5. Monetization & Finance

**Route:** `/admin/finance`

#### 5.1 Coins & Tokens
- [ ] View total coins in circulation
- [ ] Manually grant / deduct coins from user
- [ ] View coin transaction history per user
- [ ] Configure coin packages (price, amount, bonus)

#### 5.2 Premium Subscriptions
- [ ] List active / expired / cancelled subscriptions
- [ ] Create / Edit subscription plans (Monthly, Quarterly, Yearly)
- [ ] Cancel subscription (with refund flag)

#### 5.3 Writer Payouts
- [ ] View writer earnings (per novel, per period)
- [ ] Export payout report as CSV
- [ ] Mark payouts as processed
- [ ] Configure revenue share percentage

#### 5.4 Transactions
- [ ] Full transaction log (filter by type, status, date)
- [ ] Transaction types: `purchase_coins`, `unlock_chapter`, `subscription`, `payout`
- [ ] Transaction status: `pending`, `completed`, `failed`, `refunded`
- [ ] Refund transaction (with reason)

---

### 6. Notification Management

**Route:** `/admin/notifications`

#### Features
- [ ] Send broadcast notification (Push / In-App / Email)
- [ ] Target audience: All users / Specific role / Specific user
- [ ] Schedule notification (datetime picker)
- [ ] View notification delivery stats (sent, opened, failed)
- [ ] Manage email templates (Welcome, Reset Password, New Chapter, etc.)
- [ ] Manage in-app announcement banners (title, message, CTA, expiry)

---

### 7. System Settings

**Route:** `/admin/settings`

#### 7.1 General
- [ ] Platform name, logo, favicon
- [ ] SEO defaults (meta title, description, OG image)
- [ ] Maintenance mode toggle (with custom message)
- [ ] Default language & timezone

#### 7.2 Content Policies
- [ ] Max upload size (images, cover art)
- [ ] Allowed file types
- [ ] Profanity filter word list (add/remove)
- [ ] Minimum age for Adult content (default: 18+)

#### 7.3 Feature Flags
- [ ] Toggle: Enable/Disable user registration
- [ ] Toggle: Enable/Disable novel submission
- [ ] Toggle: Enable/Disable comments
- [ ] Toggle: Enable/Disable monetization
- [ ] Toggle: Enable/Disable AI writing assistant

#### 7.4 Integrations
- [ ] Payment gateway configuration (keys, webhook URLs)
- [ ] Email provider (SMTP / SendGrid / Resend)
- [ ] Storage provider (S3 / Cloudflare R2 / local)
- [ ] CDN URL configuration
- [ ] Google Analytics / GA4 Measurement ID

---

### 8. Security & Audit

**Route:** `/admin/security`

#### Features
- [ ] Admin activity log (who did what, when, IP)
- [ ] Failed login attempts monitor
- [ ] IP Blacklist management (add/remove/view)
- [ ] Active admin sessions (force logout specific session)
- [ ] 2FA enforcement settings per role
- [ ] API Key management (generate, revoke)
- [ ] PDPA / Data export request queue (user data requests)
- [ ] PDPA / Data deletion request queue

---

## API Endpoints

All admin endpoints are prefixed with `/api/admin/` and require:
- Valid session token
- Role: `admin`, `superadmin`, or scoped role
- Header: `X-Admin-Token` or cookie-based session

| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| GET    | `/api/admin/dashboard/stats`      | Get dashboard statistics       |
| GET    | `/api/admin/users`                | List users                     |
| PATCH  | `/api/admin/users/:id/status`     | Update user status             |
| GET    | `/api/admin/novels`               | List novels                    |
| PATCH  | `/api/admin/novels/:id/status`    | Update novel status            |
| GET    | `/api/admin/reports`              | List reports                   |
| PATCH  | `/api/admin/reports/:id/resolve`  | Resolve a report               |
| GET    | `/api/admin/transactions`         | List transactions              |
| POST   | `/api/admin/notifications/send`   | Send broadcast notification    |
| GET    | `/api/admin/audit-logs`           | Get audit logs                 |
| PATCH  | `/api/admin/settings`             | Update system settings         |

---

## Database Schema Overview

```prisma
model AdminAuditLog {
  id          String   @id @default(cuid())
  adminId     String
  action      String   // e.g. "BAN_USER", "DELETE_NOVEL"
  targetType  String   // e.g. "User", "Novel"
  targetId    String
  metadata    Json?    // Additional context
  ipAddress   String?
  createdAt   DateTime @default(now())

  admin       User     @relation(fields: [adminId], references: [id])
}

model Report {
  id          String       @id @default(cuid())
  reporterId  String
  targetType  String       // "Novel" | "Chapter" | "Comment" | "User"
  targetId    String
  reason      String       // spam | hate_speech | adult_content | etc.
  description String?
  status      ReportStatus @default(pending)
  assignedTo  String?
  resolvedAt  DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

enum ReportStatus {
  pending
  in_review
  resolved
  dismissed
}
