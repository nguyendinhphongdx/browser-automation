import { getUserFromRequest } from "@/lib/jwt";
import { prisma } from "@/lib/db";

// GET: Trả latest backup per profileId — dùng cho pull/push sync
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use distinct on profileId to get latest backup per profile efficiently
  const latestBackups = await prisma.profileBackup.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    distinct: ["profileId"],
    select: {
      profileId: true,
      name: true,
      checksum: true,
      size: true,
      createdAt: true,
    },
  });

  const statuses = latestBackups.map((b) => ({
    profileId: b.profileId,
    name: b.name,
    latestBackupAt: b.createdAt,
    checksum: b.checksum,
    size: b.size,
  }));

  return Response.json({ statuses });
}
