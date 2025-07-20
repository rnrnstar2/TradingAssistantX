#!/usr/bin/env npx tsx

import { checkDependencies, type IssueWithDependencies } from './check-dependencies';

interface MergeOrder {
  phase: number;
  issues: number[];
  canParallel: boolean;
}

function calculateMergeOrder(dependencyMap: Map<number, IssueWithDependencies>): MergeOrder[] {
  const graph = new Map<number, Set<number>>();
  const inDegree = new Map<number, number>();
  const allIssues = new Set<number>();

  for (const [issueNumber, issueData] of dependencyMap) {
    allIssues.add(issueNumber);
    if (!graph.has(issueNumber)) {
      graph.set(issueNumber, new Set());
    }
    if (!inDegree.has(issueNumber)) {
      inDegree.set(issueNumber, 0);
    }

    for (const dep of issueData.dependencies) {
      if (dep.type === 'depends-on') {
        allIssues.add(dep.issueNumber);
        
        if (!graph.has(dep.issueNumber)) {
          graph.set(dep.issueNumber, new Set());
        }
        
        graph.get(dep.issueNumber)!.add(issueNumber);
        
        inDegree.set(issueNumber, (inDegree.get(issueNumber) || 0) + 1);
        
        if (!inDegree.has(dep.issueNumber)) {
          inDegree.set(dep.issueNumber, 0);
        }
      }
    }
  }

  const mergeOrder: MergeOrder[] = [];
  const queue: number[] = [];
  
  for (const issue of allIssues) {
    if (inDegree.get(issue) === 0) {
      queue.push(issue);
    }
  }

  let phase = 1;
  while (queue.length > 0) {
    const currentPhaseIssues = [...queue];
    queue.length = 0;

    mergeOrder.push({
      phase,
      issues: currentPhaseIssues,
      canParallel: currentPhaseIssues.length > 1,
    });

    for (const issue of currentPhaseIssues) {
      const neighbors = graph.get(issue) || new Set();
      for (const neighbor of neighbors) {
        const degree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, degree);
        
        if (degree === 0) {
          queue.push(neighbor);
        }
      }
    }

    phase++;
  }

  const processedIssues = new Set(mergeOrder.flatMap(m => m.issues));
  for (const issue of allIssues) {
    if (!processedIssues.has(issue) && inDegree.get(issue)! > 0) {
      console.warn(`⚠️  循環依存を検出: イシュー #${issue}`);
    }
  }

  return mergeOrder;
}

function printMergeOrder(mergeOrder: MergeOrder[], dependencyMap: Map<number, IssueWithDependencies>) {
  console.log('\n📊 推奨マージ順序:\n');
  
  for (const phase of mergeOrder) {
    console.log(`🔢 フェーズ ${phase.phase}:`);
    
    if (phase.canParallel) {
      console.log('   ⚡ 以下のイシューは並行してマージ可能:');
    }
    
    for (const issueNumber of phase.issues) {
      const issueData = dependencyMap.get(issueNumber);
      const title = issueData?.title || '(不明)';
      const state = issueData?.state || 'unknown';
      const stateIcon = state === 'closed' ? '✅' : '🔴';
      
      console.log(`   • #${issueNumber} ${stateIcon} - ${title}`);
    }
    console.log('');
  }

  console.log('📝 マージ戦略:');
  console.log('1. 各フェーズ内のイシューは依存関係がないため、並行作業可能');
  console.log('2. 次のフェーズに進む前に、現在のフェーズの全イシューをマージ');
  console.log('3. コンフリクトが発生した場合は、Claude Codeでの解決を推奨\n');
}

async function generateMergeScript(mergeOrder: MergeOrder[], dependencyMap: Map<number, IssueWithDependencies>) {
  const script: string[] = ['#!/bin/bash', '', 'set -e', ''];
  
  for (const phase of mergeOrder) {
    script.push(`# フェーズ ${phase.phase}`);
    script.push(`echo "\\n🔢 フェーズ ${phase.phase} のマージを開始...\\n"`);
    
    for (const issueNumber of phase.issues) {
      const branchName = `issue-${issueNumber}-*`;
      script.push(`# イシュー #${issueNumber}`);
      script.push(`if git show-ref --verify --quiet refs/heads/${branchName}; then`);
      script.push(`  echo "🌿 ブランチ ${branchName} をマージ中..."`);
      script.push(`  git checkout main`);
      script.push(`  git pull origin main`);
      script.push(`  git merge --no-ff ${branchName} -m "Merge branch '${branchName}' (#${issueNumber})"`);
      script.push(`  echo "✅ マージ完了: ${branchName}"`);
      script.push(`else`);
      script.push(`  echo "⚠️  ブランチ ${branchName} が見つかりません"`);
      script.push(`fi`);
      script.push('');
    }
    
    script.push(`echo "✅ フェーズ ${phase.phase} 完了\\n"`);
    script.push('');
  }
  
  return script.join('\n');
}

if (require.main === module) {
  const issueNumbers = process.argv.slice(2).map(arg => parseInt(arg, 10)).filter(n => !isNaN(n));
  
  if (issueNumbers.length === 0) {
    console.error('使用方法: tsx merge-order-calculator.ts <issue-number> [issue-number...]');
    process.exit(1);
  }

  checkDependencies(issueNumbers)
    .then(async dependencyMap => {
      const mergeOrder = calculateMergeOrder(dependencyMap);
      printMergeOrder(mergeOrder, dependencyMap);
      
      if (process.argv.includes('--generate-script')) {
        const script = await generateMergeScript(mergeOrder, dependencyMap);
        console.log('📄 マージスクリプト:');
        console.log('```bash');
        console.log(script);
        console.log('```');
      }
    })
    .catch(error => {
      console.error('エラー:', error);
      process.exit(1);
    });
}

export { calculateMergeOrder, type MergeOrder };