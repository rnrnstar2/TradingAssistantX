import { Browser, BrowserContext, Page, LaunchOptions, BrowserContextOptions } from 'playwright';

// === Core Configuration Types ===

export interface BrowserOptions {
  headless?: boolean;
  timeout?: number;
  maxConcurrency?: number;
  memoryLimit?: number;
  enableGpuAcceleration?: boolean;
  customArgs?: string[];
}

export interface ContextOptions extends BrowserContextOptions {
  sessionId?: string;
  priority?: 'low' | 'normal' | 'high';
  resourceOptimization?: ResourceOptimizationLevel;
  memoryProfile?: MemoryProfile;
}

export type ResourceOptimizationLevel = 'minimal' | 'balanced' | 'aggressive';
export type MemoryProfile = 'low' | 'medium' | 'high' | 'unlimited';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// === Resource Usage & Monitoring ===

export interface ResourceUsageReport {
  timestamp: number;
  cpuUsage: CpuUsage;
  memoryUsage: MemoryUsage;
  networkLatency: number;
  gpuUsage?: GpuUsage;
  diskIo?: DiskIoUsage;
  optimizationOpportunities: OptimizationSuggestion[];
  healthStatus: HealthStatus;
}

export interface CpuUsage {
  totalPercent: number;
  userPercent: number;
  systemPercent: number;
  coreCount: number;
  loadAverage?: number[];
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
  contextCount: number;
  pageCount: number;
  totalAllocated: number;
  freeMemory: number;
}

export interface GpuUsage {
  memoryUsed: number;
  memoryTotal: number;
  utilizationPercent: number;
  temperatureCelsius?: number;
  enabled: boolean;
}

export interface DiskIoUsage {
  readBytes: number;
  writeBytes: number;
  readOperations: number;
  writeOperations: number;
}

export type HealthStatus = 'excellent' | 'good' | 'warning' | 'critical' | 'emergency';

// === Optimization Engine Types ===

export interface OptimizedBrowserOptions extends LaunchOptions {
  resourceProfile: ResourceProfile;
  performanceSettings: PerformanceSettings;
  securitySettings: SecuritySettings;
}

export interface ResourceProfile {
  cpuLimit: number;
  memoryLimit: number;
  networkTimeout: number;
  concurrencyLimit: number;
  priorityLevel: number;
}

export interface PerformanceSettings {
  enableGpuAcceleration: boolean;
  enableHardwareAcceleration: boolean;
  disableBackgroundThrottling: boolean;
  optimizeImageLoading: boolean;
  optimizeJavaScript: boolean;
  enableCompression: boolean;
}

export interface SecuritySettings {
  sandboxEnabled: boolean;
  webSecurityEnabled: boolean;
  allowUnsafeInlineScripts: boolean;
  blockMixedContent: boolean;
  strictSsl: boolean;
}

export interface OptimizationSuggestion {
  id: string;
  type: OptimizationType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  impact: OptimizationImpact;
  recommendation: string;
  autoApply: boolean;
  estimatedImprovement: PerformanceImprovement;
}

export type OptimizationType = 
  | 'memory-optimization' 
  | 'cpu-optimization' 
  | 'network-optimization' 
  | 'gpu-optimization' 
  | 'concurrency-optimization'
  | 'security-hardening';

export interface OptimizationImpact {
  memoryReduction?: number;
  cpuReduction?: number;
  speedImprovement?: number;
  stabilityImprovement?: number;
  resourceEfficiency?: number;
}

export interface PerformanceImprovement {
  responseTime: number;
  throughput: number;
  resourceUsage: number;
  stability: number;
  confidence: number;
}

// === Memory Management Types ===

export interface MemoryOptimization {
  strategy: MemoryStrategy;
  actions: MemoryAction[];
  estimatedSaving: number;
  riskAssessment: RiskAssessment;
  executionTime: number;
}

export type MemoryStrategy = 
  | 'aggressive-cleanup' 
  | 'gradual-optimization' 
  | 'selective-cleanup' 
  | 'emergency-recovery';

export interface MemoryAction {
  type: MemoryActionType;
  target: string;
  priority: number;
  estimatedSaving: number;
  riskLevel: RiskLevel;
  description: string;
}

export type MemoryActionType = 
  | 'close-idle-context' 
  | 'garbage-collection' 
  | 'clear-cache' 
  | 'optimize-images' 
  | 'compress-resources'
  | 'release-handles';

export interface RiskAssessment {
  overallRisk: RiskLevel;
  factors: RiskFactor[];
  mitigations: string[];
  rollbackPlan?: string;
}

export interface RiskFactor {
  factor: string;
  severity: RiskLevel;
  probability: number;
  impact: string;
}

// === Lifecycle Management ===

export interface LifecycleResult {
  contextId: string;
  status: LifecycleStatus;
  resourceUsage: ResourceSnapshot;
  leakRisk: RiskLevel;
  actions: LifecycleAction[];
  recommendations: string[];
}

export type LifecycleStatus = 'created' | 'active' | 'idle' | 'cleanup' | 'disposed' | 'error';

export interface ResourceSnapshot {
  timestamp: number;
  memory: MemorySnapshot;
  handles: number;
  eventListeners: number;
  activeRequests: number;
  openConnections: number;
}

export interface MemorySnapshot {
  used: number;
  allocated: number;
  peak: number;
  leaks: MemoryLeak[];
}

export interface MemoryLeak {
  type: string;
  location: string;
  size: number;
  age: number;
  severity: RiskLevel;
}

export interface LifecycleAction {
  type: LifecycleActionType;
  description: string;
  executed: boolean;
  timestamp: number;
  result?: ActionResult;
}

export type LifecycleActionType = 
  | 'create-context' 
  | 'optimize-context' 
  | 'monitor-usage' 
  | 'cleanup-resources' 
  | 'force-cleanup' 
  | 'emergency-stop';

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  metrics?: Record<string, number>;
}

// === Memory Leak Detection ===

export interface LeakDetectionResult {
  detected: boolean;
  leaks: MemoryLeak[];
  totalLeakSize: number;
  severity: RiskLevel;
  recommendations: LeakRecommendation[];
  autoFixAvailable: boolean;
}

export interface LeakRecommendation {
  type: 'immediate' | 'scheduled' | 'preventive';
  action: string;
  priority: number;
  estimatedFix: number;
}

export interface CleanupResult {
  resourcesReleased: number;
  memoryFreed: number;
  handlesClosed: number;
  listenersRemoved: number;
  errors: CleanupError[];
}

export interface CleanupError {
  resource: string;
  error: string;
  severity: 'warning' | 'error';
  recoverable: boolean;
}

export interface ReleaseResult {
  totalReleased: number;
  categories: ReleaseCategory[];
  timeElapsed: number;
  efficiency: number;
}

export interface ReleaseCategory {
  type: string;
  count: number;
  size: number;
  percentage: number;
}

export interface GcResult {
  executed: boolean;
  beforeMemory: number;
  afterMemory: number;
  freedMemory: number;
  timeElapsed: number;
  effectiveness: number;
}

// === Performance Tuning ===

export interface ParallelOptimization {
  optimalConcurrency: number;
  resourceAllocation: ResourceAllocation;
  loadBalancing: LoadBalancingStrategy;
  expectedImprovement: PerformanceImprovement;
  riskAssessment: RiskAssessment;
  configuration: ConcurrencyConfig;
}

export interface ResourceAllocation {
  cpuPerTask: number;
  memoryPerTask: number;
  networkBandwidth: number;
  priority: TaskPriority[];
}

export interface TaskPriority {
  taskType: string;
  priority: number;
  weight: number;
  maxConcurrency: number;
}

export type LoadBalancingStrategy = 'round-robin' | 'least-connections' | 'weighted' | 'adaptive';

export interface ConcurrencyConfig {
  maxConcurrent: number;
  queueSize: number;
  timeoutMs: number;
  retryCount: number;
  backoffStrategy: BackoffStrategy;
}

export type BackoffStrategy = 'linear' | 'exponential' | 'fixed' | 'adaptive';

export interface ResponseOptimization {
  strategies: ResponseStrategy[];
  expectedImprovement: number;
  implementation: OptimizationPlan;
  monitoring: MonitoringPlan;
}

export interface ResponseStrategy {
  name: string;
  description: string;
  impact: number;
  effort: number;
  priority: number;
}

export interface OptimizationPlan {
  steps: OptimizationStep[];
  timeline: string;
  dependencies: string[];
  rollbackPlan: string;
}

export interface OptimizationStep {
  name: string;
  description: string;
  order: number;
  estimated_duration: string;
  required_resources: string[];
}

export interface MonitoringPlan {
  metrics: string[];
  thresholds: Record<string, number>;
  alerting: AlertConfig[];
}

export interface AlertConfig {
  condition: string;
  severity: 'info' | 'warning' | 'critical';
  action: string;
}

// === Throughput Optimization ===

export interface ThroughputOptimization {
  currentThroughput: number;
  optimizedThroughput: number;
  improvement: number;
  bottlenecks: Bottleneck[];
  optimizations: ThroughputStrategy[];
}

export interface Bottleneck {
  component: string;
  severity: number;
  impact: number;
  solutions: string[];
}

export interface ThroughputStrategy {
  name: string;
  expectedGain: number;
  implementation: string;
  resources: string[];
}

export interface SystemLoad {
  cpu: number;
  memory: number;
  network: number;
  disk: number;
  concurrent_operations: number;
}

export interface PerformanceProfile {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  resourceUsage: ResourceUsageReport;
  bottlenecks: string[];
  optimization_score: number;
}

// === Pool Management ===

export interface PoolConfig {
  minSize: number;
  maxSize: number;
  idleTimeout: number;
  maxIdleTime: number;
  validationInterval: number;
  warmupSize: number;
  strategy: PoolStrategy;
}

export type PoolStrategy = 'fifo' | 'lifo' | 'least-used' | 'round-robin' | 'adaptive';

export interface PoolStatus {
  totalSize: number;
  activeSize: number;
  idleSize: number;
  pendingRequests: number;
  efficiency: number;
  healthScore: number;
  recommendations: PoolRecommendation[];
}

export interface PoolRecommendation {
  type: 'resize' | 'cleanup' | 'optimize' | 'alert';
  message: string;
  priority: number;
  autoApply: boolean;
}

export interface DemandMetrics {
  requestRate: number;
  averageWaitTime: number;
  peakConcurrency: number;
  utilizationRate: number;
  trendDirection: 'increasing' | 'stable' | 'decreasing';
}

export interface AdjustmentResult {
  action: 'increase' | 'decrease' | 'maintain';
  newSize: number;
  reasoning: string;
  expectedImpact: string;
  confidence: number;
}

export interface ReuseStrategy {
  contextReuse: boolean;
  sessionAffinity: boolean;
  cacheStrategy: string;
  optimization: ContextOptimization[];
}

export interface ContextOptimization {
  type: string;
  description: string;
  benefit: string;
  cost: string;
}

export interface HealthCheckResult {
  overallHealth: HealthStatus;
  components: ComponentHealth[];
  issues: HealthIssue[];
  recommendations: string[];
  lastChecked: number;
}

export interface ComponentHealth {
  component: string;
  status: HealthStatus;
  metrics: Record<string, number>;
  uptime: number;
}

export interface HealthIssue {
  component: string;
  severity: RiskLevel;
  description: string;
  impact: string;
  resolution: string;
}

export interface LoadDistribution {
  distribution: LoadBalance[];
  efficiency: number;
  balancing: string;
  estimated_completion: number;
}

export interface LoadBalance {
  node: string;
  allocation: number;
  capacity: number;
  utilization: number;
}

// === Operation & Context Types ===

export interface BrowserOperation {
  id: string;
  type: OperationType;
  priority: number;
  resources: OperationResources;
  timeout: number;
  retryPolicy: RetryPolicy;
}

export type OperationType = 
  | 'page-navigation' 
  | 'data-extraction' 
  | 'form-submission' 
  | 'screenshot' 
  | 'pdf-generation'
  | 'file-download'
  | 'api-interaction';

export interface OperationResources {
  cpu: number;
  memory: number;
  network: number;
  estimatedDuration: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface Operation {
  id: string;
  type: string;
  payload: any;
  priority: number;
  timeout: number;
  context?: string;
}

// === Network Optimization ===

export interface NetworkOptimization {
  requestOptimization: RequestOptimization;
  caching: CacheStrategy;
  compression: CompressionSettings;
  connectionPool: ConnectionPoolConfig;
}

export interface RequestOptimization {
  batchRequests: boolean;
  requestDeduplication: boolean;
  priorityQueuing: boolean;
  timeout: number;
}

export interface CacheStrategy {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  strategy: 'lru' | 'lfu' | 'ttl' | 'adaptive';
}

export interface CompressionSettings {
  enabled: boolean;
  level: number;
  algorithms: string[];
  threshold: number;
}

export interface ConnectionPoolConfig {
  maxConnections: number;
  keepAlive: boolean;
  timeout: number;
  retryCount: number;
}

// === Acceleration Settings ===

export interface AccelerationSettings {
  gpu: GpuAcceleration;
  hardware: HardwareAcceleration;
  software: SoftwareAcceleration;
}

export interface GpuAcceleration {
  enabled: boolean;
  preferredDevice?: string;
  fallbackToSoftware: boolean;
  memoryLimit?: number;
}

export interface HardwareAcceleration {
  enabled: boolean;
  features: string[];
  compatibility: CompatibilityCheck;
}

export interface SoftwareAcceleration {
  enabled: boolean;
  optimizations: string[];
  profiles: PerformanceProfile[];
}

export interface CompatibilityCheck {
  supported: boolean;
  features: string[];
  limitations: string[];
  recommendations: string[];
}

// === Headless Configuration ===

export interface HeadlessConfig {
  mode: 'headless' | 'headful' | 'hybrid';
  rendering: RenderingConfig;
  optimization: HeadlessOptimization;
  monitoring: HeadlessMonitoring;
}

export interface RenderingConfig {
  enableImages: boolean;
  enableCSS: boolean;
  enableJavaScript: boolean;
  enableFonts: boolean;
  quality: 'low' | 'medium' | 'high';
}

export interface HeadlessOptimization {
  disableAnimations: boolean;
  reduceMotion: boolean;
  optimizeImages: boolean;
  cacheResources: boolean;
}

export interface HeadlessMonitoring {
  trackPerformance: boolean;
  logErrors: boolean;
  captureMetrics: boolean;
  alertOnIssues: boolean;
}

// === Memory Optimization Result ===

export interface MemoryOptimizationResult {
  detectionResult: LeakDetectionResult;
  repairResults: MemoryRepairResult | null;
  systemHealth: HealthStatus;
  nextCheckTime: number;
}

export interface MemoryRepairResult {
  leaksFixed: number;
  memoryRecovered: number;
  optimization: MemoryOptimization;
}