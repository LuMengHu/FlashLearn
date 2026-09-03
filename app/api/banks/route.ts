// 返回全部题库列表（不含题目），供首页轮播和分类展示使用
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
