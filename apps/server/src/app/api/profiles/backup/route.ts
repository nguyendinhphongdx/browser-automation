import { getUserFromRequest } from "@/lib/jwt";
import { prisma } from "@/lib/db";

// GET: List tất cả backups của user
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const backups = await prisma.profileBackup.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      profileId: true,
      name: true,
      size: true,
      provider: true,
      checksum: true,
      createdAt: true,
    },
  });

  return Response.json({ backups });
}
