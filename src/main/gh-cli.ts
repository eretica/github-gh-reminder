import { execSync } from 'child_process'

export interface GHPullRequest {
  number: number
  title: string
  url: string
  author: {
    login: string
  }
  createdAt: string
}

export function fetchReviewRequestedPRs(repoPath: string): GHPullRequest[] {
  try {
    const command = `gh pr list --search "review-requested:@me" --limit 100 --json number,title,url,author,createdAt`
    const result = execSync(command, {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 30000
    })
    return JSON.parse(result)
  } catch (error) {
    console.error(`Failed to fetch PRs for ${repoPath}:`, error)
    return []
  }
}

export function isGhInstalled(): boolean {
  try {
    execSync('gh --version', { encoding: 'utf-8', timeout: 5000 })
    return true
  } catch {
    return false
  }
}

export function isGhAuthenticated(): boolean {
  try {
    execSync('gh auth status', { encoding: 'utf-8', timeout: 5000 })
    return true
  } catch {
    return false
  }
}

export function getGhStatus(): { installed: boolean; authenticated: boolean } {
  const installed = isGhInstalled()
  const authenticated = installed ? isGhAuthenticated() : false
  return { installed, authenticated }
}

export function getRepoName(repoPath: string): string | null {
  try {
    const result = execSync('gh repo view --json nameWithOwner --jq .nameWithOwner', {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 10000
    })
    return result.trim()
  } catch {
    return null
  }
}

export function isGitRepository(path: string): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      cwd: path,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return true
  } catch {
    return false
  }
}
