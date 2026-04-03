import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Chi tiết script
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const script = await prisma.script.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, image: true } },
      reviews: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!script) {
    return Response.json({ error: "Script không tồn tại" }, { status: 404 });
  }

  const avgRating = script.reviews.length > 0
    ? script.reviews.reduce((acc, r) => acc + r.rating, 0) / script.reviews.length
    : 0;

  return Response.json({ script: { ...script, avgRating } });
}

// PATCH: Cập nhật script (chỉ tác giả)
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const script = await prisma.script.findUnique({ where: { id } });
  if (!script) {
    return Response.json({ error: "Script không tồn tại" }, { status: 404 });
  }
  if (script.authorId !== user.id) {
    return Response.json({ error: "Bạn không có quyền chỉnh sửa script này" }, { status: 403 });
  }

  const body = await request.json();
  const updated = await prisma.script.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      category: body.category,
      tags: body.tags,
      price: body.price,
      version: body.version,
    },
  });

  return Response.json({ script: updated });
}

// DELETE: Xoá script (chỉ tác giả hoặc admin)
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const script = await prisma.script.findUnique({ where: { id } });
  if (!script) {
    return Response.json({ error: "Script không tồn tại" }, { status: 404 });
  }
  if (script.authorId !== user.id && user.role !== "ADMIN") {
    return Response.json({ error: "Không có quyền" }, { status: 403 });
  }

  await prisma.script.delete({ where: { id } });
  return Response.json({ deleted: true });
}
