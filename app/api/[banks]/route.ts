// app/api/banks/route.ts

import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const banks = await db.query.questionBanks.findMany({
      orderBy: (banks, { asc }) => [asc(banks.id)],
    });
    return NextResponse.json(banks);
  } catch (error) {
    console.error("Failed to fetch banks:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
