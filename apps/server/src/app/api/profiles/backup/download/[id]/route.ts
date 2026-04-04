import { getUserFromRequest } from "@/lib/jwt";
import { prisma } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Trả signed URL để download backup
export async function GET(request: Request, { params }: RouteParams) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const backup = await prisma.profileBackup.findUnique({ where: { id } });
  if (!backup || backup.userId !== user.id) {
    return Response.json({ error: "Không tìm thấy backup" }, { status: 404 });
  }

  const url = await getStorageProvider().getSignedUrl(backup.storageKey, 3600);

  return Response.json({ url, backup: { id: backup.id, name: backup.name, size: backup.size } });
}
