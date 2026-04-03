import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DollarSign, Download, FileCode, Star } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";

async function getCreatorData(userId: string) {
  const [scripts, totalDownloads] = await Promise.all([
    prisma.script.findMany({
      where: { authorId: userId },
      orderBy: { downloads: "desc" },
      include: { reviews: { select: { rating: true } } },
    }),
    prisma.script.aggregate({
      _sum: { downloads: true },
      where: { authorId: userId },
    }),
  ]);

  const totalRevenue = scripts.reduce((sum, s) => sum + s.price * s.downloads, 0);

  return {
    scripts,
    totalDownloads: totalDownloads._sum.downloads || 0,
    totalRevenue,
    creatorShare: Math.round(totalRevenue * 0.7),
  };
}

export default async function CreatorDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await getCreatorData(session.user.id);

  const stats = [
    { title: "Scripts của tôi", value: data.scripts.length.toString(), icon: FileCode },
    { title: "Tổng lượt tải", value: data.totalDownloads.toString(), icon: Download },
    { title: "Doanh thu (70%)", value: `$${(data.creatorShare / 100).toFixed(2)}`, icon: DollarSign },
    {
      title: "Đánh giá TB",
      value: data.scripts.length > 0
        ? (() => {
            const allRatings = data.scripts.flatMap((s) => s.reviews.map((r) => r.rating));
            return allRatings.length > 0
              ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1)
              : "—";
          })()
        : "—",
      icon: Star,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">Dashboard nhà sáng tạo</h1>
      <p className="text-sm text-muted-foreground mb-6">Thống kê doanh thu và scripts của bạn</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scripts của tôi</CardTitle>
          <CardDescription>Theo dõi hiệu suất từng script</CardDescription>
        </CardHeader>
        <CardContent>
          {data.scripts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bạn chưa upload script nào. Hãy tạo workflow trong desktop app rồi upload lên marketplace.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-2">Tên</th>
                  <th className="text-left py-2">Trạng thái</th>
                  <th className="text-right py-2">Giá</th>
                  <th className="text-right py-2">Lượt tải</th>
                  <th className="text-right py-2">Đánh giá</th>
                  <th className="text-right py-2">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {data.scripts.map((s) => {
                  const avg = s.reviews.length > 0
                    ? (s.reviews.reduce((a, r) => a + r.rating, 0) / s.reviews.length).toFixed(1)
                    : "—";
                  const revenue = s.price * s.downloads;
                  return (
                    <tr key={s.id} className="border-b">
                      <td className="py-2 font-medium">{s.name}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          s.status === "APPROVED" ? "bg-green-100 text-green-700" :
                          s.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>{s.status}</span>
                      </td>
                      <td className="py-2 text-right">{s.price === 0 ? "Free" : `$${(s.price / 100).toFixed(2)}`}</td>
                      <td className="py-2 text-right">{s.downloads}</td>
                      <td className="py-2 text-right">{avg} ({s.reviews.length})</td>
                      <td className="py-2 text-right font-medium">${((revenue * 0.7) / 100).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
