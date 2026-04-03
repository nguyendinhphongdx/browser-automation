import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import type { NextRequest } from "next/server";

// GET: Danh sách tất cả scripts (cho admin duyệt)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") || ""; // PENDING, APPROVED, REJECTED, hoặc rỗng = tất cả
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;

  const [scripts, total] = await Promise.all([
    prisma.script.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        author: { select: { id: true, name: true, email: true } },
        reviews: { select: { rating: true } },
      },
    }),
    prisma.script.count({ where }),
  ]);

  return Response.json({ scripts, total, page, totalPages: Math.ceil(total / limit) });
}
