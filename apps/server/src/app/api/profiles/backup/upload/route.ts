import crypto from "crypto";
import { getUserFromRequest } from "@/lib/jwt";
import { prisma } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { profileId, name, size, checksum } = body as {
    profileId: string;
    name: string;
    size: number;
    checksum: string;
  };

  if (!profileId || !checksum) {
    return Response.json(
      { error: "profileId và checksum là bắt buộc" },
      { status: 400 }
    );
  }

  // Validate profileId to prevent path traversal in storage key
  if (!/^[a-zA-Z0-9_-]+$/.test(profileId)) {
    return Response.json(
      { error: "profileId không hợp lệ" },
      { status: 400 }
    );
  }

  // Limit upload size to 500MB
  const MAX_SIZE = 500 * 1024 * 1024;
  if (size && size > MAX_SIZE) {
    return Response.json(
      { error: `File quá lớn — tối đa ${MAX_SIZE / 1024 / 1024}MB` },
      { status: 413 }
    );
  }

  const provider = process.env.STORAGE_PROVIDER || "s3";
  const storageKey = `backups/${user.id}/${profileId}/${Date.now()}.zip`;

  const uploadUrl = await getStorageProvider().getSignedUploadUrl(storageKey);

  const backup = await prisma.profileBackup.create({
    data: {
      userId: user.id,
      profileId,
      name: name || profileId,
      size: size || 0,
      storageKey,
      provider,
      checksum,
    },
  });

  return Response.json({ uploadUrl, backup }, { status: 201 });
}
