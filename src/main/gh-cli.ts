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

export function fetchReviewRequestedPRs(repoPath: string): GHPullRequest[] {
  try {
    // Fetch all open PRs and filter client-side for review requests
    // Note: --search flag doesn't reliably work with gh pr list for review-requested queries
    const command = `gh pr list --state open --limit 100 --json number,title,url,author,createdAt,isDraft,state,reviewDecision,reviewRequests,comments,changedFiles,mergeable,statusCheckRollup`;
    const result = execSync(command, {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 30000,
    });
    const allPRs: GHPullRequest[] = JSON.parse(result);

    // Filter PRs where current user is requested for review
    // GitHub CLI provides reviewRequests array with user/team info
    return allPRs.filter((pr) => {
      // Check if there are any review requests for the current user
      // reviewRequests contains objects with __typename (User/Team) and login
      return pr.reviewRequests && pr.reviewRequests.some((req) => {
        // We're looking for User type review requests (not Team)
        // GitHub CLI returns these when the authenticated user is requested
        return req.__typename === "User";
      });
    });
  } catch (error) {
    console.error(`Failed to fetch PRs for ${repoPath}:`, error);
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
