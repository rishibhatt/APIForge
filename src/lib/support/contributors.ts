import raw from "@/content/contributors.json";

export type ContributorTier = "maintainer" | "sponsor" | "supporter" | "contributor";

export interface Contributor {
  id: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  url?: string;
  tier: ContributorTier;
  /** YYYY-MM */
  since?: string;
  note?: string;
  /** Placeholder entry. The page labels these so nobody mistakes them for real people. */
  example?: boolean;
}

export const TIER_ORDER: ContributorTier[] = ["maintainer", "sponsor", "supporter", "contributor"];

export const TIER_LABEL: Record<ContributorTier, { singular: string; plural: string }> = {
  maintainer: { singular: "Maintainer", plural: "Maintainer" },
  sponsor: { singular: "Sponsor", plural: "Sponsors" },
  supporter: { singular: "Supporter", plural: "Supporters" },
  contributor: { singular: "Contributor", plural: "Contributors" },
};

const GITHUB_CONTRIBUTORS_URL =
  "https://api.github.com/repos/rishibhatt/APIForge/contributors?per_page=50";

interface GithubContributor {
  login?: string;
  avatar_url?: string;
  html_url?: string;
  type?: string;
  contributions?: number;
}

/** Contributors from the repo. Returns [] on any failure or rate limit; never throws. */
export async function getGithubContributors(): Promise<Contributor[]> {
  try {
    const res = await fetch(GITHUB_CONTRIBUTORS_URL, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    return (data as GithubContributor[])
      .filter((c) => c && typeof c.login === "string" && c.type !== "Bot")
      .map((c) => ({
        id: `gh-${c.login}`,
        name: c.login as string,
        handle: c.login,
        avatarUrl: c.avatar_url ? `${c.avatar_url}${c.avatar_url.includes("?") ? "&" : "?"}s=96` : undefined,
        url: c.html_url,
        tier: "contributor" as const,
        note:
          typeof c.contributions === "number"
            ? `${c.contributions} ${c.contributions === 1 ? "commit" : "commits"} on GitHub.`
            : undefined,
      }));
  } catch {
    return [];
  }
}

/** JSON entries first, then GitHub entries, deduped by handle (case-insensitive). */
export async function getAllContributors(): Promise<Contributor[]> {
  const local = raw as Contributor[];
  const github = await getGithubContributors();
  const seen = new Set<string>();
  const out: Contributor[] = [];
  for (const c of [...local, ...github]) {
    const key = (c.handle ?? c.id).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}
