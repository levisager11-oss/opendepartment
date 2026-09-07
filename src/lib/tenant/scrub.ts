/**
 * Take the metadata out of an image before it is uploaded.
 *
 * A phone photograph carries where it was taken, when, and on what. An archive
 * whose stated subject is somebody's classmates is exactly the place where
 * that matters: the picture is meant to be seen, the coordinates in it are
 * not, and nobody uploading it is thinking about the difference. Members
 * cannot be asked to strip it themselves, and it cannot be stripped after
 * upload -- by then the bytes are in the owner's bucket.
 *
 * Done by editing the container rather than by re-encoding through a canvas.
 * Re-encoding would also remove the metadata, and would silently reduce the
 * quality of every photograph in every department to pay for it. Walking the
 * segments costs nothing and returns the same pixels.
 *
 * DEFENSIVE BY CONSTRUCTION: every parser below returns the ORIGINAL bytes the
 * moment it sees anything it does not recognise. A scrubber that corrupts an
 * upload is a worse bug than the metadata it was there to remove, so the
 * failure mode is "did not scrub", never "produced something else".
 */

/** What this can strip. Anything else is uploaded exactly as it arrived. */
export const SCRUBBABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

const u32 = (v: DataView, at: number) => v.getUint32(at, false);

/**
 * JPEG: a series of marker segments, then entropy-coded data.
 *
 * APP1 is Exif and XMP; APP13 is the IPTC/Photoshop block; COM is a free-text
 * comment. APP0 (JFIF) and APP2 (the ICC colour profile) stay -- dropping the
 * profile would change how the image looks, which is not what was asked for.
 */
function scrubJpeg(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;

  const keep: Array<[number, number]> = [[0, 2]];
  let at = 2;
  let reachedScan = false;

  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) return bytes; // not where a marker should be
    const marker = bytes[at + 1];

    // Start of scan: the rest of the file is image data, copied verbatim.
    if (marker === 0xda) {
      keep.push([at, bytes.length]);
      reachedScan = true;
      break;
    }
    // Standalone markers carry no length.
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      keep.push([at, at + 2]);
      at += 2;
      continue;
    }

    const length = (bytes[at + 2] << 8) | bytes[at + 3];
    if (length < 2 || at + 2 + length > bytes.length) return bytes;

    const drop = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!drop) keep.push([at, at + 2 + length]);
    at += 2 + length;
  }

  // Ran out of file before the scan started: this is not a JPEG we understood,
  // and returning what we collected would hand back a TRUNCATED image. The
  // whole point of this module is that it never does that.
  if (!reachedScan) return bytes;

  return join(bytes, keep);
}

/**
 * PNG: an 8-byte signature, then length/type/data/crc chunks.
 *
 * The textual chunks and eXIf are the ones that carry anything about the
 * person or the camera. Everything structural is kept, in order, untouched --
 * including its CRC, since no chunk is being rewritten.
 */
const PNG_DROP = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

function scrubPng(bytes: Uint8Array): Uint8Array {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (signature.some((b, i) => bytes[i] !== b)) return bytes;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const keep: Array<[number, number]> = [[0, 8]];
  let at = 8;
  let reachedEnd = false;

  while (at + 8 <= bytes.length) {
    const length = u32(view, at);
    const end = at + 12 + length;
    if (length > bytes.length || end > bytes.length) return bytes;

    const type = String.fromCharCode(
      bytes[at + 4], bytes[at + 5], bytes[at + 6], bytes[at + 7]
    );
    if (!PNG_DROP.has(type)) keep.push([at, end]);

    at = end;
    if (type === "IEND") {
      reachedEnd = true;
      break;
    }
  }

  // No IEND: truncated or not a PNG. Same rule as the JPEG parser above.
  if (!reachedEnd) return bytes;

  return join(bytes, keep);
}

/**
 * WebP: a RIFF container of chunks, of which EXIF and XMP are two.
 *
 * The RIFF header carries the total size, so it is the one field that has to
 * be rewritten after anything is removed.
 */
function scrubWebp(bytes: Uint8Array): Uint8Array {
  const tag = (at: number) =>
    String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
  if (tag(0) !== "RIFF" || tag(8) !== "WEBP") return bytes;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const keep: Array<[number, number]> = [[0, 12]];
  let at = 12;
  let dropped = false;

  while (at + 8 <= bytes.length) {
    const size = view.getUint32(at + 4, true);
    // Chunks are padded to an even length; the pad byte is not in the size.
    const end = at + 8 + size + (size % 2);
    if (end > bytes.length) return bytes;

    const type = tag(at);
    if (type === "EXIF" || type === "XMP ") dropped = true;
    else keep.push([at, end]);

    at = end;
  }

  // A clean walk finishes exactly at the end of the file. Anything else means
  // a chunk lied about its size, and the collected ranges are not the image.
  if (at !== bytes.length) return bytes;
  if (!dropped) return bytes;

  const out = join(bytes, keep);
  // RIFF size counts everything after the first eight bytes.
  new DataView(out.buffer, out.byteOffset, out.byteLength).setUint32(
    4, out.length - 8, true
  );
  return out;
}

function join(bytes: Uint8Array, ranges: Array<[number, number]>): Uint8Array {
  const total = ranges.reduce((sum, [from, to]) => sum + (to - from), 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const [from, to] of ranges) {
    out.set(bytes.subarray(from, to), at);
    at += to - from;
  }
  return out;
}

export type ScrubResult = {
  file: File;
  /** True when bytes were actually removed, so the UI can say so. */
  scrubbed: boolean;
  /**
   * True for a format this cannot read -- HEIC in particular, which is what
   * an iPhone produces by default and which no browser will decode for us.
   * The file is uploaded untouched and the form says so rather than implying a
   * guarantee it did not give.
   */
  unsupported: boolean;
};

/** Strip what can be stripped; never fail the upload over it. */
export async function scrubImage(file: File): Promise<ScrubResult> {
  if (!file.type.startsWith("image/")) {
    return { file, scrubbed: false, unsupported: false };
  }
  if (!SCRUBBABLE.has(file.type)) {
    return { file, scrubbed: false, unsupported: true };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const out =
      file.type === "image/jpeg"
        ? scrubJpeg(bytes)
        : file.type === "image/png"
          ? scrubPng(bytes)
          : scrubWebp(bytes);

    if (out.length === bytes.length) {
      return { file, scrubbed: false, unsupported: false };
    }

    return {
      file: new File([out as BlobPart], file.name, {
        type: file.type,
        lastModified: file.lastModified,
      }),
      scrubbed: true,
      unsupported: false,
    };
  } catch {
    // Unreadable, out of memory, anything at all: upload what we were given.
    return { file, scrubbed: false, unsupported: false };
  }
}
