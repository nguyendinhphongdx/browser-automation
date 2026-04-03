import { Users, FileCode, DollarSign, TrendingUp, Clock } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";

async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalUsers, totalScripts, pendingScripts, downloads, recentUsers, recentScripts] =
    await Promise.all([
      prisma.user.count(),
      prisma.script.count({ where: { status: "APPROVED" } }),
      prisma.script.count({ where: { status: "PENDING" } }),
      prisma.script.aggregate({ _sum: { downloads: true } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.script.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { author: { select: { name: true } } },
      }),
    ]);

  return {
    totalUsers,
    totalScripts,
    pendingScripts,
    totalDownloads: downloads._sum.downloads || 0,
    recentUsers,
    recentScripts,
  };
}

export default async function AdminDashboardPage() {
  const data = await getStats();

  const stats = [
    { title: "Người dùng", value: data.totalUsers.toString(), icon: Users },
    { title: "Scripts đã duyệt", value: data.totalScripts.toString(), icon: FileCode },
    { title: "Chờ duyệt", value: data.pendingScripts.toString(), icon: Clock },
    { title: "Tổng lượt tải", value: data.totalDownloads.toString(), icon: TrendingUp },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Người dùng mới</CardTitle>
            <CardDescription>5 người đăng ký gần nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có người dùng nào.</p>
            ) : (
              <div className="space-y-3">
                {data.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{u.name || "Chưa đặt tên"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{u.role}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scripts mới</CardTitle>
            <CardDescription>5 scripts gần nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentScripts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có script nào.</p>
            ) : (
              <div className="space-y-3">
                {data.recentScripts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">bởi {s.author.name || "Ẩn danh"}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.status === "APPROVED" ? "bg-green-100 text-green-700" :
                      s.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>{s.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
