import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, businessName, mobile, username, password, confirmPassword } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!username?.trim()) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    let existing;
    try {
      existing = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });
    } catch (dbErr: any) {
      if (dbErr?.message?.includes("does not exist") || dbErr?.code === "P2021") {
        const { initializeDatabase } = await import("@/lib/init-db");
        await initializeDatabase();
        existing = await prisma.user.findUnique({
          where: { username: cleanUsername },
        });
      } else {
        throw dbErr;
      }
    }

    if (existing) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create User with role USER
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        username: cleanUsername,
        passwordHash,
        businessName: businessName?.trim() || null,
        mobile: mobile?.trim() || null,
        role: "USER",
      },
    });

    // Create Business for user
    const userBusiness = await prisma.business.create({
      data: {
        userId: newUser.id,
        name: businessName?.trim() || `${name.trim()}'s Business`,
        category: "Retail & Business",
        phone: mobile?.trim() || null,
        language: "en",
      },
    });

    // Create WhatsApp Config for this business
    await prisma.whatsAppConfig.create({
      data: {
        businessId: userBusiness.id,
        waApiVersion: "v26.0",
        messagingLimitTier: "TIER_250",
        isConnected: false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully! Please log in to complete your subscription.",
        userId: newUser.id,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json({ error: err.message || "Failed to register" }, { status: 500 });
  }
}
