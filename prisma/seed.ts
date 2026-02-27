import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

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
  console.log("Seeding genres...");
  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: {},
      create: genre,
    });
  }
  console.log("Seed complete");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
