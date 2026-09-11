import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { Metadata } from "sharp";
import type { LogoVariants } from "../../shared/reportSettings";
import { AppError } from "../domain/errors";

export function getUploadRoot() {
  return path.resolve(process.env.UPLOAD_ROOT || path.join(process.cwd(), "public", "uploads"));
}
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

type ParsedDataUrl = {
  buffer: Buffer;
  contentType: string;
  extension: "jpg" | "png" | "webp";
};

async function parseDataUrl(dataUrl: string): Promise<ParsedDataUrl> {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match) throw new AppError(400, "Only base64 PNG, JPEG, and WebP images are supported");

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength === 0 || buffer.byteLength > 3 * 1024 * 1024) {
    throw new AppError(413, "Image must be smaller than 3 MB");
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(buffer, { animated: false, limitInputPixels: 16_000_000 }).metadata();
  } catch {
    throw new AppError(400, "The uploaded file is not a valid image");
  }
  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format) || !metadata.width || !metadata.height) {
    throw new AppError(400, "Unsupported or invalid image format");
  }
  if ((metadata.pages ?? 1) > 1) throw new AppError(400, "Animated images are not supported");

  const expectedFormat = match[1].split("/")[1] === "jpeg" ? "jpeg" : match[1].split("/")[1];
  if (metadata.format !== expectedFormat) throw new AppError(400, "Image content does not match its declared type");
  const extension = metadata.format === "jpeg" ? "jpg" : metadata.format as "png" | "webp";
  return { buffer, contentType: match[1], extension };
}

export function sanitizeUploadFolder(folder: string | undefined) {
  const segments = (folder || "general")
    .split(/[\\/]+/)
    .map((segment) => segment.replace(/[^a-z0-9_-]/gi, "").slice(0, 60))
    .filter(Boolean)
    .slice(0, 6);
  return segments.join("/") || "general";
}

function uploadPath(...parts: string[]) {
  const root = getUploadRoot();
  const candidate = path.resolve(root, ...parts);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new AppError(400, "Invalid upload path");
  }
  return candidate;
}

function publicPath(...parts: string[]) {
  return `/uploads/${parts.join("/")}`.replace(/\\/g, "/");
}

export class StorageService {
  async uploadDataUrl(input: { dataUrl: string; folder?: string; fileName?: string }) {
    const parsed = await parseDataUrl(input.dataUrl);
    const folder = sanitizeUploadFolder(input.folder);
    const requestedName = input.fileName?.replace(/[^a-z0-9._-]/gi, "").replace(/\.[^.]+$/, "");
    const baseName = requestedName || randomUUID();
    const fileName = `${Date.now()}-${baseName}.${parsed.extension}`;
    const directory = uploadPath(folder);
    const filePath = uploadPath(folder, fileName);
    const source = sharp(parsed.buffer, { animated: false, limitInputPixels: 16_000_000 }).rotate();
    const normalized = parsed.extension === "jpg"
      ? await source.jpeg({ quality: 90, mozjpeg: true }).toBuffer()
      : parsed.extension === "png"
        ? await source.png({ compressionLevel: 9 }).toBuffer()
        : await source.webp({ quality: 90 }).toBuffer();

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(filePath, normalized, { flag: "wx" });

    const url = publicPath(folder, fileName);
    return { url, path: url, contentType: parsed.contentType };
  }

  async uploadSchoolLogo(dataUrl: string, schoolId: string): Promise<{ url: string; variants: LogoVariants }> {
    const parsed = await parseDataUrl(dataUrl);
    const digest = createHash("sha256").update(parsed.buffer).digest("hex").slice(0, 20);
    const folder = path.join("branding", schoolId, digest);
    const directory = uploadPath(folder);
    await fs.mkdir(directory, { recursive: true });

    const source = sharp(parsed.buffer, { animated: false, limitInputPixels: 16_000_000 }).rotate();
    const original = await source.clone().webp({ quality: 92, effort: 4 }).toBuffer();
    const wide = await source.clone().resize(600, 240, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 92 }).toBuffer();
    const square = await source.clone().resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 92 }).toBuffer();
    const favicon = await source.clone().resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

    await Promise.all([
      fs.writeFile(path.join(directory, "original.webp"), original),
      fs.writeFile(path.join(directory, "wide.webp"), wide),
      fs.writeFile(path.join(directory, "square.webp"), square),
      fs.writeFile(path.join(directory, "favicon.png"), favicon),
    ]);

    const normalizedFolder = folder.replace(/\\/g, "/");
    const variants: LogoVariants = {
      original: publicPath(normalizedFolder, "original.webp"),
      wide: publicPath(normalizedFolder, "wide.webp"),
      square: publicPath(normalizedFolder, "square.webp"),
      favicon: publicPath(normalizedFolder, "favicon.png"),
    };
    return { url: variants.original!, variants };
  }
}
