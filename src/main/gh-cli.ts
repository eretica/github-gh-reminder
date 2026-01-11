import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * gh コマンドをユーザーのシェル経由で実行するヘルパー関数
 * ログインシェルとして実行することで、.zshrc/.zprofileなどで設定されたPATHを使用
 */
async function runGh(
  args: string[],
  cwd?: string,
): Promise<{ stdout: string; stderr: string }> {
  const ghCommand = `gh ${args.map((arg) => `'${arg.replace(/'/g, "'\\''")}'`).join(" ")}`;
  return await execFileAsync("/bin/zsh", ["-l", "-c", ghCommand], {
    cwd,
    timeout: 30000,
  });
}

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

export interface GHCliResult {
  success: boolean;
  prs: GHPullRequest[];
  logs: string[];
  error?: string;
}

export async function fetchReviewRequestedPRs(
  repoPath: string,
): Promise<GHCliResult> {
  const logs: string[] = [];

  try {
    const args = [
      "pr",
      "list",
      "--search",
      "review-requested:@me",
      "--limit",
      "100",
      "--json",
      "number,title,url,author,createdAt,isDraft,state,reviewDecision,reviewRequests,comments,changedFiles,mergeable,statusCheckRollup",
    ];

    const { stdout } = await runGh(args, repoPath);
    const prs = JSON.parse(stdout) as GHPullRequest[];

    return {
      success: true,
      prs,
      logs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logs.push(`[gh-cli] Error: ${errorMessage}`);

    return {
      success: false,
      prs: [],
      logs,
      error: errorMessage,
    };
  }
}

export async function getRepoName(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await runGh(
      ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"],
      repoPath,
    );
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function isGitRepository(path: string): Promise<boolean> {
  try {
    await execFileAsync("/bin/zsh", ["-l", "-c", "git rev-parse --git-dir"], {
      cwd: path,
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}
