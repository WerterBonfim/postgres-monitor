export interface PostgresConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  sslEnabled: boolean;
  isDefault?: boolean;
  createdAt: string;
}

export interface QueryPlanNode {
  nodeType: string; // "Seq Scan", "Index Scan", etc.
  relationName?: string;
  alias?: string;
  cost: { startup: number; total: number };
  actualTime?: { first: number; total: number };
  rows: { estimated: number; actual?: number };
  width?: number;
  buffers?: { sharedHit: number; sharedRead: number };
  children: QueryPlanNode[];
}

export interface QueryPlanResult {
  plan: QueryPlanNode;
  planningTime: number;
  executionTime: number;
  rawJson: string;
  insights: QueryPlanInsights;
}

export interface QueryPlanInsights {
  problems: string[];
  recommendations: Recommendation[];
  estimatedImprovement?: number; // percentual
}

export interface Recommendation {
  type: 'index' | 'query_optimization' | 'configuration';
  description: string;
  sqlScript?: string;
  impact: 'low' | 'medium' | 'high';
}

export interface CreateConnectionRequest {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslEnabled?: boolean;
}

export interface MonitoringMetric {
  id: string;
  connectionId: string;
  collectedAt: string;
  pgStatStatementsAvailable: boolean;
  databaseStats?: Record<string, unknown>;
  slowQueries: SlowQuery[];
  tableStats: TableStats[];
  connectionStats?: ConnectionStats;
  lockStats?: LockStats;
  indexStats: IndexStats[];
  indexRecommendations: IndexRecommendation[];
  tableEfficiency: TableEfficiency[];
  databaseEfficiency?: DatabaseEfficiency;
  queryDetails: QueryDetail[];
  activeTransactions: TransactionDetail[];
  lockDetails: LockDetail[];
  blockingLocks: BlockingLock[];
  walStats?: WalStats;
  tablespaces: Tablespace[];
  memoryConfig?: MemoryConfig;
  systemInfo?: SystemInfo;
}

export interface SlowQuery {
  query: string;
  calls: number;
  totalTime: number;
  meanTime: number;
  maxTime: number;
}

export interface TableStats {
  schemaName: string;
  tableName: string;
  seqScan: number;
  seqTupRead: number;
  idxScan: number;
  idxTupFetch: number;
  tupleInsert: number;
  tupleUpdate: number;
  tupleDelete: number;
}

export interface ConnectionStats {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
}

export interface LockStats {
  lockCount: number;
  lockedRelations: number;
}

export interface IndexStats {
  schemaName: string;
  tableName: string;
  indexName: string;
  indexScans: number;
  indexTuplesRead: number;
  indexTuplesFetched: number;
  indexSize: number;
  tableSize: number;
  percentOfTable: number;
  status: 'unused' | 'low_usage' | 'normal' | 'high_usage';
}

export interface IndexRecommendation {
  tableName: string;
  schemaName: string;
  columnName?: string;
  reason: string;
  expectedImpact: 'low' | 'medium' | 'high';
  sqlScript: string;
  recommendationType: 'create_index' | 'remove_index' | 'analyze_table';
}

export interface TableEfficiency {
  schemaName: string;
  tableName: string;
  seqScanCount: number;
  indexScanCount: number;
  seqIndexRatio: number;
  cacheHitRatio: number;
  tableSize: number;
  needsAttention: boolean;
}

export interface DatabaseEfficiency {
  globalCacheHitRatio: number;
  commitRollbackRatio: number;
  tempFilesCount: number;
  tempBytes: number;
}

export interface QueryDetail {
  query: string;
  calls: number;
  totalTime: number;
  meanTime: number;
  minTime: number;
  maxTime: number;
  rows: number;
  sharedBlksHit: number;
  sharedBlksRead: number;
  tempBlksRead: number;
  tempBlksWritten: number;
  blkReadTime: number;
  blkWriteTime: number;
}

export interface TransactionDetail {
  pid: number;
  datname: string;
  usename: string;
  applicationName?: string;
  clientAddr?: string;
  backendStart: string;
  xactStart?: string;
  queryStart?: string;
  state: string;
  query?: string;
  waitEventType?: string;
  waitEvent?: string;
  runtime?: string;
}

export interface LockDetail {
  pid: number;
  lockType: string;
  relation?: string;
  mode: string;
  granted: boolean;
  waitStart?: string;
  query?: string;
}

export interface BlockingLock {
  blockedPid: number;
  blockedUser: string;
  blockedQuery?: string;
  blockingPid: number;
  blockingUser: string;
  blockingQuery?: string;
  relation?: string;
  blockedMode: string;
  blockingMode: string;
  blockedDuration?: string;
}

export interface WalStats {
  totalWalSize: number;
  checkpointTimed: number;
  checkpointReq: number;
  checkpointWriteTime: number;
  checkpointSyncTime: number;
  walLevel?: string;
  walCompression?: boolean;
  maxWalSize?: number;
  minWalSize?: number;
}

export interface Tablespace {
  name: string;
  location?: string;
  size: number;
}

export interface MemoryConfig {
  sharedBuffers: number;
  workMem: number;
  maintenanceWorkMem: number;
  effectiveCacheSize: number;
  tempBuffers: number;
  maxConnections: number;
  walBuffers: number;
  estimatedTotalMemory: number;
}

export interface SystemInfo {
  version: string;
  serverVersionNum: number;
  dataDirectory?: string;
  configFile?: string;
}

export interface HistoricalMetric {
  id: string;
  connectionId: string;
  periodStart: string;
  periodEnd: string;
  periodType: 'Hourly' | 'Daily';
  aggregatedData: Record<string, unknown>;
}

export type HistoricalPeriod = '24h' | '7d' | '30d';

export interface ExtensionStatus {
  pgStatStatementsAvailable: boolean;
  message: string;
}

export interface IndexDetails {
  schemaName: string;
  tableName: string;
  indexName: string;
  indexScans: number;
  indexTuplesRead: number;
  indexTuplesFetched: number;
  indexSize: number;
  tableSize: number;
  indexPercentOfTable: number;
  isUnique: boolean;
  isPrimary: boolean;
  isValid: boolean;
  indexDefinition: string;
  tableSeqScans: number;
  tableIndexScans: number;
  tableIndexUsageRatio: number;
  tableLiveTuples: number;
  tableDeadTuples: number;
  tableDeadTupleRatio: number;
  tableInserts: number;
  tableUpdates: number;
  tableDeletes: number;
  lastVacuum?: string;
  lastAutovacuum?: string;
  lastAnalyze?: string;
  lastAutoanalyze?: string;
  vacuumCount: number;
  autovacuumCount: number;
  analyzeCount: number;
  autoanalyzeCount: number;
  totalReorganizations: number;
}

export interface TableColumn {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  characterMaximumLength?: number;
  numericPrecision?: number;
  numericScale?: number;
}

export interface TableDetails {
  schemaName: string;
  tableName: string;
  tableSize: number;
  indexSize: number;
  totalSize: number;
  rowCount: number;
  liveTuples: number;
  deadTuples: number;
  deadTupleRatio: number;
  seqScans: number;
  seqTupRead: number;
  indexScans: number;
  indexTupFetch: number;
  indexUsageRatio: number;
  cacheHitRatio: number;
  inserts: number;
  updates: number;
  deletes: number;
  lastVacuum?: string;
  lastAutovacuum?: string;
  lastAnalyze?: string;
  lastAutoanalyze?: string;
  vacuumCount: number;
  autovacuumCount: number;
  analyzeCount: number;
  autoanalyzeCount: number;
  totalReorganizations: number;
  columns: TableColumn[];
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  impactDescription: string;
}

export interface QueryHistory {
  id: number;
  connectionId: string;
  executedAt: string;
  query: string;
  calls: number;
  totalTime: number;
  meanTime: number;
  minTime: number;
  maxTime: number;
  rows: number;
  sharedBlksHit: number;
  sharedBlksRead: number;
  tempBlksRead: number;
  tempBlksWritten: number;
  blkReadTime: number;
  blkWriteTime: number;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  impactDescription: string;
}

export interface IndexTypeInfo {
  type: string;
  name: string;
  description: string;
  useCases: string[];
  advantages: string[];
  disadvantages: string[];
}
