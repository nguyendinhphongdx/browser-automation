import { DollarSign, TrendingUp, CreditCard, Users } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";

async function getRevenueData() {
  const [totalScripts, paidScripts, totalDownloads, topScripts] = await Promise.all([
    prisma.script.count({ where: { status: "APPROVED" } }),
    prisma.script.count({ where: { status: "APPROVED", price: { gt: 0 } } }),
    prisma.script.aggregate({ _sum: { downloads: true } }),
    prisma.script.findMany({
      where: { status: "APPROVED" },
      orderBy: { downloads: "desc" },
      take: 10,
      include: { author: { select: { name: true, email: true } } },
    }),
  ]);

  // Ước tính doanh thu (placeholder — cần Stripe data thực)
  const estimatedRevenue = topScripts.reduce((sum, s) => sum + s.price * s.downloads, 0);
  const platformRevenue = Math.round(estimatedRevenue * 0.3); // 30% platform
  const creatorRevenue = estimatedRevenue - platformRevenue;

  return {
    totalScripts,
    paidScripts,
    totalDownloads: totalDownloads._sum.downloads || 0,
    estimatedRevenue,
    platformRevenue,
    creatorRevenue,
    topScripts,
  };
}

export default async function AdminRevenuePage() {
  const data = await getRevenueData();

  const stats = [
    { title: "Ước tính tổng doanh thu", value: `$${(data.estimatedRevenue / 100).toFixed(2)}`, icon: DollarSign },
    { title: "Phần nền tảng (30%)", value: `$${(data.platformRevenue / 100).toFixed(2)}`, icon: CreditCard },
    { title: "Phần nhà sáng tạo (70%)", value: `$${(data.creatorRevenue / 100).toFixed(2)}`, icon: Users },
    { title: "Tổng lượt tải", value: data.totalDownloads.toString(), icon: TrendingUp },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Doanh thu</h1>

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
          <CardTitle>Top Scripts theo lượt tải</CardTitle>
          <CardDescription>{data.paidScripts} scripts có phí / {data.totalScripts} tổng</CardDescription>
        </CardHeader>
        <CardContent>
          {data.topScripts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-2">#</th>
                  <th className="text-left py-2">Tên</th>
                  <th className="text-left py-2">Tác giả</th>
                  <th className="text-right py-2">Giá</th>
                  <th className="text-right py-2">Lượt tải</th>
                  <th className="text-right py-2">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {data.topScripts.map((s, i) => (
                  <tr key={s.id} className="border-b">
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 font-medium">{s.name}</td>
                    <td className="py-2 text-muted-foreground">{s.author.name || s.author.email}</td>
                    <td className="py-2 text-right">{s.price === 0 ? "Free" : `$${(s.price / 100).toFixed(2)}`}</td>
                    <td className="py-2 text-right">{s.downloads}</td>
                    <td className="py-2 text-right font-medium">${((s.price * s.downloads) / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
