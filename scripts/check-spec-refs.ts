// Checks that a spec's cross-references resolve and that every claim has a test case.
// Usage: bun scripts/check-spec-refs.ts <spec.html> [...more specs]
// Exits non-zero when any spec has an unresolved reference or an unchecked claim.

const strip = (s: string): string => s.replace(/<[^>]+>/g, "").trim();
const slug = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "");
const all = (h: string, re: RegExp): string[] => [...h.matchAll(re)].map((m) => m[1] ?? "");

type SpecReport = {
  spec: string;
  unresolved: string[];
  claimsWithNoCase: string[];
  duplicateQuestionTitles: string[];
  cases: number;
  open: string[];
};

function check(spec: string, h: string): SpecReport {
  const claimLists = [...h.matchAll(/<details open class="claims">[\s\S]*?<\/details>/g)].map(
    (m) => m[0],
  );
  const claims = new Set(
    claimLists.flatMap((list) =>
      all(list, /<li>([\s\S]*?)<\/li>/g).map((c) => strip(c).toLowerCase()),
    ),
  );
  const modules = new Set(all(h, /<spec-module>\s*<h3>([^<]+)<\/h3>/g).map((m) => m.toLowerCase()));
  const phases = new Set(
    all(h, /<spec-phase[^>]*>\s*<h3>([^<]+)<\/h3>/g).map((p) => p.toLowerCase()),
  );
  const titles = all(h, /<spec-question[^>]*>\s*<h3>([^<]+)/g);
  const questionIds = new Set(titles.map((t) => slug(`spec-question-${t}`)));
  const traces = all(h, /traces-to="([^"]+)"/g);

  const unresolved = [
    ...traces.filter((t) => !claims.has(t.toLowerCase())).map((t) => `traces-to: ${t}`),
    ...all(h, /covers-module="([^"]+)"/g)
      .filter((m) => !modules.has(m.toLowerCase()))
      .map((m) => `covers-module: ${m}`),
    ...all(h, /depends-on="([^"]+)"/g)
      .flatMap((d) => d.split(",").map((p) => p.trim()))
      .filter((p) => !phases.has(p.toLowerCase()))
      .map((p) => `depends-on: ${p}`),
    ...all(h, /href="#(spec-question-[^"]+)"/g)
      .filter((id) => !questionIds.has(id))
      .map((id) => `link: ${id}`),
  ];
  const traced = new Set(traces.map((t) => t.toLowerCase()));
  return {
    spec,
    unresolved,
    claimsWithNoCase: [...claims].filter((c) => !traced.has(c)),
    duplicateQuestionTitles: titles.filter((t, i) => titles.indexOf(t) !== i),
    cases: (h.match(/<test-case /g) ?? []).length,
    open: all(h, /<spec-question status="open"[^>]*>\s*<h3>([^<]+)/g),
  };
}

const reports = await Promise.all(
  Bun.argv.slice(2).map(async (spec) => check(spec, await Bun.file(spec).text())),
);
for (const r of reports) console.log(r);
const failed = reports.some(
  (r) =>
    r.unresolved.length > 0 ||
    r.claimsWithNoCase.length > 0 ||
    r.duplicateQuestionTitles.length > 0,
);
process.exit(failed ? 1 : 0);

export {};
