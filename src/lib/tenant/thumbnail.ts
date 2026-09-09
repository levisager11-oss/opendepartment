/**
 * A small copy of a picture, made in the browser before anything is uploaded.
 *
 * The vault shows twenty-four cards and every one of them used to be the
 * ORIGINAL object, scaled down by the browser after all of it had arrived.
 * Twenty-four twenty-megabyte scans is half a gigabyte of egress per visitor
 * per page, out of the free tier the department's own owner pays for.
 *
 * Made here rather than on a server for the reason everything else in this
 * product is: OpenDepartment holds no key to anybody's project and no bytes
 * pass through it. The browser that is already holding the file is the only
 * place a thumbnail can be made without changing that.
 *
 * ALLOWED TO FAIL, ALWAYS. Every path below returns null rather than throwing:
 * a browser without WebP encoding, an image too large to decode, a codec that
 * refuses a particular file. A null means the card falls back to the original,
 * which is exactly what it did before this existed. A thumbnail is an
 * optimisation, so it must never become a precondition for filing a document.
 */

/** Longest edge of the stored copy. Twice a card's width, for dense screens. */
const MAX_EDGE = 400;

/**
 * WebP at 0.72.
 *
 * Not lossless: this is a 400px preview of a document whose full resolution is
 * one click away, and the whole point is the byte count. JPEG would be the
 * safer format for reach, but every browser that supports the File and Canvas
 * APIs this needs has supported WebP encoding for years, and it is roughly a
 * third smaller at the same visual quality.
 */
const TYPE = "image/webp";
const QUALITY = 0.72;

export type Thumbnail = { blob: Blob; width: number; height: number };

/**
 * Decode without the DOM.
 *
 * createImageBitmap handles orientation and does the decode off the main
 * thread, so a large scan does not freeze the upload form while it is being
 * read. It is also the API that fails cleanly on a file that only claims to be
 * an image -- an <img> element would fire an error event later, from a
 * different callback, after the form had already moved on.
 */
async function decode(file: File): Promise<ImageBitmap | null> {
  try {
    // imageOrientation so a phone photograph that carries a rotation flag is
    // thumbnailed the way it will be displayed, not the way it was stored.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
}

export async function makeThumbnail(file: File): Promise<Thumbnail | null> {
  if (!file.type.startsWith("image/")) return null;
  if (typeof createImageBitmap !== "function") return null;

  const bitmap = await decode(file);
  if (!bitmap) return null;

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    // Already small enough: a "thumbnail" the same size as the original is a
    // second copy of it, which is worse than having none.
    if (scale === 1) return null;

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, TYPE, QUALITY);
    });

    // A browser that cannot encode WebP hands back a PNG under the requested
    // type, or nothing at all. A PNG of a photograph is routinely larger than
    // the JPEG it came from, so anything that is not actually WebP, or that
    // did not come out smaller, is discarded rather than uploaded.
    if (!blob || blob.type !== TYPE || blob.size >= file.size) return null;

    return { blob, width, height };
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
}
