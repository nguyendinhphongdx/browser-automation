import crypto from "crypto";
import { getUserFromRequest } from "@/lib/jwt";
import { prisma } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const profileId = formData.get("profileId") as string;
  const name = formData.get("name") as string;
  const file = formData.get("file") as File;

  if (!profileId || !file) {
    return Response.json(
      { error: "profileId và file là bắt buộc" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const provider = process.env.STORAGE_PROVIDER || "s3";
  const storageKey = `backups/${user.id}/${profileId}/${Date.now()}.zip`;

  await getStorageProvider().upload(storageKey, buffer, "application/zip");

  const backup = await prisma.profileBackup.create({
    data: {
      userId: user.id,
      profileId,
      name: name || profileId,
      size: buffer.length,
      storageKey,
      provider,
      checksum,
    },
  });

  return Response.json({ backup }, { status: 201 });
}
