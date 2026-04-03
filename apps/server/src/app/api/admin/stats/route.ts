import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user || user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalUsers, totalScripts, pendingScripts, monthlyDownloads, recentUsers, recentScripts] =
    await Promise.all([
      prisma.user.count(),
      prisma.script.count({ where: { status: "APPROVED" } }),
      prisma.script.count({ where: { status: "PENDING" } }),
      prisma.script.aggregate({
        _sum: { downloads: true },
        where: { updatedAt: { gte: startOfMonth } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.script.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { author: { select: { id: true, name: true } } },
      }),
    ]);

  return Response.json({
    stats: {
      totalUsers,
      totalScripts,
      pendingScripts,
      monthlyDownloads: monthlyDownloads._sum.downloads || 0,
    },
    recentUsers,
    recentScripts,
  });
}
