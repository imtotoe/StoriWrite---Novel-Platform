import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { email, username, password, role, displayName } = validated.data;

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: "EMAIL_EXISTS" },
        { status: 400 }
      );
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: "USERNAME_EXISTS" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role,
        displayName: displayName || username,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
