// biome-ignore lint/style/useNodejsImportProtocol: "fs/promises" is Herdr's module, not Node's; Herdr has no "node:" names.
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { appHome, exec } from "herdr";
import type {
  Downloader,
  DownloadResult,
  FilePath,
  FileStore,
  LocalFiles,
} from "../core/banners/fetchBanner";

// Herdr's fetch returns no binary body, so banners download with curl through Herdr's exec
// (spec: Banner research). curl enforces https and the 2 MB limit itself as well.
const curlArgs = (to: FilePath, link: string) => [
  "-sS",
  "-L",
  "--proto",
  "=https",
  "--max-filesize",
  "2097152",
  "-o",
  to,
  "-w",
  "%{http_code} %{content_type} %{size_download}",
  link,
];
/** curl exit codes that mean no server answered: could not resolve, connect, time out, or handshake. */
const unreachableCodes = new Set([5, 6, 7, 28, 35, 52, 56]);
/** curl exit code for a download stopped at --max-filesize. */
const tooLargeCode = 63;
const maxBytes = 2 * 1024 * 1024;

const absolute = (path: FilePath) => `${appHome()}/${path}`;

export const curlDownloader: Downloader = {
  async download(link, to): Promise<DownloadResult> {
    await mkdir(absolute(to).replace(/\/[^/]*$/, ""), { recursive: true });
    const r = await exec("curl", curlArgs(absolute(to), link), { timeout: 60_000 });
    if (unreachableCodes.has(r.code)) return { kind: "unreachable", cause: r.stderr.trim() };
    const [status, contentType, size] = r.stdout.trim().split(" ");
    return {
      kind: "answered",
      status: Number(status),
      contentType: contentType ?? "",
      size: r.code === tooLargeCode ? maxBytes + 1 : Number(size),
    };
  },
};

// Every adapter is async: Herdr's file calls can throw at once rather than reject (readFile, for a
// path outside the folders a mod may read), and an async function turns that throw into a rejection.
export const herdrFiles: FileStore = {
  read: async (path) => readFile(absolute(path)),
  write: async (path, bytes) => {
    await mkdir(absolute(path).replace(/\/[^/]*$/, ""), { recursive: true });
    await writeFile(absolute(path), bytes);
  },
  remove: async (path) => {
    await unlink(absolute(path));
  },
};

/** Files on this computer by absolute path; Herdr lets a mod read inside the home folder. */
export const herdrLocalFiles: LocalFiles = {
  read: async (path) => readFile(path),
};
