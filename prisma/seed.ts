import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const genres = [
  { name: "แฟนตาซี", slug: "fantasy", icon: "✨" },
  { name: "โรแมนติก", slug: "romance", icon: "💕" },
  { name: "แอคชัน", slug: "action", icon: "⚔️" },
  { name: "ลึกลับ/สืบสวน", slug: "mystery", icon: "🔍" },
  { name: "ไซไฟ", slug: "sci-fi", icon: "🚀" },
  { name: "สยองขวัญ", slug: "horror", icon: "👻" },
  { name: "ชีวิต/ครอบครัว", slug: "slice-of-life", icon: "🏠" },
  { name: "ดราม่า", slug: "drama", icon: "🎭" },
  { name: "ตลก", slug: "comedy", icon: "😄" },
  { name: "Boys Love", slug: "bl", icon: "💙" },
  { name: "Girls Love", slug: "gl", icon: "💜" },
  { name: "ผจญภัย", slug: "adventure", icon: "🗺️" },
];

async function main() {
  // Seed admin user
  console.log("Seeding admin user...");
  const adminPassword = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@novelspace.com" },
    update: {},
    create: {
      email: "admin@novelspace.com",
      username: "admin",
      displayName: "Admin",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  // Seed genres
  console.log("Seeding genres...");
  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: {},
      create: genre,
    });
  }
  // Seed coin packs
  console.log("Seeding coin packs...");
  const coinPacks = [
    { name: "Starter", price: 2900, coins: 30, bonusCoins: 0, sortOrder: 1, isFeatured: false },
    { name: "Popular", price: 5900, coins: 65, bonusCoins: 5, sortOrder: 2, isFeatured: true },
    { name: "Value", price: 11900, coins: 140, bonusCoins: 20, sortOrder: 3, isFeatured: false },
    { name: "Premium", price: 29900, coins: 380, bonusCoins: 80, sortOrder: 4, isFeatured: false },
  ];
  for (const pack of coinPacks) {
    const existing = await prisma.coinPack.findFirst({ where: { name: pack.name } });
    if (!existing) {
      await prisma.coinPack.create({ data: pack });
    }
  }

  console.log("Seed complete");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
