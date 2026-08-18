/**
 * Configurable constraints a caller passes to ImageUploadDialog. Every field
 * is optional — omitting all of them just picks, previews, and hands back
 * the original image unmodified (no crop step, no resize, no validation).
 */
export type ImageUploadConstraints = {
  /** MIME types the source picker/validation accepts, e.g. ['image/jpeg', 'image/png']. */
  allowedTypes?: string[];
  maxFileSizeBytes?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  /**
   * Omit to skip the crop step entirely. A number (e.g. `1` for square,
   * `16 / 9`) locks the crop frame to that ratio and pans/zooms the source
   * image underneath a fixed viewport. `'free'` renders a resizable crop
   * frame with no ratio lock.
   */
  aspectRatio?: number | 'free';
  /** Final output size the cropped image is resized to. Omit to keep the crop's native resolution. */
  outputWidth?: number;
  outputHeight?: number;
};

/** What ImageUploadDialog hands back via onConfirm — ready for the caller's own upload call. */
export type ProcessedImageAsset = {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileSizeBytes: number;
};

export type SourceRejectionReason =
  | 'unsupported_type'
  | 'file_too_large'
  | 'resolution_too_small'
  | 'resolution_too_large';

export class ImageSourceRejectedError extends Error {
  constructor(public readonly reason: SourceRejectionReason) {
    super(reason);
    this.name = 'ImageSourceRejectedError';
  }
}
