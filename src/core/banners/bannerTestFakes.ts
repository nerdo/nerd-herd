// Test doubles for fetching banners: a downloader answering from a table, files kept in memory,
// and small image headers. Shared by the banner tests.
import type { NerdHerdError } from "../errors/nerdHerdError";
import { BannerError, type BannerLink, type Downloader, type FileStore } from "./fetchBanner";
import { fileHash } from "./fileHash";

type Answer = { status: number; contentType: string; bytes: Uint8Array } | "unreachable";

/** A downloader that answers from a table and records what it was asked. */
class FakeDownloader implements Downloader {
  readonly asked: BannerLink[] = [];
  constructor(
    private readonly answers: Record<BannerLink, Answer>,
    private readonly files: MemoryFiles,
  ) {}
  async download(link: BannerLink, to: string) {
    this.asked.push(link);
    const answer = this.answers[link];
    if (answer === undefined || answer === "unreachable")
      return { kind: "unreachable" as const, cause: "fake: cannot connect" };
    this.files.saved.set(to, answer.bytes);
    // Answer on a later tick, as a real download does, so two downloads can overlap.
    await Promise.resolve();
    return {
      kind: "answered" as const,
      status: answer.status,
      contentType: answer.contentType,
      size: answer.bytes.length,
    };
  }
}

/** A file store kept in memory. */
class MemoryFiles implements FileStore {
  readonly saved = new Map<string, Uint8Array>();
  async read(path: string) {
    const bytes = this.saved.get(path);
    if (!bytes) throw new Error(`fake: no file ${path}`);
    return bytes;
  }
  async write(path: string, bytes: Uint8Array) {
    this.saved.set(path, bytes);
  }
  async remove(path: string) {
    this.saved.delete(path);
  }
}

export const hash = fileHash;

/** A PNG's signature and header chunk: enough for its pixel size. */
export const png = (width: number, height: number, padding = 0) => {
  const b = new Uint8Array(33 + padding);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return b;
};

export const setup = (
  answers: Record<BannerLink, Answer>,
  onDisk: Record<string, Uint8Array> = {},
) => {
  const files = new MemoryFiles();
  const downloader = new FakeDownloader(answers, files);
  const localFiles = new MemoryFiles();
  for (const [path, bytes] of Object.entries(onDisk)) localFiles.saved.set(path, bytes);
  return {
    files,
    downloader,
    deps: {
      downloader,
      files,
      localFiles,
      home: "/Users/test",
      hash,
      folder: "mods/nerd-herd-spaces/.banners",
    },
  };
};

export const rejection = async (p: Promise<unknown>): Promise<NerdHerdError> => {
  let value: unknown;
  try {
    value = await p;
  } catch (error) {
    if (error instanceof BannerError) return error;
    throw error;
  }
  throw new Error(`expected a banner error, got ${JSON.stringify(value)}`);
};
