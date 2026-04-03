import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/jwt";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: Tải script (tăng download count)
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const script = await prisma.script.findUnique({ where: { id } });
  if (!script) {
    return Response.json({ error: "Script không tồn tại" }, { status: 404 });
  }

  if (script.status !== "APPROVED") {
    return Response.json({ error: "Script chưa được duyệt" }, { status: 403 });
  }

  // Tăng download count
  await prisma.script.update({
    where: { id },
    data: { downloads: { increment: 1 } },
  });

  return Response.json({
    script: {
      id: script.id,
      name: script.name,
      version: script.version,
      // workflowData sẽ được thêm khi có storage
    },
  });
}
