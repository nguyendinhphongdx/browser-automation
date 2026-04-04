import { verifyToken, createToken } from "@/lib/jwt";

// POST: Refresh JWT token (nhận token cũ còn hạn, trả token mới)
export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Missing token" }, { status: 401 });
  }

  const oldToken = authHeader.slice(7);
  const payload = await verifyToken(oldToken);

  if (!payload?.sub) {
    return Response.json({ error: "Token không hợp lệ hoặc đã hết hạn" }, { status: 401 });
  }

  const token = await createToken(payload.sub);
  return Response.json({ token });
}
