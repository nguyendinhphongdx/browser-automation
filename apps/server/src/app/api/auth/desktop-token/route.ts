import { auth } from "@/lib/auth";
import { createToken } from "@/lib/jwt";

// POST: Tạo JWT token cho desktop app (chỉ khi đã có NextAuth session)
export async function POST() {
  const session = await auth();

  if (!session?.user?.email) {
    return Response.json(
      { error: "Unauthorized — cần đăng nhập trước" },
      { status: 401 }
    );
  }

  const { prisma } = await import("@/lib/db");
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    return Response.json({ error: "User không tồn tại" }, { status: 404 });
  }

  const token = await createToken(user.id);

  return Response.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
