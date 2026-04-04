import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as s3GetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Storage as GCSStorage } from "@google-cloud/storage";

// ─── Interface ──────────────────────────────────────────────

export interface StorageProvider {
  upload(key: string, buffer: Buffer, contentType?: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  getSignedUploadUrl(key: string, contentType?: string, expiresInSeconds?: number): Promise<string>;
}

// ─── S3 Provider ────────────────────────────────────────────

class S3Provider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!bucket) throw new Error("S3_BUCKET env var is required");
    if (!accessKeyId) throw new Error("AWS_ACCESS_KEY_ID env var is required");
    if (!secretAccessKey) throw new Error("AWS_SECRET_ACCESS_KEY env var is required");

    this.bucket = bucket;
    this.client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async upload(key: string, buffer: Buffer, contentType = "application/zip"): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
  }

  async download(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );
    const stream = res.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return s3GetSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds }
    );
  }

  async getSignedUploadUrl(key: string, contentType = "application/zip", expiresInSeconds = 3600): Promise<string> {
    return s3GetSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: expiresInSeconds }
    );
  }
}

// ─── GCS Provider ───────────────────────────────────────────

class GCSProvider implements StorageProvider {
  private storage: GCSStorage;
  private bucket: string;

  constructor() {
    const bucket = process.env.GCS_BUCKET;
    if (!bucket) throw new Error("GCS_BUCKET env var is required");
    this.bucket = bucket;
    const credentials = process.env.GCS_CREDENTIALS;
    const keyFile = process.env.GCS_KEY_FILE;

    if (credentials) {
      // Raw JSON credentials từ env var
      this.storage = new GCSStorage({ credentials: JSON.parse(credentials) });
    } else if (keyFile) {
      this.storage = new GCSStorage({ keyFilename: keyFile });
    } else {
      // Default credentials (GCE, Cloud Run, etc.)
      this.storage = new GCSStorage();
    }
  }

  async upload(key: string, buffer: Buffer, contentType = "application/zip"): Promise<void> {
    await this.storage.bucket(this.bucket).file(key).save(buffer, {
      contentType,
      resumable: false,
    });
  }

  async download(key: string): Promise<Buffer> {
    const [contents] = await this.storage.bucket(this.bucket).file(key).download();
    return contents;
  }

  async delete(key: string): Promise<void> {
    await this.storage.bucket(this.bucket).file(key).delete();
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const [url] = await this.storage
      .bucket(this.bucket)
      .file(key)
      .getSignedUrl({
        action: "read",
        expires: Date.now() + expiresInSeconds * 1000,
      });
    return url;
  }

  async getSignedUploadUrl(key: string, contentType = "application/zip", expiresInSeconds = 3600): Promise<string> {
    const [url] = await this.storage
      .bucket(this.bucket)
      .file(key)
      .getSignedUrl({
        action: "write",
        expires: Date.now() + expiresInSeconds * 1000,
        contentType,
      });
    return url;
  }
}

// ─── Factory (singleton) ────────────────────────────────────

let _provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!_provider) {
    const type = process.env.STORAGE_PROVIDER || "s3";
    _provider = type === "gcs" ? new GCSProvider() : new S3Provider();
  }
  return _provider;
}
