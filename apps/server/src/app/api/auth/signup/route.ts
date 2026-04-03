import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createToken } from "@/lib/jwt";

export async function POST(request: Request) {
  const { name, email, password } = await request.json();

  if (!email || !password) {
    return Response.json({ error: "Email và mật khẩu là bắt buộc" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Email đã được sử dụng" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const token = await createToken(user.id);

  return Response.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  }, { status: 201 });
}
