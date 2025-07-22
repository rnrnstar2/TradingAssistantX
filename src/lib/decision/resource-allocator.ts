import {
  CollectionTask,
  TimeBudget,
  ExecutionPlan,
  ExecutionState,
  ReallocationPlan,
  CollectionMethod,
  ExecutionConstraints,
  CollectionCandidate,
  ParetoSolution,
  ResourceUnit,
  UtilityScore,
  PriorityAdjustment,
  OptimizationPlan,
  ResourceAllocation,
  QualityTargets,
  FallbackStrategy,
  ResourceCost,
  ResourceUsage
} from '../../types/decision-types.js';

export class ResourceAllocator {
  allocateTimebudget(totalBudget: number, tasks: CollectionTask[]): TimeBudget {
    const bufferPercentage = 0.15;
    const bufferTime = Math.round(totalBudget * bufferPercentage);
    const availableTime = totalBudget - bufferTime;

    const taskAllocations = new Map<string, number>();
    const totalEstimatedTime = tasks.reduce((sum, task) => sum + task.estimatedTime, 0);
    
    const criticalPath = this.calculateCriticalPath(tasks);
    
    if (totalEstimatedTime <= availableTime) {
      for (const task of tasks) {
        taskAllocations.set(task.id, task.estimatedTime);
      }
    } else {
      const scalingFactor = availableTime / totalEstimatedTime;
      for (const task of tasks) {
        const priorityMultiplier = this.getPriorityMultiplier(task, criticalPath);
        const allocatedTime = Math.round(task.estimatedTime * scalingFactor * priorityMultiplier);
        taskAllocations.set(task.id, allocatedTime);
      }
    }

    return {
      totalTime: totalBudget,
      taskAllocations,
      bufferTime,
      criticalPath
    };
  }

  optimizeExecutionPlan(tasks: CollectionTask[]): ExecutionPlan {
    const { parallelTasks, sequentialTasks } = this.analyzeTaskDependencies(tasks);
    const criticalPath = this.calculateCriticalPath(tasks);
    const totalEstimatedTime = this.calculateTotalExecutionTime(parallelTasks, sequentialTasks);

    return {
      parallelTasks,
      sequentialTasks,
      criticalPath,
      totalEstimatedTime
    };
  }

  reallocateResources(currentExecution: ExecutionState): ReallocationPlan {
    const performance = this.analyzePerformance(currentExecution);
    const taskReassignments = this.calculateTaskReassignments(currentExecution, performance);
    const methodChanges = this.determineMethodChanges(currentExecution, performance);
    const priorityAdjustments = this.adjustTaskPriorities(currentExecution, performance);

    return {
      taskReassignments,
      methodChanges,
      priorityAdjustments
    };
  }

  private getPriorityMultiplier(task: CollectionTask, criticalPath: string[]): number {
    let multiplier = 1.0;

    if (criticalPath.includes(task.id)) {
      multiplier *= 1.3;
    }

    if (task.priority > 80) {
      multiplier *= 1.2;
    } else if (task.priority < 30) {
      multiplier *= 0.8;
    }

    return multiplier;
  }

  private calculateCriticalPath(tasks: CollectionTask[]): string[] {
    const sortedByPriority = [...tasks]
      .sort((a, b) => b.priority - a.priority)
      .slice(0, Math.ceil(tasks.length / 2));

    return sortedByPriority.map(task => task.id);
  }

  private analyzeTaskDependencies(tasks: CollectionTask[]): { 
    parallelTasks: CollectionTask[], 
    sequentialTasks: CollectionTask[] 
  } {
    const parallelTasks: CollectionTask[] = [];
    const sequentialTasks: CollectionTask[] = [];

    for (const task of tasks) {
      if (task.dependencies.length === 0) {
        parallelTasks.push(task);
      } else {
        sequentialTasks.push(task);
      }
    }

    return { parallelTasks, sequentialTasks };
  }

  private calculateTotalExecutionTime(parallelTasks: CollectionTask[], sequentialTasks: CollectionTask[]): number {
    const maxParallelTime = Math.max(
      ...parallelTasks.map(task => task.estimatedTime),
      0
    );
    
    const totalSequentialTime = sequentialTasks.reduce(
      (sum, task) => sum + task.estimatedTime, 
      0
    );

    return maxParallelTime + totalSequentialTime;
  }

  private analyzePerformance(execution: ExecutionState): {
    timeEfficiency: number;
    resourceEfficiency: number;
    qualityPerformance: number;
    taskSuccessRate: number;
  } {
    const totalTasks = execution.currentTasks.length + execution.completedTasks.length + execution.failedTasks.length;
    const taskSuccessRate = totalTasks > 0 ? execution.completedTasks.length / totalTasks * 100 : 0;
    
    const timeEfficiency = execution.timeRemaining > 0 ? 80 : 50;
    const resourceEfficiency = execution.resourcesUsed.memoryMb < 80 ? 90 : 60;
    const qualityPerformance = execution.qualityAchieved;

    return {
      timeEfficiency,
      resourceEfficiency,
      qualityPerformance,
      taskSuccessRate
    };
  }

  private calculateTaskReassignments(execution: ExecutionState, performance: any): Map<string, number> {
    const reassignments = new Map<string, number>();

    if (performance.timeEfficiency < 60) {
      for (const task of execution.currentTasks.filter(t => t.estimatedTime > 5000)) {
        const newTime = Math.round(task.estimatedTime * 0.7);
        reassignments.set(task.id, newTime);
      }
    }

    return reassignments;
  }

  private determineMethodChanges(execution: ExecutionState, performance: any): Map<string, CollectionMethod> {
    const methodChanges = new Map<string, CollectionMethod>();

    if (performance.qualityPerformance < 60) {
      for (const task of execution.currentTasks.filter(t => t.method === CollectionMethod.SIMPLE_HTTP)) {
        methodChanges.set(task.id, CollectionMethod.HYBRID);
      }
    }

    return methodChanges;
  }

  private adjustTaskPriorities(execution: ExecutionState, performance: any): Map<string, number> {
    const priorityAdjustments = new Map<string, number>();

    if (performance.taskSuccessRate < 70) {
      const highValueTasks = execution.currentTasks
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 3);

      for (const task of highValueTasks) {
        const newPriority = Math.min(100, task.priority + 20);
        priorityAdjustments.set(task.id, newPriority);
      }
    }

    return priorityAdjustments;
  }
}

export class EfficiencyOptimizer {
  findParetoOptimal(candidates: CollectionCandidate[]): ParetoSolution[] {
    const solutions: ParetoSolution[] = [];

    for (const candidate of candidates) {
      const qualityScore = candidate.estimatedValue * candidate.confidenceLevel;
      const efficiencyScore = this.calculateEfficiencyScore(candidate);
      const dominatedBy = this.findDominatingCandidates(candidate, candidates);

      solutions.push({
        candidate,
        qualityScore,
        efficiencyScore,
        dominatedBy
      });
    }

    return solutions.filter(solution => solution.dominatedBy.length === 0);
  }

  calculateMarginalUtility(resource: ResourceUnit): UtilityScore {
    const baseMarginalValues = {
      time: 0.8,
      memory: 0.3,
      cpu: 0.5
    };

    const marginalValue = baseMarginalValues[resource.type] * resource.amount;
    const marginalCost = this.calculateMarginalCost(resource);
    const ratio = marginalCost > 0 ? marginalValue / marginalCost : marginalValue;

    let recommendation: string;
    if (ratio > 2) {
      recommendation = 'highly_recommended';
    } else if (ratio > 1) {
      recommendation = 'recommended';
    } else if (ratio > 0.5) {
      recommendation = 'marginal';
    } else {
      recommendation = 'not_recommended';
    }

    return {
      marginalValue,
      marginalCost,
      ratio,
      recommendation
    };
  }

  adjustPrioritiesDynamically(executionState: ExecutionState): PriorityAdjustment[] {
    const adjustments: PriorityAdjustment[] = [];
    
    const performingWell = executionState.completedTasks.filter(task => 
      this.isTaskPerformingWell(task, executionState)
    );

    const underperforming = executionState.currentTasks.filter(task => 
      this.isTaskUnderperforming(task, executionState)
    );

    for (const task of underperforming) {
      const oldPriority = task.priority;
      const newPriority = Math.max(10, oldPriority - 20);
      
      adjustments.push({
        taskId: task.id,
        oldPriority,
        newPriority,
        reasoning: 'Underperforming task priority reduced'
      });
    }

    const criticalTasks = executionState.currentTasks
      .filter(task => task.siteUrl.includes('minkabu') || task.siteUrl.includes('zai'))
      .slice(0, 2);

    for (const task of criticalTasks) {
      const oldPriority = task.priority;
      const newPriority = Math.min(100, oldPriority + 15);
      
      adjustments.push({
        taskId: task.id,
        oldPriority,
        newPriority,
        reasoning: 'Critical financial site priority boosted'
      });
    }

    return adjustments;
  }

  createOptimizationPlan(constraints: ExecutionConstraints): OptimizationPlan {
    const taskPriorities = new Map<string, number>();
    
    taskPriorities.set('minkabu_fx', 90);
    taskPriorities.set('zai_fx', 85);
    taskPriorities.set('traderswebfx', 75);

    const resourceAllocation: ResourceAllocation = {
      timeDistribution: new Map([
        ['high_priority', constraints.maxTotalTime * 0.5],
        ['medium_priority', constraints.maxTotalTime * 0.3],
        ['low_priority', constraints.maxTotalTime * 0.2]
      ]),
      memoryDistribution: new Map([
        ['simple_http', constraints.maxMemoryUsage * 0.2],
        ['hybrid', constraints.maxMemoryUsage * 0.4],
        ['playwright', constraints.maxMemoryUsage * 0.4]
      ]),
      concurrencyLimits: new Map([
        ['simple_http', Math.floor(constraints.maxConcurrentRequests * 0.6)],
        ['hybrid', Math.floor(constraints.maxConcurrentRequests * 0.3)],
        ['playwright', Math.floor(constraints.maxConcurrentRequests * 0.1)]
      ])
    };

    const qualityTargets: QualityTargets = {
      minimum: constraints.qualityThreshold,
      target: Math.min(95, constraints.qualityThreshold + 15),
      maximum: 95
    };

    const fallbackStrategies: FallbackStrategy[] = [
      {
        trigger: 'quality_below_threshold',
        action: 'upgrade_method',
        alternativeMethod: CollectionMethod.HYBRID,
        resourceAdjustment: { timeMs: 2000, memoryMb: 30, cpuUnits: 2 }
      },
      {
        trigger: 'timeout_exceeded',
        action: 'simplify_method',
        alternativeMethod: CollectionMethod.SIMPLE_HTTP,
        resourceAdjustment: { timeMs: -3000, memoryMb: -40, cpuUnits: -3 }
      }
    ];

    return {
      taskPriorities,
      resourceAllocation,
      qualityTargets,
      fallbackStrategies
    };
  }

  private calculateEfficiencyScore(candidate: CollectionCandidate): number {
    const valuePerTime = candidate.estimatedCost.timeMs > 0 ? 
      candidate.estimatedValue / (candidate.estimatedCost.timeMs / 1000) : 0;
    
    const valuePerMemory = candidate.estimatedCost.memoryMb > 0 ? 
      candidate.estimatedValue / candidate.estimatedCost.memoryMb : 0;

    const confidenceBonus = candidate.confidenceLevel * 0.1;

    return (valuePerTime * 0.6 + valuePerMemory * 0.3 + confidenceBonus) * 10;
  }

  private findDominatingCandidates(candidate: CollectionCandidate, allCandidates: CollectionCandidate[]): CollectionCandidate[] {
    return allCandidates.filter(other => {
      if (other === candidate) return false;
      
      const otherIsBetter = (
        other.estimatedValue >= candidate.estimatedValue &&
        other.estimatedCost.timeMs <= candidate.estimatedCost.timeMs &&
        other.estimatedCost.memoryMb <= candidate.estimatedCost.memoryMb &&
        other.confidenceLevel >= candidate.confidenceLevel
      );

      const otherIsStrictlyBetter = (
        other.estimatedValue > candidate.estimatedValue ||
        other.estimatedCost.timeMs < candidate.estimatedCost.timeMs ||
        other.estimatedCost.memoryMb < candidate.estimatedCost.memoryMb ||
        other.confidenceLevel > candidate.confidenceLevel
      );

      return otherIsBetter && otherIsStrictlyBetter;
    });
  }

  private calculateMarginalCost(resource: ResourceUnit): number {
    const baseCosts = {
      time: 1.0,
      memory: 0.5,
      cpu: 0.8
    };

    return baseCosts[resource.type] * resource.amount;
  }

  private isTaskPerformingWell(task: CollectionTask, state: ExecutionState): boolean {
    return true;
  }

  private isTaskUnderperforming(task: CollectionTask, state: ExecutionState): boolean {
    if (task.estimatedTime > 8000) return true;
    
    const avgQuality = state.qualityAchieved;
    if (avgQuality < 60) return true;

    return false;
  }
}