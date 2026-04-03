import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [scripts, totalDownloads] = await Promise.all([
    prisma.script.findMany({
      where: { authorId: user.id },
      orderBy: { downloads: "desc" },
      include: { reviews: { select: { rating: true } } },
    }),
    prisma.script.aggregate({
      _sum: { downloads: true },
      where: { authorId: user.id },
    }),
  ]);

  const totalRevenue = scripts.reduce((sum, s) => sum + s.price * s.downloads, 0);
  const creatorShare = Math.round(totalRevenue * 0.7); // 70% cho creator

  return Response.json({
    totalScripts: scripts.length,
    approvedScripts: scripts.filter((s) => s.status === "APPROVED").length,
    totalDownloads: totalDownloads._sum.downloads || 0,
    totalRevenue,
    creatorShare,
    scripts: scripts.map((s) => ({
      ...s,
      avgRating: s.reviews.length > 0
        ? s.reviews.reduce((a, r) => a + r.rating, 0) / s.reviews.length
        : 0,
      reviewCount: s.reviews.length,
      revenue: s.price * s.downloads,
      reviews: undefined,
    })),
  });
}
