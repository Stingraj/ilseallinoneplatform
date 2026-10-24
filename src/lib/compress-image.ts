import { compressImage } from './image-compression';

/**
 * Compresses artwork images to a maximum of 1600x1600 pixels with 0.8 quality.
 */
export async function compressArtworkImage(file: File): Promise<File> {
  return compressImage(file, 1600, 1600, 0.85);
}
