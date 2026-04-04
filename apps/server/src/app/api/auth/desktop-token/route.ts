import { prisma } from "@/lib/db";
import { createToken } from "@/lib/jwt";

// POST: Tạo JWT token cho desktop app từ email (gọi sau khi OAuth thành công)
export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return Response.json({ error: "Email là bắt buộc" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
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
