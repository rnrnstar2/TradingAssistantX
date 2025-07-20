#!/usr/bin/env npx tsx

import { Octokit } from '@octokit/rest';

interface Dependency {
  issueNumber: number;
  type: 'blocks' | 'depends-on';
  title?: string;
  status?: 'open' | 'closed';
}

interface IssueWithDependencies {
  number: number;
  title: string;
  state: 'open' | 'closed';
  dependencies: Dependency[];
}

async function checkDependencies(issueNumbers: number[]): Promise<Map<number, IssueWithDependencies>> {
  const token = process.env.GITHUB_TOKEN;
  const [owner, repo] = process.env.GITHUB_REPOSITORY?.split('/') || ['', ''];

  if (!token || !owner || !repo) {
    throw new Error('環境変数GITHUB_TOKENおよびGITHUB_REPOSITORYが必要です');
  }

  const octokit = new Octokit({ auth: token });
  const dependencyMap = new Map<number, IssueWithDependencies>();

  for (const issueNumber of issueNumbers) {
    try {
      const { data: issue } = await octokit.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      });

      const dependencies = parseDependencies(issue.body || '');
      
      for (const dep of dependencies) {
        try {
          const { data: depIssue } = await octokit.issues.get({
            owner,
            repo,
            issue_number: dep.issueNumber,
          });
          dep.title = depIssue.title;
          dep.status = depIssue.state as 'open' | 'closed';
        } catch (e) {
          console.warn(`⚠️  依存イシュー #${dep.issueNumber} の取得に失敗`);
        }
      }

      dependencyMap.set(issueNumber, {
        number: issue.number,
        title: issue.title,
        state: issue.state as 'open' | 'closed',
        dependencies,
      });
    } catch (error) {
      console.error(`❌ イシュー #${issueNumber} の取得に失敗:`, error);
    }
  }

  return dependencyMap;
}

function parseDependencies(body: string): Dependency[] {
  const dependencies: Dependency[] = [];
  
  const blocksPattern = /blocks:\s*#(\d+)/gi;
  const dependsOnPattern = /depends[\s-]?on:\s*#(\d+)/gi;
  
  let match;
  while ((match = blocksPattern.exec(body)) !== null) {
    dependencies.push({
      issueNumber: parseInt(match[1], 10),
      type: 'blocks',
    });
  }
  
  while ((match = dependsOnPattern.exec(body)) !== null) {
    dependencies.push({
      issueNumber: parseInt(match[1], 10),
      type: 'depends-on',
    });
  }

  return dependencies;
}

function printDependencyTree(dependencyMap: Map<number, IssueWithDependencies>) {
  console.log('\n🔗 依存関係ツリー:\n');
  
  for (const [issueNumber, issueData] of dependencyMap) {
    console.log(`📋 #${issueNumber} - ${issueData.title} [${issueData.state}]`);
    
    if (issueData.dependencies.length > 0) {
      issueData.dependencies.forEach((dep, index) => {
        const isLast = index === issueData.dependencies.length - 1;
        const prefix = isLast ? '└── ' : '├── ';
        const typeIcon = dep.type === 'blocks' ? '🚫' : '⏳';
        const statusIcon = dep.status === 'closed' ? '✅' : '🔴';
        
        console.log(`   ${prefix}${typeIcon} ${dep.type} #${dep.issueNumber} ${statusIcon} ${dep.title || '(不明)'}`);
      });
    } else {
      console.log('   └── 依存関係なし');
    }
    console.log('');
  }
}

if (require.main === module) {
  const issueNumbers = process.argv.slice(2).map(arg => parseInt(arg, 10)).filter(n => !isNaN(n));
  
  if (issueNumbers.length === 0) {
    console.error('使用方法: tsx check-dependencies.ts <issue-number> [issue-number...]');
    process.exit(1);
  }

  checkDependencies(issueNumbers)
    .then(dependencyMap => {
      printDependencyTree(dependencyMap);
    })
    .catch(error => {
      console.error('エラー:', error);
      process.exit(1);
    });
}

export { checkDependencies, parseDependencies, type IssueWithDependencies, type Dependency };