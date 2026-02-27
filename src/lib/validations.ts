import { z } from "zod";

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
});

export const loginSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณาใส่รหัสผ่าน"),
});

export const novelSchema = z.object({
  title: z.string().min(1, "กรุณาใส่ชื่อนิยาย").max(200),
  synopsis: z.string().min(20, "Synopsis ต้องมีอย่างน้อย 20 ตัวอักษร").max(2000),
  status: z.enum(["DRAFT", "ONGOING", "COMPLETED", "HIATUS"]),
  genreIds: z.array(z.string()).min(1, "เลือกอย่างน้อย 1 genre").max(3),
  tags: z.array(z.string()).max(10),
  language: z.string().default("th"),
});

export const chapterSchema = z.object({
  title: z.string().min(1, "กรุณาใส่ชื่อ Chapter").max(200),
  content: z.object({}).passthrough(),
  chapterNumber: z.number().int().positive(),
  isDraft: z.boolean().default(true),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().optional(),
});

export const profileSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
});
