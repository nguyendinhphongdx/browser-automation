import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH: Admin duyệt/từ chối script
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { status } = await request.json();
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return Response.json({ error: "status phải là APPROVED hoặc REJECTED" }, { status: 400 });
  }

  const script = await prisma.script.update({
    where: { id },
    data: { status },
    include: { author: { select: { id: true, name: true } } },
  });

  return Response.json({ script });
}

// DELETE: Admin xoá script
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { error } = await requireAdmin(request);
  if (error) return error;

  await prisma.script.delete({ where: { id } });
  return Response.json({ deleted: true });
}
