import { AwsClient } from "aws4fetch";

const MAX_BYTES = 400_000;

export function r2Configured() {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL,
  );
}

function r2Endpoint(accountId: string) {
  const override = process.env.R2_S3_ENDPOINT?.replace(/\/$/, "");
  if (override) return override;
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export async function putNoteImage(input: {
  userId: string;
  bytes: Uint8Array;
}): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.replace(
    /\/$/,
    "",
  );
  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket ||
    !publicBase
  ) {
    throw new Error("R2 is not configured.");
  }
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > MAX_BYTES) {
    throw new Error("That image is too large.");
  }
  if (!isJpeg(input.bytes)) {
    throw new Error("Only JPEG notes images are stored.");
  }

  const key = `notes/${input.userId}/${crypto.randomUUID()}.jpg`;
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const url = `${r2Endpoint(accountId)}/${bucket}/${key}`;
  const response = await client.fetch(url, {
    method: "PUT",
    body: Buffer.from(input.bytes),
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Cloudflare could not store that image (${response.status})${detail ? `: ${detail.slice(0, 180)}` : "."}`,
    );
  }
  return `${publicBase}/${key}`;
}

function isJpeg(bytes: Uint8Array) {
  return (
    bytes.length > 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}
