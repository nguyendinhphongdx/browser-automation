import { prisma } from "@/lib/db";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { ScriptActions } from "./script-actions";

async function getScripts() {
  return prisma.script.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, email: true } },
      reviews: { select: { rating: true } },
    },
  });
}

export default async function AdminScriptsPage() {
  const scripts = await getScripts();

  const pending = scripts.filter((s) => s.status === "PENDING");
  const approved = scripts.filter((s) => s.status === "APPROVED");
  const rejected = scripts.filter((s) => s.status === "REJECTED");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Quản lý Scripts</h1>
        <div className="flex gap-2 text-sm">
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
            {pending.length} chờ duyệt
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
            {approved.length} đã duyệt
          </span>
        </div>
      </div>

      {/* Pending scripts */}
      {pending.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Chờ duyệt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pending.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.author.name || s.author.email} · {s.category} · v{s.version}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{s.description}</p>
                  </div>
                  <ScriptActions scriptId={s.id} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All scripts table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tất cả Scripts ({scripts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {scripts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có script nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 px-2">Tên</th>
                    <th className="text-left py-2 px-2">Tác giả</th>
                    <th className="text-left py-2 px-2">Danh mục</th>
                    <th className="text-left py-2 px-2">Giá</th>
                    <th className="text-left py-2 px-2">Lượt tải</th>
                    <th className="text-left py-2 px-2">Trạng thái</th>
                    <th className="text-left py-2 px-2">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {scripts.map((s) => {
                    const avg = s.reviews.length > 0
                      ? (s.reviews.reduce((a, r) => a + r.rating, 0) / s.reviews.length).toFixed(1)
                      : "—";
                    return (
                      <tr key={s.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2 font-medium">{s.name}</td>
                        <td className="py-2 px-2 text-muted-foreground">{s.author.name || s.author.email}</td>
                        <td className="py-2 px-2">{s.category}</td>
                        <td className="py-2 px-2">{s.price === 0 ? "Miễn phí" : `$${(s.price / 100).toFixed(2)}`}</td>
                        <td className="py-2 px-2">{s.downloads}</td>
                        <td className="py-2 px-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            s.status === "APPROVED" ? "bg-green-100 text-green-700" :
                            s.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>{s.status}</span>
                        </td>
                        <td className="py-2 px-2">
                          <ScriptActions scriptId={s.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
