import { randomUUID } from "node:crypto";
import { AppError } from "../domain/errors";
import { getSupabaseAdminClient } from "./supabaseClient";

const DEFAULT_BUCKET = "school-assets";

type ParsedDataUrl = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

function parseDataUrl(dataUrl: string): ParsedDataUrl {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new AppError(400, "Expected a base64 data URL");

  const contentType = match[1];
  if (!contentType.startsWith("image/")) {
    throw new AppError(400, "Only image uploads are supported");
  }

  const extension = contentType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > 3 * 1024 * 1024) {
    throw new AppError(413, "Image is too large after compression");
  }

  return { buffer, contentType, extension };
}

function safeFolder(folder: string | undefined) {
  return (folder || "uploads").replace(/[^a-z0-9/_-]/gi, "").replace(/^\/+|\/+$/g, "") || "uploads";
}

export class StorageService {
  private readonly bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;

  async uploadDataUrl(input: { dataUrl: string; folder?: string; fileName?: string }) {
    const client = getSupabaseAdminClient();
    const parsed = parseDataUrl(input.dataUrl);
    await this.ensureBucket();

    const baseName = input.fileName?.replace(/[^a-z0-9._-]/gi, "") || `${randomUUID()}.${parsed.extension}`;
    const objectPath = `${safeFolder(input.folder)}/${Date.now()}-${baseName}`;
    const { error } = await client.storage.from(this.bucket).upload(objectPath, parsed.buffer, {
      contentType: parsed.contentType,
      upsert: false,
    });

    if (error) throw new AppError(500, error.message, error);

    const { data } = client.storage.from(this.bucket).getPublicUrl(objectPath);
    return { url: data.publicUrl, path: objectPath, bucket: this.bucket };
  }

  private async ensureBucket() {
    const client = getSupabaseAdminClient();
    const { data } = await client.storage.getBucket(this.bucket);
    if (data) return;

    const { error } = await client.storage.createBucket(this.bucket, {
      public: true,
      fileSizeLimit: 3 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    });
    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw new AppError(500, error.message, error);
    }
  }
}
