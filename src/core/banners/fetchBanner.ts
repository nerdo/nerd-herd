import { NerdHerdError } from "../errors/nerdHerdError";
import type { BannerFile, BannerLink, Pixels } from "./bannerCache";

export type { BannerLink } from "./bannerCache";
export type FilePath = string;
export type Bytes = number;
export type HttpStatus = number;
export type ContentType = string;

/** What a download produced: an answer from the server, or no answer at all. */
export type DownloadResult =
  | {
      readonly kind: "answered";
      readonly status: HttpStatus;
      readonly contentType: ContentType;
      readonly size: Bytes;
    }
  | { readonly kind: "unreachable"; readonly cause: unknown };

/** Downloads a link into a file. In the mod this runs curl through Herdr's exec. */
export interface Downloader {
  download(link: BannerLink, to: FilePath): Promise<DownloadResult>;
}

/** Files under Herdr's app folder. In the mod this is Herdr's fs/promises. */
export interface FileStore {
  read(path: FilePath): Promise<Uint8Array>;
  write(path: FilePath, bytes: Uint8Array): Promise<void>;
  remove(path: FilePath): Promise<void>;
}

/** Files anywhere on this computer, by absolute path. In the mod this is Herdr's fs/promises. */
export interface LocalFiles {
  read(path: FilePath): Promise<Uint8Array>;
}

export interface BannerDeps {
  readonly downloader: Downloader;
  readonly files: FileStore;
  readonly localFiles: LocalFiles;
  /** The person's home folder, for a banner path under ~/. */
  readonly home: FilePath;
  readonly hash: (bytes: Uint8Array) => string;
  /** Where banner files are kept, relative to Herdr's app folder. */
  readonly folder: FilePath;
}

/** A banner link could not become a banner; each failure is its own subclass. */
export abstract class BannerError extends NerdHerdError {}

const maxBytes: Bytes = 2 * 1024 * 1024;
const megabytes = (n: Bytes) => Math.round(n / (1024 * 1024));
const reasons: Record<HttpStatus, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  410: "Gone",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};
const statusText = (status: HttpStatus) =>
  reasons[status] ? `${status} ${reasons[status]}` : `${status}`;

/** The pasted link is not an https link. */
export class BannerLinkError extends BannerError {
  readonly userAction = "fix";
  constructor(public readonly link: BannerLink) {
    super();
    this.setMessage(
      "Banner links must start with https://, or name a file on this computer (/…, ~/…, or file://…). Use the https version of a web link.",
    );
  }
}

/** A banner file on this computer could not be read: missing, unreadable, or outside the home folder. */
export class BannerFileUnreadableError extends BannerError {
  readonly userAction = "fix";
  constructor(
    public readonly link: BannerLink,
    public readonly path: FilePath,
    options: { cause: unknown },
  ) {
    super(options);
    this.setMessage(
      `Couldn't read the banner file ${path}. Check the path in the group's settings; the file has to be inside your home folder.`,
    );
  }
}

/** A banner file on this computer is not a PNG, GIF, or JPEG image. */
export class BannerFileNotImageError extends BannerError {
  readonly userAction = "fix";
  constructor(
    public readonly link: BannerLink,
    public readonly path: FilePath,
  ) {
    super();
    this.setMessage("The banner file is not a PNG, GIF, or JPEG image. Use an image file.");
  }
}

/** The server answered with an error status: 4xx means correct the link, 5xx means try again. */
export class BannerHttpError extends BannerError {
  readonly userAction: "fix" | "retry";
  constructor(
    public readonly link: BannerLink,
    public readonly status: HttpStatus,
  ) {
    super();
    this.userAction = status >= 500 ? "retry" : "fix";
    this.setMessage(
      status >= 500
        ? `The banner link returned ${statusText(status)}. Try again in a moment (reference ${this.metadata.errorId}).`
        : `The banner link returned ${statusText(status)}. Check the link in Spaces settings.`,
    );
  }
}

/** The link opened something that is not an image. */
export class BannerNotImageError extends BannerError {
  readonly userAction = "fix";
  constructor(
    public readonly link: BannerLink,
    public readonly contentType: ContentType,
  ) {
    super();
    this.setMessage(
      contentType.startsWith("text/html")
        ? "The banner link opened a web page, not an image. Use a link that ends at the image itself."
        : "The banner link did not open an image. Use a link that ends at the image itself.",
    );
  }
}

/** The image is larger than banners may be. */
export class BannerTooLargeError extends BannerError {
  readonly userAction = "fix";
  constructor(
    public readonly link: BannerLink,
    public readonly size: Bytes,
    public readonly limit: Bytes = maxBytes,
  ) {
    super();
    this.setMessage(
      `The banner image is ${megabytes(size)} MB; banners can be at most ${megabytes(limit)} MB. Use a smaller image.`,
    );
  }
}

/** The server could not be reached at all. */
export class BannerUnreachableError extends BannerError {
  readonly userAction = "retry";
  constructor(
    public readonly link: BannerLink,
    public readonly host: string,
    options: { cause: unknown },
  ) {
    super(options);
    this.setMessage(
      `Couldn't reach ${host} to load the banner. Try again in a moment (reference ${this.metadata.errorId}).`,
    );
  }
}

type ImageSize = { readonly width: Pixels; readonly height: Pixels; readonly extension: string };

/** Reads the pixel size from a PNG, GIF, or JPEG header; null for anything else. */
const imageSize = (b: Uint8Array): ImageSize | null => {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { width: view.getUint32(16), height: view.getUint32(20), extension: "png" };
  }
  if (b.length >= 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true), extension: "gif" };
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    for (let at = 2; at + 9 < b.length; ) {
      if (b[at] !== 0xff) return null;
      const marker = b[at + 1] ?? 0;
      const length = view.getUint16(at + 2);
      const isFrame =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame)
        return { width: view.getUint16(at + 7), height: view.getUint16(at + 5), extension: "jpg" };
      at += 2 + length;
    }
  }
  return null;
};

/** The absolute path a banner link names on this computer (/…, ~/…, or file://…); null for others. */
const localPath = (link: BannerLink, home: FilePath): FilePath | null => {
  if (link.startsWith("~/")) return `${home}/${link.slice(2)}`;
  if (link.startsWith("/")) return link;
  // file:///path, or file://localhost/path; Herdr's runtime has no URL class.
  const file = /^file:\/\/(?:localhost)?(\/[^?#]*)/i.exec(link)?.[1];
  if (file !== undefined) {
    try {
      return decodeURIComponent(file);
    } catch {
      return null;
    }
  }
  return null;
};

/** Keeps an image's bytes in the banner folder, named by their hash, and describes it. */
const keep = async (bytes: Uint8Array, size: ImageSize, deps: BannerDeps): Promise<BannerFile> => {
  const path = `${deps.folder}/${deps.hash(bytes)}.${size.extension}`;
  await deps.files.write(path, bytes);
  return { path, width: size.width, height: size.height };
};

/** Reads a banner file on this computer, checks it as an image, and keeps a copy. */
const fetchLocal = async (link: BannerLink, path: FilePath, deps: BannerDeps) => {
  // Awaited inside try, so a read that throws at once (Herdr's readFile, for a path outside the folders
  // it lets a mod read) is caught like one that rejects.
  let bytes: Uint8Array;
  try {
    bytes = await deps.localFiles.read(path);
  } catch (cause) {
    throw new BannerFileUnreadableError(link, path, { cause });
  }
  if (bytes.length > maxBytes) throw new BannerTooLargeError(link, bytes.length);
  const size = imageSize(bytes);
  if (!size) throw new BannerFileNotImageError(link, path);
  return keep(bytes, size, deps);
};

/**
 * Makes a banner from a link: an https link is downloaded, and a file on this computer (/…, ~/…, or
 * file://…) is read. Either is checked as an image and kept in Herdr's app folder.
 */
export const fetchBanner = async (link: BannerLink, deps: BannerDeps): Promise<BannerFile> => {
  const local = localPath(link, deps.home);
  if (local !== null) return fetchLocal(link, local, deps);
  const host = /^https:\/\/([^/?#:@\s]+)/i.exec(link)?.[1];
  if (!host) throw new BannerLinkError(link);
  // Each download has its own temporary file, so downloads that overlap never read each other's bytes.
  const temp = `${deps.folder}/download-${crypto.randomUUID()}.tmp`;
  const result = await deps.downloader.download(link, temp);
  if (result.kind === "unreachable")
    throw new BannerUnreachableError(link, host, { cause: result.cause });
  const refuse = (error: BannerError) => deps.files.remove(temp).then(() => Promise.reject(error));
  if (result.status >= 400) return refuse(new BannerHttpError(link, result.status));
  if (!result.contentType.startsWith("image/"))
    return refuse(new BannerNotImageError(link, result.contentType));
  if (result.size > maxBytes) return refuse(new BannerTooLargeError(link, result.size));
  const bytes = await deps.files.read(temp);
  const size = imageSize(bytes);
  if (!size) return refuse(new BannerNotImageError(link, result.contentType));
  const banner = await keep(bytes, size, deps);
  await deps.files.remove(temp);
  return banner;
};
