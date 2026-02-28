# Writer & Reader Features Specification
> Novel Platform (StoriWrite) | Version 1.1 | Date: 2026-02-28  
> กลุ่มเป้าหมาย: นักเขียนและนักอ่านชาวไทย  
> Stack: Next.js 16, TypeScript, Prisma, Supabase, Tiptap

---

## 1. Feature Overview Matrix

| Feature | Dek-D | readAwrite | Wattpad | **Platform นี้** |
|---------|-------|-----------|---------|----------------|
| Quick Resume Writing | ❌ | ❌ | ❌ | ✅ |
| Auto-save + Version History | บางส่วน | ❌ | ❌ | ✅ |
| Writing Streak + Goal | ❌ | ❌ | บางส่วน | ✅ |
| Writing Reminder (ตั้งเวลา) | ❌ | ❌ | ❌ | ✅ |
| Inactive Writer Notification | ❌ | ❌ | ❌ | ✅ |
| Schedule Publish Chapter | ❌ | ❌ | ❌ | ✅ |
| Writer Analytics (Deep) | ❌ | ❌ | บางส่วน | ✅ |
| Character Sheet / Planner | ❌ | ❌ | ❌ | ✅ |
| Reading Resume (อ่านต่อ) | ❌ | ❌ | ❌ | ✅ |
| Cross-device Sync Progress | ❌ | ❌ | ❌ | ✅ |
| Reading Speed Estimator | ❌ | ❌ | ❌ | ✅ |
| Quote & Share (ภาพ) | ❌ | ❌ | ❌ | ✅ (Post-MVP) |
| LINE Messaging API | ❌ | ❌ | ❌ | ✅ |
| "แจ้งเมื่อนิยายจบ" | ❌ | ❌ | ❌ | ✅ |
| Gamification (Streak/Badge) | ❌ | ❌ | บางส่วน | ✅ |

---

## 2. Database Schema (เพิ่มเติมจาก Novel Platform Spec)

> **IMPORTANT:** เมื่อเพิ่ม schema ด้านล่าง ต้องเพิ่ม relation fields ใน `User` model และ `Novel` model ที่มีอยู่เดิมด้วย (ดู §2.1)

```prisma
// ─────────────────────────────────────────
// WRITING SESSION (Quick Resume)
// ─────────────────────────────────────────

model WritingSession {
  id              String   @id @default(cuid())
  userId          String
  novelId         String
  chapterId       String?  // null = draft chapter ใหม่ยังไม่ได้สร้าง
  lastContent     Json?    // Tiptap JSON snapshot ล่าสุด
  cursorPosition  Int      @default(0)
  wordCount       Int      @default(0)
  updatedAt       DateTime @updatedAt
  createdAt       DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  novel           Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)
  chapter         Chapter? @relation(fields: [chapterId], references: [id], onDelete: SetNull)

  @@unique([userId, novelId])  // 1 session ต่อ 1 นิยาย
  @@index([userId])
}

// ─────────────────────────────────────────
// CHAPTER VERSION HISTORY
// ─────────────────────────────────────────

model ChapterVersion {
  id          String   @id @default(cuid())
  chapterId   String
  content     Json     // Tiptap JSON snapshot
  wordCount   Int
  savedAt     DateTime @default(now())
  label       String?  // "auto-save" | "manual" | "before-publish"
  savedById   String   // ใครเป็นคนบันทึก (writer หรือ admin)

  chapter     Chapter  @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  savedBy     User     @relation("VersionSavedBy", fields: [savedById], references: [id])

  @@index([chapterId, savedAt])
}

// ─────────────────────────────────────────
// WRITING GOAL & STREAK
// ─────────────────────────────────────────

model WritingGoal {
  id              String   @id @default(cuid())
  userId          String   @unique
  dailyWordTarget Int      @default(500)   // เป้าหมายคำ/วัน
  reminderTime    String?  // "20:00" — เวลาที่จะแจ้งเตือน
  reminderDays    String[] // ["MON","TUE","WED","THU","FRI","SAT","SUN"]
  isReminderOn    Boolean  @default(false)
  lineUserId      String?  // LINE Messaging API user ID (encrypted)

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model WritingStreak {
  id              String   @id @default(cuid())
  userId          String   @unique
  currentStreak   Int      @default(0)    // วันติดต่อกันปัจจุบัน
  longestStreak   Int      @default(0)    // สถิติสูงสุด
  lastWrittenDate DateTime?               // วันล่าสุดที่เขียน
  totalDays       Int      @default(0)    // วันที่เขียนสะสมทั้งหมด
  totalWords      Int      @default(0)    // คำสะสมทั้งหมด
  graceUsed       Boolean  @default(false) // ใช้ grace period แล้วหรือยัง

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model DailyWritingLog {
  id          String   @id @default(cuid())
  userId      String
  date        DateTime @db.Date  // เก็บแค่วัน (date-only, ไม่มี timezone issue)
  wordCount   Int      @default(0)
  minuteSpent Int      @default(0)

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date])
}

// ─────────────────────────────────────────
// READING HISTORY (อ่านต่อ)
// ─────────────────────────────────────────

// อัพเดท model ReadHistory ที่มีอยู่ใน Novel Platform Spec:
// model ReadHistory {
//   userId      String
//   chapterId   String
//   progress    Int      @default(0)  // scroll % 0-100
//   lastReadAt  DateTime @default(now()) @updatedAt
//   user        User     @relation(...)
//   chapter     Chapter  @relation(...)
//   @@id([userId, chapterId])
//   @@index([userId, lastReadAt])
// }

// ─────────────────────────────────────────
// READING GOAL & STATS
// ─────────────────────────────────────────

model ReadingStreak {
  id              String   @id @default(cuid())
  userId          String   @unique
  currentStreak   Int      @default(0)
  longestStreak   Int      @default(0)
  lastReadDate    DateTime?
  totalChapters   Int      @default(0)
  totalNovels     Int      @default(0)

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ─────────────────────────────────────────
// NOTIFY WHEN COMPLETED
// ─────────────────────────────────────────

model CompletionAlert {
  userId    String
  novelId   String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  novel     Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)

  @@id([userId, novelId])
  @@index([novelId])
}

// ─────────────────────────────────────────
// SCHEDULE PUBLISH
// ─────────────────────────────────────────

// อัพเดท model Chapter — เพิ่ม field:
// scheduledAt  DateTime?   // ถ้ามีค่า = ตั้ง schedule publish ไว้

// ─────────────────────────────────────────
// BADGES & ACHIEVEMENTS
// ─────────────────────────────────────────

model Badge {
  id          String        @id @default(cuid())
  key         String        @unique  // "first_chapter", "streak_7", ...
  name        String
  description String
  icon        String        // emoji หรือ URL
  category    BadgeCategory

  userBadges  UserBadge[]
}

model UserBadge {
  id          String   @id @default(cuid())
  userId      String
  badgeId     String
  unlockedAt  DateTime @default(now())
  isNew       Boolean  @default(true)  // แสดง "ใหม่!" จนกว่าจะเห็น

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge       Badge    @relation(fields: [badgeId], references: [id])

  @@unique([userId, badgeId])
  @@index([userId])
}

enum BadgeCategory {
  WRITER_MILESTONE    // เขียน chapter แรก, 10K คำ, ...
  WRITER_STREAK       // เขียนติดต่อกัน 7/30/100 วัน
  WRITER_COMMUNITY    // มีผู้ติดตาม 10/100/1000 คน
  READER_MILESTONE    // อ่านครบ 10/50/100 เรื่อง
  READER_STREAK       // อ่านติดต่อกัน 7/30 วัน
  READER_COMMUNITY    // comment 50 ครั้ง, vote 100 ครั้ง
}
```

### 2.1 Required Changes to Existing Models

เพิ่ม relation fields เหล่านี้ใน models ที่มีอยู่เดิม:

```prisma
// ─── เพิ่มใน model User ──────────────────
model User {
  // ... fields เดิม ...

  // เพิ่ม relations ใหม่:
  writingSessions    WritingSession[]
  writingGoal        WritingGoal?
  writingStreak      WritingStreak?
  dailyWritingLogs   DailyWritingLog[]
  readingStreak      ReadingStreak?
  completionAlerts   CompletionAlert[]
  userBadges         UserBadge[]
  savedVersions      ChapterVersion[]   @relation("VersionSavedBy")
}

// ─── เพิ่มใน model Novel ──────────────────
model Novel {
  // ... fields เดิม ...

  // เพิ่ม relations ใหม่:
  writingSessions    WritingSession[]
  completionAlerts   CompletionAlert[]
}

// ─── เพิ่มใน model Chapter ────────────────
model Chapter {
  // ... fields เดิม ...

  // เพิ่ม fields ใหม่:
  scheduledAt        DateTime?           // ตั้ง schedule publish
  
  // เพิ่ม relations ใหม่:
  versions           ChapterVersion[]
  writingSessions    WritingSession[]
}
```

---

## 3. Writer Features

### 3.1 Quick Resume — "Continue Writing"

**UX Flow:**
```
Login → Home/Dashboard
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  ✏️ เขียนต่อจากที่ค้างไว้                           │
│  "ดาวร้าวฟ้า" — ตอนที่ 12: คืนที่ลมพัด            │
│  draft บันทึกล่าสุด: 2 ชั่วโมงที่แล้ว • 1,240 คำ  │
│                                    [เขียนต่อ →]     │
└─────────────────────────────────────────────────────┘
```

**Logic:**
1. เมื่อ login → query `WritingSession` ล่าสุดของ user
2. ถ้ามี session → แสดง banner "เขียนต่อ" บน header/dashboard
3. กด "เขียนต่อ" → เปิด Tiptap editor โหลด `lastContent` จาก `WritingSession`
4. Auto-restore cursor position ด้วย Tiptap `setTextSelection(cursorPosition)`

**API:**
```
GET  /api/writer/session          → ดึง WritingSession ล่าสุด
POST /api/writer/session          → บันทึก/อัพเดท session (upsert)
```

---

### 3.2 Auto-Save + Version History

**Auto-Save Behavior:**
- บันทึก draft ทุก **30 วินาที** โดยอัตโนมัติ **ถ้ามีการเปลี่ยนแปลง** (ใช้ dirty flag ป้องกัน save ซ้ำ)
- บันทึก **manual snapshot** เมื่อกด Ctrl+S
- บันทึก **"before-publish"** snapshot ก่อน publish ทุกครั้ง
- เก็บ **version history 10 รายการ** ต่อ chapter (FIFO ลบเก่าสุดออก)
- ทุก save → อัพเดท `WritingSession` + `DailyWritingLog` ใน **transaction เดียว**

**Version History UI:**
```
Editor Toolbar → [🕐 ประวัติ]
         │
         ▼
Side Panel: Version History
  ├── 14:32 — auto-save (ล่าสุด)
  ├── 14:02 — auto-save
  ├── 13:30 — manual save ⭐
  ├── 12:00 — before-publish
  └── เมื่อวาน 22:15 — auto-save
         [ดูตัวอย่าง] [กู้คืนเวอร์ชันนี้]
```

**API:**
```
GET  /api/chapters/[id]/versions          → ดึง version list
GET  /api/chapters/[id]/versions/[vid]    → ดึง content ของ version
POST /api/chapters/[id]/versions/restore  → กู้คืน version
```

---

### 3.3 Writing Goal & Daily Word Target

**Writer ตั้งค่าได้:**
- เป้าหมายคำ/วัน (default: 500 คำ)
- วันที่อยากเขียน (เช่น เฉพาะวันจันทร์-ศุกร์)
- เวลาแจ้งเตือน (เช่น 20:00 น.)

**Dashboard Widget:**
```
🎯 เป้าหมายวันนี้
████████░░ 420 / 500 คำ (84%)
+80 คำอีกนิดถึงเป้า!

เขียนแล้ว 3 วันติดกัน 🔥
```

**API:**
```
GET   /api/writer/goal        → ดึง WritingGoal
PATCH /api/writer/goal        → อัพเดท daily target, reminder settings
POST  /api/writer/goal/log    → บันทึก word count ประจำวัน (ใช้ upsert ป้องกัน race condition)
```

---

### 3.4 Writing Streak System

**กฎการนับ Streak:**
- เปิด editor และเขียนอย่างน้อย **1 คำ** = นับว่าเขียนในวันนั้น
- **Grace Period:** ถ้าขาด 1 วัน ยังไม่ reset streak (ใช้ได้คนละ 1 ครั้ง/เดือน)
- ถ้าขาด 2 วันขึ้นไป = streak reset เป็น 0

**Streak Milestone Notifications:**
```
🔥 "คุณเขียนครบ 7 วันติดกันแล้ว! รับ Badge 'สม่ำเสมอ'"
🔥 "เหลืออีก 3 วันถึง streak 30 วัน! สู้ๆ"
💔 "streak ของคุณจะหายพรุ่งนี้ถ้าไม่เขียนวันนี้"
```

**Streak Badges:**
| Badge | เงื่อนไข |
|-------|---------|
| 🔥 เริ่มต้นแล้ว | streak 3 วัน |
| ✍️ สม่ำเสมอ | streak 7 วัน |
| 📅 รักการเขียน | streak 30 วัน |
| 💪 นักเขียนเหล็ก | streak 100 วัน |
| 👑 ตำนาน | streak 365 วัน |

---

### 3.5 Inactive Writer Notification

**ระบบ detect อัตโนมัติ (Cron Job ทุกวัน 09:00 น.):**
```typescript
// lib/cron/inactive-writer.ts
// รันด้วย Vercel Cron Jobs (vercel.json)

// Query: นักเขียนที่มี ONGOING novel แต่ไม่ได้เขียนตาม threshold
const thresholds = [
  { days: 7,  type: "PUSH",  message: (count) => 
    `นักอ่าน ${count} คนกำลังรอตอนใหม่ของคุณอยู่นะ! 📖` },
  { days: 14, type: "EMAIL", message: (count) =>
    `นิยายของคุณมี comment ใหม่ ${count} รายการ — กลับมาเขียนต่อได้เลย` },
  { days: 30, type: "PUSH",  message: () =>
    `แจ้งนักอ่านว่าพักเรื่องชั่วคราวได้นะ — กด "ตั้งสถานะ Hiatus"` },
]
```

**Vercel Cron Config:**

> **NOTE:** Vercel Hobby plan supports max **2 cron jobs**, max once/day each. For per-minute scheduling (scheduled-publish), upgrade to Vercel Pro ($20/mo) or use an external cron service (Upstash QStash, cron-job.org).

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-tasks",
      "schedule": "0 2 * * *"
    }
  ]
}
```

> On Hobby plan, consolidate all daily tasks (inactive-writer check, writing-reminder, streak reset) into one `/api/cron/daily-tasks` endpoint. On Pro plan, split them as needed and add per-minute scheduled-publish.

**Cron Route Security:**
```typescript
// All cron endpoints MUST verify Vercel's CRON_SECRET header:
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ... cron logic
}
```

---

### 3.6 Writing Reminder (ตั้งเวลาเตือนตัวเอง)

**ช่องทางแจ้งเตือน:**
1. **Web Push Notification** — ผ่าน browser (PWA)
2. **LINE Messaging API** — เชื่อม LINE Official Account ได้ใน settings
3. **Email** — fallback (via Resend)

**LINE Messaging API Setup Flow:**
```
Settings → Notifications → เชื่อม LINE
  ↓
คลิก "เชื่อมต่อ LINE"
  ↓
แสดง QR Code / Deep Link ให้ user เพิ่ม LINE OA เป็นเพื่อน
  ↓
User เพิ่มเพื่อนและส่งข้อความแรก
  ↓
Webhook → บันทึก LINE userId ใน WritingGoal.lineUserId (encrypted)
  ↓
ตอบกลับ: "✅ เชื่อมต่อ LINE สำเร็จแล้ว! คุณจะได้รับแจ้งเตือนทาง LINE"
```

> **หมายเหตุ:** LINE Notify ถูกยกเลิกแล้ว (31 มี.ค. 2025) — ใช้ LINE Messaging API แทน  
> ต้องสร้าง LINE Official Account + Messaging API channel ที่ developers.line.biz

**API:**
```
POST /api/writer/reminder/test               → ส่ง test notification
POST /api/integrations/line/webhook          → LINE Messaging API webhook
GET  /api/integrations/line/link             → สร้าง friend-add link/QR
DELETE /api/integrations/line                → ยกเลิกการเชื่อม LINE
```

---

### 3.7 Schedule Publish Chapter

**Writer Flow:**
```
เขียน chapter เสร็จ
  ↓
กด "เลือกวิธี Publish"
  ├── [Publish ทันที]
  └── [ตั้งเวลา Publish]
         ↓
    เลือกวันและเวลา: 25 มี.ค. 2026, 19:00 น.
         ↓
    chapter.scheduledAt = 2026-03-25T19:00:00+07:00
    chapter.isPublished = false
```

**Cron Job (ทุกนาที — ต้อง Vercel Pro หรือ external cron):**
```typescript
// api/cron/scheduled-publish/route.ts
export async function GET(request: Request) {
  // Verify cron auth
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date()
  const chapters = await prisma.chapter.findMany({
    where: {
      isPublished: false,
      scheduledAt: { not: null, lte: now },  // ← combined filter (ห้าม duplicate key)
    },
  })

  for (const chapter of chapters) {
    await prisma.chapter.update({
      where: { id: chapter.id },
      data: { isPublished: true, publishedAt: now, scheduledAt: null },
    })
    // Trigger notification ให้นักอ่านที่ bookmark นิยายนี้
    await triggerNewChapterNotification(chapter)
  }

  return Response.json({ published: chapters.length })
}
```

---

### 3.8 Writer Analytics Dashboard

**Metrics ที่แสดง:**

```
Overview (7 วันที่ผ่านมา)
┌──────────┬──────────┬──────────┬──────────┐
│  Views   │ Readers  │  Votes   │ Comments │
│  12,430  │  1,204   │   342    │   156    │
│  ↑ 12%   │  ↑ 8%    │  ↑ 5%   │  ↑ 15%  │
└──────────┴──────────┴──────────┴──────────┘

Chapter Retention Graph
ตอน 1 ████████████████ 100%
ตอน 2 ███████████████░  94%
ตอน 3 █████████████░░░  83%
ตอน 4 ████████████░░░░  76%  ← drop นิดนึง
ตอน 5 ███████████████░  94%  ← bounce back (plot ดี!)

Follower Growth (30 วัน)
[line chart: ติดตามรายสัปดาห์]

Top Performing Chapters
1. ตอนที่ 5 "คืนพายุ"        — 2,341 views, 89 comments
2. ตอนที่ 12 "สัญญาที่เลือน"  — 1,982 views, 64 comments
3. ตอนที่ 1 "จุดเริ่มต้น"     — 1,874 views, 41 comments
```

**API:**
```
GET /api/writer/analytics/overview?range=7d|30d|90d
GET /api/writer/analytics/retention/[novelId]
GET /api/writer/analytics/chapters/[novelId]
GET /api/writer/analytics/followers
```

---

### 3.9 Writer Tools (In-Editor)

**Character Sheet:**
```
Novel Settings → ตัวละคร
┌─────────────────────────────────────┐
│ + เพิ่มตัวละคร                      │
│                                     │
│ [ดาว] ตัวเอกหญิง                    │
│ อายุ: 22 | นิสัย: ดื้อ, ใจดี       │
│ ความสัมพันธ์: รู้จัก [เฟิน] มา 5 ปี │
│ [แก้ไข]                             │
└─────────────────────────────────────┘
```

**Chapter Outline Planner:**
```
Novel → Outline
ภาค 1: จุดเริ่มต้น
  ├── ตอน 1: พบกันครั้งแรก ✅
  ├── ตอน 2: ความเข้าใจผิด ✅
  ├── ตอน 3: [ร่างอยู่]
  └── ตอน 4: [วางแผนไว้]
ภาค 2: ความขัดแย้ง
  └── ตอน 5–10: [กำหนดเอง]
```

---

## 4. Reader Features

### 4.1 Reading Resume — "อ่านต่อ"

**จุดแสดง "อ่านต่อ" ทุกจุดใน platform:**

**① Home Page — Banner ด้านบน**
```
┌──────────────────────────────────────────────────────┐
│  📖 อ่านต่อจากที่ค้างไว้                             │
│  [cover] ดาวร้าวฟ้า | ตอนที่ 15 ░░░░████ 67%        │
│                                        [อ่านต่อ →]  │
└──────────────────────────────────────────────────────┘
```

**② Library Page — กำลังอ่าน**
```
กำลังอ่าน (3 เรื่อง)  [เรียงตาม: อ่านล่าสุด]
┌─────────┐  ┌─────────┐  ┌─────────┐
│ [cover] │  │ [cover] │  │ [cover] │
│ ดาวร้าว │  │ หัวใจ   │  │ พายุ    │
│ ตอน 15  │  │ ตอน 8   │  │ ตอน 3   │
│ ██░░ 67%│  │ ██░░ 40%│  │ █░░░ 20%│
│[อ่านต่อ]│  │[อ่านต่อ]│  │[อ่านต่อ]│
└─────────┘  └─────────┘  └─────────┘
```

**③ Novel Detail Page**
```
[🔖 อ่านต่อ — ตอนที่ 15 (67%)]   ← เคยอ่านแล้ว
[📖 เริ่มอ่านตอนที่ 1]             ← ยังไม่เคยอ่าน
```

**④ Chapter Reader — Resume Scroll**
- กด "อ่านต่อ" → เปิด chapter → auto scroll ไปยัง **ตำแหน่ง 67%** ทันที
- แสดง toast: "กลับมาที่หน้าที่คุณค้างไว้แล้ว ↓"

**⑤ Cross-Device Sync**
- Progress เก็บใน Database ไม่ใช่ localStorage
- อ่านค้างมือถือ → เปิดคอมต่อได้ตำแหน่งเดิมทันที

**Implementation:**
```typescript
// components/reader/ReadingProgress.tsx
// ใช้ Intersection Observer บน paragraph elements (แม่นยำกว่า scroll %)
// Track → debounce 5 วินาที → POST /api/history { chapterId, progress: 0-100 }

// components/reader/ChapterReader.tsx
// เมื่อ mount: ดึง savedProgress จาก ReadHistory
// setTimeout(() => scrollTo({ top: targetY, behavior: "smooth" }), 300)
```

---

### 4.2 Reading Experience

**Custom Reader Settings:**
```
⚙️ ตั้งค่าการอ่าน
├── ขนาดตัวอักษร: [A-] [A] [A+]  (14–22px)
├── Font: [สระบุรี] [Sarabun] [Noto Serif Thai]
├── ความกว้าง: [แคบ] [กลาง] [เต็ม]
├── ระยะบรรทัด: [ปกติ] [กว้าง] [กว้างมาก]
├── Theme: [☀️ สว่าง] [🌙 มืด] [📜 ครีม] [🌃 กลางคืน]
├── Blue Light Filter: ░░░░████ 60%
└── ความสว่าง: ░░░████░░ 80%
```

> **หมายเหตุ:** ดู Eye-Comfort & Reading UX Implementation Plan ใน `NOVEL_PLATFORM_REVIEW.md` §Part B สำหรับรายละเอียดเพิ่มเติม  
> Settings ทั้งหมดเก็บใน Zustand store + localStorage

**Reading Speed Estimator:**
```
บนแต่ละ chapter:
"⏱ อ่านอีกประมาณ 8 นาที (2,100 คำ)"
คำนวณจาก: wordCount / avgReadingSpeed(Thai) ≈ 250 คำ/นาที
```

**Focus / Fullscreen Mode:**
- กด F หรือ icon → ซ่อน navbar, sidebar ทุกอย่าง
- อ่านแบบ distraction-free
- กด Esc เพื่อออก

**Auto Scroll (Hands-free):**
- เปิด auto scroll → เนื้อหาเลื่อนช้าๆ อัตโนมัติ
- ปรับความเร็วได้ 1–10

---

### 4.3 "แจ้งเมื่อนิยายจบ" (Completion Alert)

**Use Case:** นักอ่านพบนิยาย ONGOING ที่ชอบ แต่อยากรอให้จบก่อนค่อยอ่านรวด

```
Novel Detail Page (status: ONGOING)
├── [🔔 แจ้งเมื่อนิยายจบ]   ← กดค้างไว้
└── เมื่อ Writer เปลี่ยน status → COMPLETED:
    → ส่ง notification ให้ทุกคนที่กด alert
    → "🎉 ดาวร้าวฟ้า จบแล้ว! เริ่มอ่านได้เลย →"
```

**API:**
```
POST   /api/novels/[id]/completion-alert   → เปิด alert
DELETE /api/novels/[id]/completion-alert   → ปิด alert
GET    /api/novels/[id]/completion-alert   → ตรวจสถานะ
```

---

### 4.4 Quote & Share (Viral Feature) — Post-MVP

> **Phase:** Post-MVP — ใช้ client-side `html2canvas` เป็น MVP ก่อน, defer server-side generation

**Flow:**
1. นักอ่าน **highlight ข้อความ** ที่ชอบในขณะอ่าน
2. ปรากฎ popup: `[💬 Quote] [🔖 บันทึก] [📋 Copy]`
3. กด Quote → ระบบสร้าง **ภาพสวยงาม** (canvas) พร้อม:
   - ข้อความที่ highlight
   - ชื่อนิยาย + ชื่อนักเขียน
   - Logo platform
4. บันทึกเป็น PNG → แชร์ลง IG, TikTok, Twitter ได้เลย

**ประโยชน์:** สร้าง organic viral loop — ทุกภาพที่แชร์มี watermark platform

---

### 4.5 LINE Messaging API สำหรับนักอ่าน

**เชื่อม LINE รับแจ้งเตือน:**
- ตอนใหม่จากนิยายที่ bookmark
- นักเขียนที่ติดตามอัปเดต
- นิยายที่รอจบ — จบแล้ว

**Format แจ้งเตือนใน LINE (Flex Message):**
```
📖 [StoriWrite]
"ดาวร้าวฟ้า" อัปเดตแล้ว!

ตอนที่ 16: "เมื่อดาวตก"
โดย: @inkwriter

👉 อ่านได้เลย: storiwrite.com/novel/...
```

> **หมายเหตุ:** ใช้ LINE Messaging API + LINE Official Account (ฟรีไม่เกิน 500 messages/เดือน, หลังจากนั้น ~฿0.04/message)

---

### 4.6 Social Reading Features

**Text Highlight & Personal Notes:**
- highlight ข้อความได้ (เก็บใน DB)
- เพิ่ม personal note ใต้ highlight
- ดูทุก highlight ของตัวเองใน "โน้ตของฉัน"

---

## 5. Gamification System

### 5.1 Writer Badges
| Badge Key | ชื่อ | เงื่อนไข |
|-----------|------|---------|
| `first_chapter` | 🖊️ บทแรก | publish chapter แรก |
| `streak_7` | 🔥 สม่ำเสมอ | streak 7 วัน |
| `streak_30` | 💪 รักการเขียน | streak 30 วัน |
| `streak_100` | 🏆 นักเขียนเหล็ก | streak 100 วัน |
| `words_10k` | 📝 นักเขียนตัวจริง | เขียนสะสม 10,000 คำ |
| `words_100k` | 📚 นิยายยาว | เขียนสะสม 100,000 คำ |
| `followers_10` | 👥 มีแฟนแล้ว | ผู้ติดตาม 10 คน |
| `followers_100` | ⭐ นักเขียนดาวรุ่ง | ผู้ติดตาม 100 คน |
| `followers_1k` | 🌟 Verified Writer | ผู้ติดตาม 1,000 คน |
| `hot_story` | 🔥 Hot Story | ติด trending 24 ชม. |
| `completed_novel` | 🎉 จบแล้ว! | เขียนนิยายจนจบ 1 เรื่อง |

### 5.2 Reader Badges
| Badge Key | ชื่อ | เงื่อนไข |
|-----------|------|---------|
| `first_read` | 📖 นักอ่านตัวจริง | อ่านครบ chapter แรก |
| `read_10` | 🗂️ อ่านเยอะ | อ่านครบ 10 เรื่อง |
| `read_50` | 📚 บรรณารักษ์ | อ่านครบ 50 เรื่อง |
| `read_streak_7` | 🌙 อ่านทุกวัน | อ่านติดกัน 7 วัน |
| `read_streak_30` | ☀️ นักอ่านเหล็ก | อ่านติดกัน 30 วัน |
| `first_comment` | 💬 เริ่มพูดแล้ว | comment ครั้งแรก |
| `comments_50` | 🗣️ ช่างพูด | comment 50 ครั้ง |
| `votes_100` | ❤️ ให้กำลังใจ | vote 100 ครั้ง |
| `all_genres` | 🌈 อ่านทุกแนว | อ่านครบทุก genre |

---

## 6. Notification System

### 6.1 Notification Types ทั้งหมด
```typescript
enum NotificationType {
  // Writer Notifications
  NEW_READER_FOLLOWER      // มีคนมา follow
  CHAPTER_NEW_COMMENT      // มี comment ใน chapter
  NOVEL_VOTE               // มีคน vote นิยาย
  NOVEL_MILESTONE          // ยอดวิว/ผู้ติดตามถึง milestone
  WRITER_STREAK_WARNING    // streak จะหายพรุ่งนี้
  WRITER_INACTIVE_7D       // ไม่ได้เขียน 7 วัน
  WRITER_INACTIVE_14D      // ไม่ได้เขียน 14 วัน
  WRITER_INACTIVE_30D      // ไม่ได้เขียน 30 วัน
  WRITING_REMINDER         // เตือนตามเวลาที่ตั้ง
  SCHEDULED_PUBLISH_DONE   // chapter ที่ตั้ง schedule publish แล้ว

  // Reader Notifications
  NEW_CHAPTER              // นิยายที่ bookmark มีตอนใหม่
  FOLLOWING_WRITER_UPDATE  // นักเขียนที่ติดตามอัปเดต
  NOVEL_COMPLETED          // นิยายที่ตั้ง alert จบแล้ว
  BADGE_UNLOCKED           // ได้รับ badge ใหม่
}
```

### 6.2 Notification Channels
| Channel | Writer | Reader | ค่าใช้จ่าย |
|---------|--------|--------|----------|
| In-App (bell icon) | ✅ | ✅ | ฟรี |
| Web Push (PWA) | ✅ | ✅ | ฟรี |
| LINE Messaging API | ✅ (ต้องเชื่อม) | ✅ (ต้องเชื่อม) | ฟรี ≤500 msg/mo |
| Email | ✅ | ✅ | Resend free tier |

---

## 7. API Endpoints Summary (Writer/Reader Features)

### Writer APIs
```
GET    /api/writer/session                      → Quick Resume session
POST   /api/writer/session                      → บันทึก session (upsert)
GET    /api/writer/goal                         → Writing goal settings
PATCH  /api/writer/goal                         → อัพเดท goal
POST   /api/writer/goal/log                     → บันทึก daily word count (upsert)
GET    /api/writer/streak                       → Streak stats
GET    /api/writer/analytics/overview           → Dashboard stats
GET    /api/writer/analytics/retention/[id]     → Chapter retention
GET    /api/writer/analytics/chapters/[id]      → Chapter performance
GET    /api/chapters/[id]/versions              → Version history list
POST   /api/chapters/[id]/versions/restore      → กู้คืน version
POST   /api/chapters/[id]/schedule              → ตั้ง schedule publish
DELETE /api/chapters/[id]/schedule              → ยกเลิก schedule
POST   /api/integrations/line/webhook           → LINE Messaging API webhook
GET    /api/integrations/line/link              → สร้าง friend-add link
DELETE /api/integrations/line                   → ยกเลิก LINE
POST   /api/writer/reminder/test                → ทดสอบแจ้งเตือน
```

### Reader APIs
```
POST   /api/history                             → บันทึก progress (upsert)
GET    /api/history                             → ดึง reading history
GET    /api/history/resume                      → ดึง "อ่านต่อ" ล่าสุด
POST   /api/novels/[id]/completion-alert        → ตั้ง alert จบ
DELETE /api/novels/[id]/completion-alert        → ยกเลิก alert
POST   /api/highlights                          → บันทึก text highlight
GET    /api/highlights/[chapterId]              → ดึง highlights ของ chapter
DELETE /api/highlights/[id]                     → ลบ highlight
GET    /api/reader/badges                       → ดึง badges ของ user
```

### Cron APIs (ต้อง verify CRON_SECRET)
```
GET    /api/cron/daily-tasks                    → รวม: inactive writer + streak reset + reminder
GET    /api/cron/scheduled-publish              → Publish scheduled chapters (ต้อง Pro plan หรือ external cron)
```

### Shared APIs
```
GET    /api/notifications                       → ดึง notifications
PATCH  /api/notifications/read-all             → mark all read
GET    /api/badges                              → ดึง badge catalog ทั้งหมด
```

---

## 8. Development Priority (Phase)

### Phase 2 — Writer System (Week 3–4)
- [ ] Quick Resume ("Continue Writing" button)
- [ ] Auto-save ทุก 30 วินาที (dirty flag check)
- [ ] Version History (10 versions/chapter)
- [ ] Focus Mode ใน Editor
- [ ] Word Counter real-time

### Phase 3 — Reader System (Week 5–6)
- [ ] Reading Progress tracking (Intersection Observer)
- [ ] "อ่านต่อ" บน Home, Library, Novel Detail
- [ ] Resume scroll อัตโนมัติ
- [ ] Custom Reader Settings (font, theme, size, blue light filter)
- [ ] Reading Speed Estimator
- [ ] "แจ้งเมื่อนิยายจบ" (Completion Alert)

### Phase 4 — Community & Engagement (Week 7–8)
- [ ] Writing Streak + Badge System
- [ ] Writing Goal + Daily Word Target
- [ ] Inactive Writer Notification (Cron)
- [ ] Reading Streak + Reader Badges
- [ ] Schedule Publish Chapter

### Phase 5 — Deep Features (Week 9–10)
- [ ] Writer Analytics Dashboard
- [ ] Character Sheet + Outline Planner
- [ ] LINE Messaging API Integration (Writer + Reader)
- [ ] Writing Reminder (ตั้งเวลาเอง)
- [ ] Text Highlight + Personal Notes

### Post-MVP (Future)
- [ ] Quote & Share (client-side canvas MVP)
- [ ] Reading Club (Group Reading) — ต้องการ WebSocket/Realtime
- [ ] Fan Art Gallery — ต้องการ content moderation
- [ ] Revenue Analytics — ต้องการ payment system
- [ ] Auto Scroll (Hands-free reading)

---

*Writer & Reader Features Spec — StoriWrite Novel Platform v1.1*  
*Stack: Next.js 16 · TypeScript · Prisma · Supabase · LINE Messaging API*
