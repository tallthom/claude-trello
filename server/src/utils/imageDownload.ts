export const IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp'
]);

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_HOSTS = new Set([
  'trello-attachments.s3.amazonaws.com'
]);

export function isAllowedAttachmentUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (parsed.hostname === 'trello.com' || parsed.hostname.endsWith('.trello.com')) return true;
  return ALLOWED_HOSTS.has(parsed.hostname);
}

export function imageDownloadEnabled(): boolean {
  const v = process.env.TRELLO_DOWNLOAD_IMAGES;
  if (v === undefined) return true;
  return !['false', '0', 'no', 'off'].includes(v.trim().toLowerCase());
}
