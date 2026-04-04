import { getUserFromRequest } from "@/lib/jwt";
import { prisma } from "@/lib/db";

// GET: List backups của user (paginated)
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const take = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
  const skip = parseInt(url.searchParams.get("offset") || "0", 10);

  const [backups, total] = await Promise.all([
    prisma.profileBackup.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        profileId: true,
        name: true,
        size: true,
        provider: true,
        checksum: true,
        createdAt: true,
      },
    }),
    prisma.profileBackup.count({ where: { userId: user.id } }),
  ]);

  return Response.json({ backups, total });
}
