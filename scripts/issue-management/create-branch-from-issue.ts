#!/usr/bin/env npx tsx

import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';

interface Issue {
  number: number;
  title: string;
  labels?: Array<{ name: string }>;
}

async function createBranchFromIssue(issueNumber: number) {
  const token = process.env.GITHUB_TOKEN;
  const [owner, repo] = process.env.GITHUB_REPOSITORY?.split('/') || ['', ''];

  if (!token || !owner || !repo) {
    throw new Error('環境変数GITHUB_TOKENおよびGITHUB_REPOSITORYが必要です');
  }

  const octokit = new Octokit({ auth: token });

  try {
    const { data: issue } = await octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    const branchName = generateBranchName(issue);
    
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    if (currentBranch !== 'main' && currentBranch !== 'dev') {
      execSync('git checkout dev');
    }

    execSync(`git checkout -b ${branchName}`);
    
    console.log(`✅ ブランチ作成成功: ${branchName}`);
    console.log(`📝 イシュー: #${issue.number} - ${issue.title}`);
    console.log(`\n💡 git worktreeを使用する場合:`);
    console.log(`   git worktree add ../ArbitrageAssistant-${branchName} ${branchName}`);
    
    if (process.env.SKIP_GITHUB_COMMENT !== 'true') {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: `🌿 ブランチ \`${branchName}\` を作成しました。`,
      });
    }

    return branchName;
  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

function generateBranchName(issue: Issue): string {
  const titleSlug = issue.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
  
  return `issue-${issue.number}-${titleSlug}`;
}

if (require.main === module) {
  const issueNumber = parseInt(process.argv[2], 10);
  
  if (!issueNumber) {
    console.error('使用方法: tsx create-branch-from-issue.ts <issue-number>');
    process.exit(1);
  }

  createBranchFromIssue(issueNumber).catch(() => process.exit(1));
}

export { createBranchFromIssue, generateBranchName };