import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { AppError } from "../domain/errors";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

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
  async uploadDataUrl(input: { dataUrl: string; folder?: string; fileName?: string }) {
    const parsed = parseDataUrl(input.dataUrl);
    const folder = safeFolder(input.folder);
    const baseName = input.fileName?.replace(/[^a-z0-9._-]/gi, "") || `${randomUUID()}.${parsed.extension}`;
    const fileName = `${Date.now()}-${baseName}`;
    const directory = path.join(UPLOAD_ROOT, folder);
    const filePath = path.join(directory, fileName);

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(filePath, parsed.buffer);

    const publicPath = `/uploads/${folder}/${fileName}`.replace(/\\/g, "/");
    return { url: publicPath, path: publicPath, contentType: parsed.contentType };
  }
}
