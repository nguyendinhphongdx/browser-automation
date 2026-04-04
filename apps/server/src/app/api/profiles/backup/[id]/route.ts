import { getUserFromRequest } from "@/lib/jwt";
import { prisma } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE: Xóa backup từ storage + DB
export async function DELETE(request: Request, { params }: RouteParams) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const backup = await prisma.profileBackup.findUnique({ where: { id } });
  if (!backup || backup.userId !== user.id) {
    return Response.json({ error: "Không tìm thấy backup" }, { status: 404 });
  }

  // Xóa file từ storage provider
  try {
    await getStorageProvider().delete(backup.storageKey);
  } catch {
    // File có thể đã bị xóa trước đó — tiếp tục xóa record
  }

  await prisma.profileBackup.delete({ where: { id } });

  return Response.json({ deleted: true });
}
