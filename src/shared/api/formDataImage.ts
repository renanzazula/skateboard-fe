import { Platform } from 'react-native';

const EXTENSION_FOR_MIME_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
};

/**
 * A filename for an upload, since the server needs one to treat the part as a
 * file at all. Prefers the extension implied by the MIME type, falling back to
 * the URI's own and finally to jpg.
 */
export function imageFilename(prefix: string, uri: string, mimeType?: string | null): string {
  const fromMime = mimeType ? EXTENSION_FOR_MIME_TYPE[mimeType] : undefined;
  // Strip any query string before reading the extension, and ignore an
  // implausibly long tail — a URI with no extension at all would otherwise
  // yield the whole last path segment.
  const fromUri = uri.split(/[?#]/)[0].split('.').pop();
  const extension = fromMime ?? (fromUri && fromUri.length <= 5 ? fromUri.toLowerCase() : 'jpg');
  return `${prefix}.${extension}`;
}

/**
 * Attaches a picked image to `form` as a real multipart file part.
 *
 * The two platforms need different shapes, and neither accepts the other's:
 *
 * - **Web** (react-native-web) wants a `Blob`, exactly as the DOM does.
 * - **Native** wants React Native's own `{ uri, name, type }` shape. Its
 *   `FormData` builds a file part only from that object; a `Blob` is a JS
 *   handle into a native blob registry, so appending one yields a part with
 *   no bytes behind it. Reading the file first doesn't rescue it either —
 *   `fetch()` on a `file://` URI is unsupported on Android and the resulting
 *   Blob still can't be attached on iOS.
 *
 * Every upload here previously used the web shape on both platforms, so on a
 * device the request left with an empty file part: no thrown error, no
 * visible failure, and nothing stored. Hence "nothing happens" after picking
 * a photo, while the same code worked in the browser.
 */
export async function appendImageFile(
  form: FormData,
  field: string,
  file: { uri: string; filename: string; mimeType?: string | null },
): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append(field, blob, file.filename);
    return;
  }

  form.append(field, {
    uri: file.uri,
    name: file.filename,
    // Native needs an explicit content type; without it the server sees an
    // octet-stream part and rejects it as not an image.
    type: file.mimeType || 'image/jpeg',
  } as unknown as Blob);
}
