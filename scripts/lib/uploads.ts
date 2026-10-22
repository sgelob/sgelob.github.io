const UPLOAD_URL = /^(?:(?:https?:)?\/\/(?:www\.)?olegs\.be)?\/wp-content\/uploads\/(.+)$/i;

/** "-768x512" immediately before the extension. */
export function stripSizeSuffix(path: string): string {
  return path.replace(/-\d+x\d+(?=\.[^./]+$)/, '');
}

/** Upload path relative to wp-content/uploads (size suffix stripped), or null if the URL is not an olegs.be upload. */
export function uploadPath(url: string): string | null {
  const m = UPLOAD_URL.exec(url.trim());
  if (!m) return null;
  const path = m[1].split(/[?#]/)[0];
  return path ? stripSizeSuffix(path) : null;
}
