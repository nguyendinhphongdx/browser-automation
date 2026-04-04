import { getUserFromRequest } from "@/lib/jwt";
import { prisma } from "@/lib/db";

// GET: Trả latest backup per profileId — dùng cho pull/push sync
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Lấy tất cả backups, group by profileId lấy bản mới nhất
  const backups = await prisma.profileBackup.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      profileId: true,
      name: true,
      checksum: true,
      size: true,
      createdAt: true,
    },
  });

  // Chỉ giữ backup mới nhất cho mỗi profileId
  const statusMap = new Map<string, (typeof backups)[0]>();
  for (const b of backups) {
    if (!statusMap.has(b.profileId)) {
      statusMap.set(b.profileId, b);
    }
  }

  const statuses = Array.from(statusMap.values()).map((b) => ({
    profileId: b.profileId,
    name: b.name,
    latestBackupAt: b.createdAt,
    checksum: b.checksum,
    size: b.size,
  }));

  return Response.json({ statuses });
}
