import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import {
  Table,
  Database,
  Repeat,
  GitBranch,
  Filter,
  ArrowUpDown,
  Zap,
  Search,
  Layers,
  Network,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import type { QueryPlanNodeData } from '../../../lib/queryPlanTransformer';
import { cx } from '../../../lib/cx';
import styles from './QueryPlanNode.module.scss';

const nodeTypeIcons: Record<string, LucideIcon> = {
  'Seq Scan': Table,
  'Index Scan': Database,
  'Index Only Scan': Zap,
  'Bitmap Index Scan': Search,
  'Bitmap Heap Scan': Layers,
  'Nested Loop': Repeat,
  'Hash Join': GitBranch,
  'Merge Join': Network,
  Filter: Filter,
  Sort: ArrowUpDown,
  Limit: FileText,
  Aggregate: Layers,
  Group: Layers,
  Hash: GitBranch,
  Materialize: Database,
  'CTE Scan': Search,
  'Subquery Scan': Search,
  'Function Scan': Zap,
  'Values Scan': Table,
};

function getNodeIcon(nodeType: string): LucideIcon {
  return nodeTypeIcons[nodeType] || Database;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }
  return num.toFixed(0);
}

function formatTime(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms.toFixed(2)}ms`;
}

export const QueryPlanNode = memo(function QueryPlanNode({
  data,
  selected,
}: NodeProps<QueryPlanNodeData>) {
  const Icon = getNodeIcon(data.nodeType);

  return (
    <div className={cx(styles['query-plan-node'], selected && styles['query-plan-node--selected'])}>
      <Handle type="target" position={Position.Top} className={styles['query-plan-node__handle']} />

      <div className={styles['query-plan-node__body']}>
        <div className={styles['query-plan-node__header']}>
          <div className={styles['query-plan-node__icon-wrap']}>
            <Icon size={20} />
          </div>
          <div>
            <Badge variant="outline" className={styles['query-plan-node__type-badge']}>
              {data.nodeType}
            </Badge>
          </div>
        </div>

        {data.relationName && (
          <div className={styles['query-plan-node__relation']}>
            <span className={styles['query-plan-node__muted']}>Tabela: </span>
            <span className={styles['query-plan-node__value']}>{data.relationName}</span>
            {data.alias && data.alias !== data.relationName && (
              <span className={styles['query-plan-node__muted']}> ({data.alias})</span>
            )}
          </div>
        )}

        <div>
          <div className={styles['query-plan-node__progress-header']}>
            <span>Peso no custo total</span>
            <span>{data.costPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={data.costPercentage} className={styles['query-plan-node__progress']} />
        </div>

        <div className={styles['query-plan-node__grid']}>
          <div>
            <span className={styles['query-plan-node__muted']}>Custo: </span>
            <span className={styles['query-plan-node__value']}>
              {data.cost.startup.toFixed(2)}..{data.cost.total.toFixed(2)}
            </span>
          </div>
          {data.actualTime && (
            <div>
              <span className={styles['query-plan-node__muted']}>Tempo: </span>
              <span className={styles['query-plan-node__value']}>
                {formatTime(data.actualTime.first)}..{formatTime(data.actualTime.total)}
              </span>
            </div>
          )}
        </div>

        <div className={styles['query-plan-node__relation']}>
          <span className={styles['query-plan-node__muted']}>Linhas: </span>
          <span className={styles['query-plan-node__value']}>
            {formatNumber(data.rows.estimated)}
            {data.rows.actual !== undefined && (
              <span className={styles['query-plan-node__muted']}>
                {' '}
                (real: {formatNumber(data.rows.actual)})
              </span>
            )}
          </span>
        </div>

        {data.buffers && (
          <div className={styles['query-plan-node__buffers']}>
            Cache: {formatNumber(data.buffers.sharedHit)} hit,{' '}
            {formatNumber(data.buffers.sharedRead)} read
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className={styles['query-plan-node__handle']} />
    </div>
  );
});
