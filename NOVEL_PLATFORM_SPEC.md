# Novel Platform — Full Technical Specification
> สำหรับ AI Coding Assistant (Claude / Cursor)  
> Version: 1.0 | Date: 2026-02-26  
> Stack: Next.js 15, TypeScript, Supabase (PostgreSQL), Prisma ORM, NextAuth.js v5, Tiptap, Tailwind CSS, shadcn/ui, Vercel

---

## 1. Project Overview

### 1.1 Vision
สร้าง platform อ่านและเขียนนิยายออนไลน์ คล้าย Wattpad / Webnovel สำหรับนักเขียนและนักอ่านภาษาไทย รองรับระบบสมาชิก 3 ประเภท (Reader, Writer, Admin) พร้อม community features

### 1.2 Core User Roles
| Role | คำอธิบาย |
|------|----------|
| `READER` | สมัครสมาชิก, อ่านนิยาย, bookmark, comment, follow นักเขียน |
| `WRITER` | ทุกอย่างของ Reader + สร้าง/เขียน/จัดการนิยายของตัวเอง |
| `ADMIN` | จัดการทุกอย่างในระบบ, ดู dashboard, approve/remove content |

### 1.3 Tech Stack
```
Frontend + Backend : Next.js 15 (App Router, Server Actions)
Language           : TypeScript (strict mode)
Database           : PostgreSQL via Supabase
ORM                : Prisma ORM
Authentication     : NextAuth.js v5 (Auth.js)
Rich Text Editor   : Tiptap
UI Library         : Tailwind CSS + shadcn/ui
File Storage       : Supabase Storage
Form Validation    : Zod + React Hook Form
State Management   : Zustand
Deployment         : Vercel
```

---

## 2. Environment Setup

### 2.1 Create Project
```bash
npx create-next-app@latest novel-platform --typescript --tailwind --app --src-dir
cd novel-platform
```

### 2.2 Install Dependencies
```bash
# Core
npm install @prisma/client prisma
npm install next-auth@beta @auth/prisma-adapter
npm install @supabase/supabase-js

# UI
npx shadcn@latest init
npm install lucide-react
npm install class-variance-authority clsx tailwind-merge

# Editor
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
npm install @tiptap/extension-image @tiptap/extension-link
npm install @tiptap/extension-placeholder @tiptap/extension-character-count
npm install @tiptap/extension-underline @tiptap/extension-text-align

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# State
npm install zustand

# Utilities
npm install slugify date-fns nanoid
npm install sharp  # image optimization
```

### 2.3 Environment Variables (.env.local)
```env
# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="StoriWrite"
```

---

## 3. Database Design (Prisma Schema)

### 3.1 Full Schema
```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────

enum Role {
  READER
  WRITER
  ADMIN
}

enum NovelStatus {
  DRAFT
  ONGOING
  COMPLETED
  HIATUS
}

enum NotificationType {
  NEW_CHAPTER      // มี chapter ใหม่จากนิยายที่ bookmark
  NEW_COMMENT      // มี comment ใน chapter ของฉัน
  NEW_FOLLOWER     // มีคนมา follow
  NEW_VOTE         // มีคน vote นิยายของฉัน
}

enum ReportStatus {
  PENDING
  REVIEWED
  RESOLVED
}

enum ReportReason {
  INAPPROPRIATE_CONTENT
  SPAM
  COPYRIGHT
  OTHER
}

// ─────────────────────────────────────────
// USER
// ─────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  username      String    @unique
  displayName   String?
  passwordHash  String?
  avatar        String?
  bio           String?   @db.Text
  role          Role      @default(READER)
  isVerified    Boolean   @default(false)
  isBanned      Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  accounts      Account[]
  sessions      Session[]
  novels        Novel[]
  bookmarks     Bookmark[]
  comments      Comment[]
  readHistory   ReadHistory[]
  following     Follow[]       @relation("Follower")
  followers     Follow[]       @relation("Following")
  votes         Vote[]
  notifications Notification[]
  reports       Report[]       @relation("Reporter")
  reportedItems Report[]       @relation("ReportedUser")

  @@index([username])
  @@index([email])
}

// NextAuth required models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ─────────────────────────────────────────
// NOVEL
// ─────────────────────────────────────────

model Novel {
  id          String      @id @default(cuid())
  title       String
  slug        String      @unique
  synopsis    String      @db.Text
  cover       String?
  status      NovelStatus @default(DRAFT)
  language    String      @default("th")
  views       Int         @default(0)
  isPublished Boolean     @default(false)
  isFeatured  Boolean     @default(false)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  // Relations
  authorId    String
  author      User          @relation(fields: [authorId], references: [id])
  chapters    Chapter[]
  genres      GenreOnNovel[]
  tags        TagOnNovel[]
  bookmarks   Bookmark[]
  votes       Vote[]
  reports     Report[]      @relation("ReportedNovel")

  @@index([slug])
  @@index([authorId])
  @@index([status, isPublished])
  @@index([views])
}

model Chapter {
  id            String    @id @default(cuid())
  title         String
  content       Json      // Tiptap JSON output
  contentText   String?   @db.Text  // Plain text for search
  chapterNumber Int
  wordCount     Int       @default(0)
  isPublished   Boolean   @default(false)
  publishedAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  novelId       String
  novel         Novel       @relation(fields: [novelId], references: [id], onDelete: Cascade)
  comments      Comment[]
  readHistory   ReadHistory[]

  @@unique([novelId, chapterNumber])
  @@index([novelId, isPublished])
}

// ─────────────────────────────────────────
// TAXONOMY
// ─────────────────────────────────────────

model Genre {
  id      String         @id @default(cuid())
  name    String         @unique
  slug    String         @unique
  icon    String?
  novels  GenreOnNovel[]
}

model Tag {
  id      String       @id @default(cuid())
  name    String       @unique
  slug    String       @unique
  novels  TagOnNovel[]
}

model GenreOnNovel {
  novelId  String
  genreId  String
  novel    Novel  @relation(fields: [novelId], references: [id], onDelete: Cascade)
  genre    Genre  @relation(fields: [genreId], references: [id])

  @@id([novelId, genreId])
}

model TagOnNovel {
  novelId  String
  tagId    String
  novel    Novel  @relation(fields: [novelId], references: [id], onDelete: Cascade)
  tag      Tag    @relation(fields: [tagId], references: [id])

  @@id([novelId, tagId])
}

// ─────────────────────────────────────────
// READER ACTIVITY
// ─────────────────────────────────────────

model Bookmark {
  userId    String
  novelId   String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  novel     Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)

  @@id([userId, novelId])
  @@index([userId])
}

model Vote {
  userId    String
  novelId   String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  novel     Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)

  @@id([userId, novelId])
}

model Comment {
  id        String   @id @default(cuid())
  content   String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  isHidden  Boolean  @default(false)

  userId    String
  chapterId String
  parentId  String?   // for nested replies
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  chapter   Chapter   @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  parent    Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies   Comment[] @relation("CommentReplies")
  reports   Report[]  @relation("ReportedComment")

  @@index([chapterId])
  @@index([userId])
}

model ReadHistory {
  userId      String
  chapterId   String
  progress    Int      @default(0)  // scroll % 0-100
  lastReadAt  DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  chapter     Chapter  @relation(fields: [chapterId], references: [id], onDelete: Cascade)

  @@id([userId, chapterId])
  @@index([userId, lastReadAt])
}

model Follow {
  followerId  String
  followingId String
  createdAt   DateTime @default(now())
  follower    User     @relation("Follower",  fields: [followerId],  references: [id], onDelete: Cascade)
  following   User     @relation("Following", fields: [followingId], references: [id], onDelete: Cascade)

  @@id([followerId, followingId])
  @@index([followingId])
}

// ─────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────

model Notification {
  id        String           @id @default(cuid())
  type      NotificationType
  message   String
  link      String?
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
}

// ─────────────────────────────────────────
// MODERATION
// ─────────────────────────────────────────

model Report {
  id           String       @id @default(cuid())
  reason       ReportReason
  description  String?      @db.Text
  status       ReportStatus @default(PENDING)
  createdAt    DateTime     @default(now())
  resolvedAt   DateTime?

  reporterId     String
  reporter       User     @relation("Reporter",       fields: [reporterId],   references: [id])
  reportedUserId String?
  reportedUser   User?    @relation("ReportedUser",   fields: [reportedUserId], references: [id])
  reportedNovelId String?
  reportedNovel   Novel?  @relation("ReportedNovel",  fields: [reportedNovelId], references: [id])
  reportedCommentId String?
  reportedComment   Comment? @relation("ReportedComment", fields: [reportedCommentId], references: [id])

  @@index([status])
}
```

---

## 4. API Design

### 4.1 Authentication API

| Method | Endpoint | Body | Response | Access |
|--------|----------|------|----------|--------|
| POST | `/api/auth/register` | `{email, username, password, role}` | `{user}` | Public |
| POST | `/api/auth/[...nextauth]` | NextAuth handler | Session | Public |
| GET | `/api/auth/session` | — | `{user, role}` | Auth |

#### POST /api/auth/register
```typescript
// Request Body
{
  email: string       // valid email
  username: string    // 3-20 chars, alphanumeric + underscore
  password: string    // min 8 chars
  role: "READER" | "WRITER"
  displayName?: string
}

// Response 201
{
  success: true,
  user: { id, email, username, role }
}

// Response 400
{
  success: false,
  error: "EMAIL_EXISTS" | "USERNAME_EXISTS" | "VALIDATION_ERROR"
}
```

---

### 4.2 Novel API

| Method | Endpoint | Body/Query | Response | Access |
|--------|----------|------------|----------|--------|
| GET | `/api/novels` | `?page&limit&genre&status&sort&search` | `{novels[], total, pages}` | Public |
| GET | `/api/novels/[slug]` | — | `{novel, author, chapters}` | Public |
| POST | `/api/novels` | `{title, synopsis, cover, genreIds, tags}` | `{novel}` | WRITER |
| PATCH | `/api/novels/[id]` | partial novel fields | `{novel}` | WRITER (owner) |
| DELETE | `/api/novels/[id]` | — | `{success}` | WRITER (owner) / ADMIN |
| POST | `/api/novels/[id]/publish` | — | `{novel}` | WRITER (owner) |

#### GET /api/novels (Query Parameters)
```
page       : number   (default: 1)
limit      : number   (default: 20, max: 50)
genre      : string   (genre slug)
status     : ONGOING | COMPLETED | HIATUS
sort       : latest | popular | top_voted | most_read
search     : string   (search in title, synopsis)
authorId   : string   (filter by author)
```

#### Response Schema — Novel Object
```typescript
{
  id: string
  title: string
  slug: string
  synopsis: string
  cover: string | null
  status: NovelStatus
  views: number
  voteCount: number
  chapterCount: number
  lastChapterAt: Date | null
  createdAt: Date
  author: {
    id: string
    username: string
    displayName: string | null
    avatar: string | null
  }
  genres: { id: string; name: string; slug: string }[]
  tags: { id: string; name: string }[]
}
```

---

### 4.3 Chapter API

| Method | Endpoint | Body | Response | Access |
|--------|----------|------|----------|--------|
| GET | `/api/novels/[id]/chapters` | — | `{chapters[]}` | Public |
| GET | `/api/chapters/[id]` | — | `{chapter, prev, next}` | Public (published) |
| POST | `/api/novels/[id]/chapters` | `{title, content, chapterNumber}` | `{chapter}` | WRITER |
| PATCH | `/api/chapters/[id]` | partial chapter fields | `{chapter}` | WRITER (owner) |
| DELETE | `/api/chapters/[id]` | — | `{success}` | WRITER (owner) / ADMIN |
| POST | `/api/chapters/[id]/publish` | — | `{chapter}` | WRITER (owner) |

#### POST /api/novels/[id]/chapters
```typescript
// Request Body
{
  title: string           // required
  content: object         // Tiptap JSON
  chapterNumber: number   // auto-increment or manual
  isDraft?: boolean       // default: true (save as draft)
}

// Response 201
{
  success: true,
  chapter: { id, title, chapterNumber, isPublished, createdAt }
}
```

---

### 4.4 Reader Activity API

| Method | Endpoint | Body | Response | Access |
|--------|----------|------|----------|--------|
| POST | `/api/bookmarks` | `{novelId}` | `{bookmarked: true}` | AUTH |
| DELETE | `/api/bookmarks/[novelId]` | — | `{bookmarked: false}` | AUTH |
| GET | `/api/bookmarks` | — | `{novels[]}` | AUTH |
| POST | `/api/votes` | `{novelId}` | `{voted, voteCount}` | AUTH |
| DELETE | `/api/votes/[novelId]` | — | `{voted, voteCount}` | AUTH |
| POST | `/api/history` | `{chapterId, progress}` | `{success}` | AUTH |
| GET | `/api/history` | — | `{history[]}` | AUTH |
| POST | `/api/follow` | `{userId}` | `{following: true}` | AUTH |
| DELETE | `/api/follow/[userId]` | — | `{following: false}` | AUTH |
| POST | `/api/novels/[id]/view` | — | `{views}` | Public |

---

### 4.5 Comment API

| Method | Endpoint | Body | Response | Access |
|--------|----------|------|----------|--------|
| GET | `/api/chapters/[id]/comments` | `?page&limit` | `{comments[], total}` | Public |
| POST | `/api/chapters/[id]/comments` | `{content, parentId?}` | `{comment}` | AUTH |
| PATCH | `/api/comments/[id]` | `{content}` | `{comment}` | AUTH (owner) |
| DELETE | `/api/comments/[id]` | — | `{success}` | AUTH (owner) / ADMIN |

#### Response Schema — Comment Object
```typescript
{
  id: string
  content: string
  createdAt: Date
  user: {
    id: string
    username: string
    avatar: string | null
  }
  replies?: Comment[]
  replyCount: number
}
```

---

### 4.6 Upload API

| Method | Endpoint | Body | Response | Access |
|--------|----------|------|----------|--------|
| POST | `/api/upload/cover` | `FormData: file` | `{url}` | WRITER |
| POST | `/api/upload/avatar` | `FormData: file` | `{url}` | AUTH |

#### File Constraints
```
Cover Image  : JPG/PNG/WEBP, max 2MB, resize to 400x600px
Avatar       : JPG/PNG/WEBP, max 1MB, resize to 200x200px
Storage Path : covers/{userId}/{novelId}.webp
               avatars/{userId}.webp
```

---

### 4.7 Notification API

| Method | Endpoint | Query | Response | Access |
|--------|----------|-------|----------|--------|
| GET | `/api/notifications` | `?unreadOnly` | `{notifications[], unreadCount}` | AUTH |
| PATCH | `/api/notifications/read-all` | — | `{success}` | AUTH |
| PATCH | `/api/notifications/[id]/read` | — | `{success}` | AUTH |

---

### 4.8 Admin API

| Method | Endpoint | Query | Response | Access |
|--------|----------|-------|----------|--------|
| GET | `/api/admin/stats` | — | `{userCount, novelCount, ...}` | ADMIN |
| GET | `/api/admin/users` | `?page&search&role` | `{users[], total}` | ADMIN |
| PATCH | `/api/admin/users/[id]` | `{isBanned, role}` | `{user}` | ADMIN |
| GET | `/api/admin/novels` | `?page&status` | `{novels[], total}` | ADMIN |
| PATCH | `/api/admin/novels/[id]` | `{isFeatured, isPublished}` | `{novel}` | ADMIN |
| GET | `/api/admin/reports` | `?status` | `{reports[], total}` | ADMIN |
| PATCH | `/api/admin/reports/[id]` | `{status}` | `{report}` | ADMIN |

---

## 5. Frontend Pages & Components

### 5.1 Page Map

#### Public Pages (No Auth Required)
```
/                          # Home — Featured, Popular, New Updates
/explore                   # Browse all novels with filters
/novel/[slug]              # Novel detail page
/novel/[slug]/[chapterId]  # Chapter reader
/author/[username]         # Author public profile
/genre/[slug]              # Novels by genre
/search                    # Search results
/login                     # Login page
/register                  # Register page (Reader or Writer)
```

#### Reader Pages (Auth Required)
```
/library                   # Bookmarked novels + Reading history
/notifications             # Notification list
/settings/profile          # Edit profile, avatar, bio
/settings/account          # Change email, password
```

#### Writer Pages (WRITER Role Required)
```
/writer/dashboard          # Stats overview
/writer/novels             # All my novels list
/writer/novel/new          # Create new novel
/writer/novel/[id]/edit    # Edit novel info
/writer/novel/[id]/chapters # Manage chapters list
/writer/novel/[id]/chapter/new        # Write new chapter
/writer/novel/[id]/chapter/[cid]/edit # Edit chapter
```

#### Admin Pages (ADMIN Role Required)
```
/admin/dashboard           # Platform stats
/admin/users               # User management
/admin/novels              # Novel management
/admin/reports             # Report queue
/admin/genres              # Manage genres
```

---

### 5.2 Key Components

#### Layout Components
```
components/layout/
├── Navbar.tsx             # Top nav, search bar, user menu
├── Sidebar.tsx            # Genre filter sidebar (explore page)
├── Footer.tsx
└── WriterLayout.tsx       # Sidebar navigation for writer dashboard
```

#### Novel Components
```
components/novel/
├── NovelCard.tsx          # Card: cover, title, author, stats, genres
├── NovelCardCompact.tsx   # Compact list item version
├── NovelGrid.tsx          # Grid of NovelCards
├── NovelDetail.tsx        # Full novel info + chapter list
├── NovelForm.tsx          # Create/Edit novel form
├── ChapterList.tsx        # Chapter list with status indicators
└── NovelStatusBadge.tsx   # ONGOING / COMPLETED / HIATUS badge
```

#### Reader Components
```
components/reader/
├── ChapterReader.tsx      # Main reading view (render Tiptap JSON)
├── ReaderSettings.tsx     # Font size, theme, line spacing
├── ChapterNav.tsx         # Prev / Next chapter navigation
├── ReadingProgress.tsx    # Progress bar at top
└── TableOfContents.tsx    # Chapter list sidebar drawer
```

#### Editor Components
```
components/editor/
├── TiptapEditor.tsx       # Main writing editor
├── EditorToolbar.tsx      # Formatting toolbar
├── WordCounter.tsx        # Word / character count
└── AutoSave.tsx           # Auto-save draft to API every 30s
```

#### Community Components
```
components/community/
├── CommentSection.tsx     # Comment list + form
├── CommentItem.tsx        # Single comment with reply button
├── VoteButton.tsx         # Like/Vote toggle
├── BookmarkButton.tsx     # Bookmark toggle
├── FollowButton.tsx       # Follow/Unfollow toggle
└── NotificationBell.tsx   # Bell icon + unread count badge
```

---

## 6. Authentication Configuration

### 6.1 NextAuth.js v5 Config
```typescript
// lib/auth.ts
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user || !user.passwordHash) return null
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) return null
        if (user.isBanned) throw new Error("ACCOUNT_BANNED")
        return user
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.username = (user as any).username
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.username = token.username as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
```

### 6.2 Middleware (Role-based Protection)
```typescript
// middleware.ts
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Writer routes
  if (pathname.startsWith("/writer")) {
    if (!session) return NextResponse.redirect(new URL("/login", req.url))
    if (session.user.role === "READER") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  // Admin routes
  if (pathname.startsWith("/admin")) {
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  // Auth-required routes
  const authRequired = ["/library", "/notifications", "/settings"]
  if (authRequired.some((p) => pathname.startsWith(p))) {
    if (!session) return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

---

## 7. Zod Validation Schemas

```typescript
// lib/validations.ts
import { z } from "zod"

export const registerSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  username: z
    .string()
    .min(3, "ต้องมีอย่างน้อย 3 ตัวอักษร")
    .max(20, "ต้องไม่เกิน 20 ตัวอักษร")
    .regex(/^[a-zA-Z0-9_]+$/, "ใช้ได้เฉพาะ a-z, 0-9, _"),
  password: z.string().min(8, "ต้องมีอย่างน้อย 8 ตัวอักษร"),
  role: z.enum(["READER", "WRITER"]),
  displayName: z.string().max(50).optional(),
})

export const novelSchema = z.object({
  title: z.string().min(1, "กรุณาใส่ชื่อนิยาย").max(200),
  synopsis: z.string().min(20, "Synopsis ต้องมีอย่างน้อย 20 ตัวอักษร").max(2000),
  status: z.enum(["DRAFT", "ONGOING", "COMPLETED", "HIATUS"]),
  genreIds: z.array(z.string()).min(1, "เลือกอย่างน้อย 1 genre").max(3),
  tags: z.array(z.string()).max(10),
  language: z.string().default("th"),
})

export const chapterSchema = z.object({
  title: z.string().min(1, "กรุณาใส่ชื่อ Chapter").max(200),
  content: z.object({}).passthrough(),   // Tiptap JSON
  chapterNumber: z.number().int().positive(),
  isDraft: z.boolean().default(true),
})

export const commentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().optional(),
})

export const profileSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
})
```

---

## 8. Prisma Client Setup

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

---

## 9. Supabase Storage Setup

```typescript
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function uploadCover(
  file: File,
  userId: string,
  novelId: string
): Promise<string> {
  const ext = file.name.split(".").pop()
  const path = `covers/${userId}/${novelId}.${ext}`

  const { error } = await supabase.storage
    .from("novel-assets")
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from("novel-assets").getPublicUrl(path)
  return data.publicUrl
}

export async function uploadAvatar(
  file: File,
  userId: string
): Promise<string> {
  const path = `avatars/${userId}.webp`
  const { error } = await supabase.storage
    .from("novel-assets")
    .upload(path, file, { upsert: true })

  if (error) throw error
  const { data } = supabase.storage.from("novel-assets").getPublicUrl(path)
  return data.publicUrl
}
```

---

## 10. Seed Data (Genres)

```typescript
// prisma/seed.ts
import { prisma } from "../lib/prisma"

const genres = [
  { name: "แฟนตาซี",      slug: "fantasy",      icon: "✨" },
  { name: "โรแมนติก",      slug: "romance",      icon: "💕" },
  { name: "แอคชัน",        slug: "action",       icon: "⚔️" },
  { name: "ลึกลับ/สืบสวน", slug: "mystery",      icon: "🔍" },
  { name: "ไซไฟ",          slug: "sci-fi",       icon: "🚀" },
  { name: "สยองขวัญ",      slug: "horror",       icon: "👻" },
  { name: "ชีวิต/ครอบครัว", slug: "slice-of-life", icon: "🏠" },
  { name: "ดราม่า",        slug: "drama",        icon: "🎭" },
  { name: "ตลก",           slug: "comedy",       icon: "😄" },
  { name: "Boys Love",     slug: "bl",           icon: "💙" },
  { name: "Girls Love",    slug: "gl",           icon: "💜" },
  { name: "ผจญภัย",        slug: "adventure",    icon: "🗺️" },
]

async function main() {
  console.log("Seeding genres...")
  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: {},
      create: genre,
    })
  }
  console.log("✅ Seed complete")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Add to `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts"
  }
}
```

---

## 11. Development Workflow

### 11.1 Git Branch Strategy
```
main          # Production (auto-deploy to Vercel)
develop       # Integration branch
feature/*     # New features
fix/*         # Bug fixes
```

### 11.2 Recommended Development Order
```
Phase 1 — Foundation (Week 1-2)
  ✅ Step 1: Setup Next.js + Tailwind + shadcn/ui
  ✅ Step 2: Setup Prisma + Supabase + run migration
  ✅ Step 3: NextAuth.js v5 — Credentials + Google
  ✅ Step 4: Role-based Middleware
  ✅ Step 5: Global Layout (Navbar, Footer)
  ✅ Step 6: Register / Login pages

Phase 2 — Writer System (Week 3-4)
  ✅ Step 7:  Writer Dashboard layout
  ✅ Step 8:  Create Novel form (with cover upload)
  ✅ Step 9:  Tiptap Editor for chapter writing
  ✅ Step 10: Chapter list management
  ✅ Step 11: Publish/Draft toggle
  ✅ Step 12: Writer's novel management page

Phase 3 — Reader System (Week 5-6)
  ✅ Step 13: Home page — Featured, Popular, New Updates
  ✅ Step 14: Explore page with genre/status filters
  ✅ Step 15: Novel Detail page (synopsis + chapter list)
  ✅ Step 16: Chapter Reader UI
  ✅ Step 17: Bookmark + ReadHistory
  ✅ Step 18: Search functionality

Phase 4 — Community (Week 7-8)
  ✅ Step 19: Comment system (chapter-level)
  ✅ Step 20: Vote/Like novel
  ✅ Step 21: Follow writer
  ✅ Step 22: Author public profile page
  ✅ Step 23: Notification system

Phase 5 — Admin & SEO (Week 9-10)
  ✅ Step 24: Admin dashboard + user management
  ✅ Step 25: Content moderation + report system
  ✅ Step 26: SEO metadata + sitemap
  ✅ Step 27: Performance optimization + image lazy load
  ✅ Step 28: Mobile responsive QA
```

---

## 12. Infrastructure & Deployment

### 12.1 Vercel Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Environment variables: add via Vercel Dashboard
# Project Settings > Environment Variables
```

### 12.2 Supabase Setup
1. Create new project at supabase.com
2. Go to **Settings > Database** → copy `Connection string (URI)`
3. Create Storage bucket named `novel-assets` (set to public)
4. Set bucket policy to allow authenticated uploads

### 12.3 Monthly Cost Estimate
| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby (Free) | $0 |
| Supabase | Free (500MB DB, 1GB Storage) | $0 |
| Domain | .com / .co.th | ~$1/month |
| **Total MVP** | | **~$1/month** |

---

## 13. Future Enhancements (Post-MVP)

- [ ] **AI Writing Assistant** — Tiptap + OpenAI API สำหรับแนะนำประโยค
- [ ] **Reading Mode PWA** — Offline reading cache
- [ ] **Premium Membership** — Stripe subscription, unlock early chapters
- [ ] **Writer Analytics** — View graph, retention rate per chapter
- [ ] **Push Notifications** — Web Push API
- [ ] **Mobile App** — React Native (reuse API layer ทั้งหมด)
- [ ] **Thai NLP Search** — Full-text search รองรับภาษาไทย
- [ ] **Gamification** — XP, badges, leaderboard

---

*Generated for StoriWrite Platform — Build with ❤️ using Next.js 15 + Supabase*
