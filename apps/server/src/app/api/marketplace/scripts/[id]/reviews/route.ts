import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Lấy reviews của script
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const reviews = await prisma.review.findMany({
    where: { scriptId: id },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ reviews });
}

// POST: Viết review
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { rating, comment } = body;

  if (!rating || rating < 1 || rating > 5) {
    return Response.json({ error: "Rating phải từ 1 đến 5" }, { status: 400 });
  }

  const script = await prisma.script.findUnique({ where: { id } });
  if (!script) {
    return Response.json({ error: "Script không tồn tại" }, { status: 404 });
  }

  // Không cho tác giả tự review
  if (script.authorId === user.id) {
    return Response.json({ error: "Không thể tự đánh giá script của mình" }, { status: 400 });
  }

  const review = await prisma.review.upsert({
    where: { scriptId_userId: { scriptId: id, userId: user.id } },
    update: { rating, comment: comment || null },
    create: {
      scriptId: id,
      userId: user.id,
      rating,
      comment: comment || null,
    },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  return Response.json({ review }, { status: 201 });
}
