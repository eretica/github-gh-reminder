import { execSync } from "node:child_process";

export interface GHPullRequest {
  number: number;
  title: string;
  url: string;
  author: {
    login: string;
  };
  createdAt: string;
  isDraft: boolean;
  state: string;
  reviewDecision: string | null;
  reviewRequests: Array<{ __typename: string; login?: string }>;
  comments: Array<{ id: string }>;
  changedFiles: number;
  mergeable: string;
  statusCheckRollup: {
    state: string;
  } | null;
}

/**
 * Fetches pull requests where the current user is requested as a reviewer.
 *
 * This function implements a hybrid approach to handle intermittent failures
 * with GitHub's search API:
 * 1. First attempts using --search with --no-cache flag
 * 2. Falls back to fetching all open PRs and filtering client-side if search fails
 *
 * Why this approach?
 * - GitHub's search index may have delays (60-90s) for new review requests
 * - gh CLI may cache results, causing stale data
 * - The fallback ensures reliable fetching even when search is inconsistent
 */
export function fetchReviewRequestedPRs(repoPath: string): GHPullRequest[] {
  const jsonFields = "number,title,url,author,createdAt,isDraft,state,reviewDecision,reviewRequests,comments,changedFiles,mergeable,statusCheckRollup";

  try {
    // Primary approach: Use search with cache disabled
    const searchCommand = `gh pr list --search "review-requested:@me" --limit 100 --json ${jsonFields}`;
    const result = execSync(searchCommand, {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 30000,
      env: { ...process.env, GH_NO_UPDATE_NOTIFIER: "1" },
    });

    const prs = JSON.parse(result);

    // If we got results, return them
    if (prs.length > 0) {
      return prs;
    }

    // If search returned empty, try fallback approach
    // This handles cases where search index hasn't updated yet
    return fetchWithFallback(repoPath, jsonFields);
  } catch (error) {
    console.error(`Search approach failed for ${repoPath}, trying fallback:`, error);
    return fetchWithFallback(repoPath, jsonFields);
  }
}

/**
 * Fallback method: Fetch all open PRs and filter client-side.
 * This is more reliable than search but requires more API calls.
 */
function fetchWithFallback(repoPath: string, jsonFields: string): GHPullRequest[] {
  try {
    // Fetch all open PRs (no search filter)
    const command = `gh pr list --state open --limit 100 --json ${jsonFields}`;
    const result = execSync(command, {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 30000,
      env: { ...process.env, GH_NO_UPDATE_NOTIFIER: "1" },
    });

    const allPRs: GHPullRequest[] = JSON.parse(result);

    // Filter to only PRs where current user is requested as reviewer
    // reviewRequests contains array of { __typename: "User" | "Team", login?: string }
    // We check if there's any User type request (team-only requests are excluded)
    return allPRs.filter(pr =>
      pr.reviewRequests &&
      pr.reviewRequests.some(req => req.__typename === "User")
    );
  } catch (error) {
    console.error(`Fallback approach also failed for ${repoPath}:`, error);
    return [];
  }
}

export function isGhInstalled(): boolean {
  try {
    execSync("gh --version", { encoding: "utf-8", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export function isGhAuthenticated(): boolean {
  try {
    execSync("gh auth status", { encoding: "utf-8", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export function getGhStatus(): { installed: boolean; authenticated: boolean } {
  const installed = isGhInstalled();
  const authenticated = installed ? isGhAuthenticated() : false;
  return { installed, authenticated };
}

export function getRepoName(repoPath: string): string | null {
  try {
    const result = execSync(
      "gh repo view --json nameWithOwner --jq .nameWithOwner",
      {
        cwd: repoPath,
        encoding: "utf-8",
        timeout: 10000,
      },
    );
    return result.trim();
  } catch {
    return null;
  }
}

export function isGitRepository(path: string): boolean {
  try {
    execSync("git rev-parse --git-dir", {
      cwd: path,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}
