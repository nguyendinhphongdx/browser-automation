import { getUserFromRequest } from "@/lib/jwt";
import { prisma } from "@/lib/db";

// GET: Lấy danh sách profile đã sync của user
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await prisma.syncedProfile.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return Response.json({ profiles });
}

// POST: Đồng bộ profiles từ desktop lên server
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profiles } = await request.json();

  if (!Array.isArray(profiles)) {
    return Response.json({ error: "profiles phải là mảng" }, { status: 400 });
  }

  const results = [];

  for (const profile of profiles) {
    const result = await prisma.syncedProfile.upsert({
      where: {
        userId_localId: {
          userId: user.id,
          localId: profile.id,
        },
      },
      update: {
        name: profile.name,
        browserType: profile.browserType,
        tags: profile.tags || [],
        color: profile.color || "#3B82F6",
        data: JSON.stringify(profile),
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        localId: profile.id,
        name: profile.name,
        browserType: profile.browserType,
        tags: profile.tags || [],
        color: profile.color || "#3B82F6",
        data: JSON.stringify(profile),
      },
    });
    results.push(result);
  }

  return Response.json({
    synced: results.length,
    profiles: results,
  });
}

// DELETE: Xoá profile đã sync
export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { localId } = await request.json();
  if (!localId) {
    return Response.json({ error: "localId là bắt buộc" }, { status: 400 });
  }

  await prisma.syncedProfile.deleteMany({
    where: { userId: user.id, localId },
  });

  return Response.json({ deleted: true });
}
