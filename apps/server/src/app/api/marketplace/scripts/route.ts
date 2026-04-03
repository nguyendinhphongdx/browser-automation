import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";
import type { NextRequest } from "next/server";

// GET: Tìm kiếm/liệt kê scripts
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "downloads"; // downloads | newest | rating
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const skip = (page - 1) * limit;

  const where: any = { status: "APPROVED" };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.category = category;
  }

  const orderBy: any =
    sort === "newest" ? { createdAt: "desc" } :
    sort === "rating" ? { reviews: { _count: "desc" } } :
    { downloads: "desc" };

  const [scripts, total] = await Promise.all([
    prisma.script.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        author: { select: { id: true, name: true, image: true } },
        reviews: { select: { rating: true } },
      },
    }),
    prisma.script.count({ where }),
  ]);

  const result = scripts.map((s) => ({
    ...s,
    avgRating: s.reviews.length > 0
      ? s.reviews.reduce((acc, r) => acc + r.rating, 0) / s.reviews.length
      : 0,
    reviewCount: s.reviews.length,
    reviews: undefined,
  }));

  return Response.json({
    scripts: result,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// POST: Upload script mới
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, category, tags, price, workflowData } = body;

  if (!name || !description || !category) {
    return Response.json({ error: "name, description, category là bắt buộc" }, { status: 400 });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") +
    "-" + Date.now().toString(36);

  const script = await prisma.script.create({
    data: {
      name,
      slug,
      description,
      category,
      tags: tags || [],
      price: price || 0,
      authorId: user.id,
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
    },
  });

  return Response.json({ script }, { status: 201 });
}
