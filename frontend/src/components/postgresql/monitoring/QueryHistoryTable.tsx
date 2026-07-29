import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { AlertTriangle, Info, Clock, Database, Zap } from 'lucide-react';
import type { QueryHistory } from '../../../types/postgresql';
import styles from './QueryHistoryTable.module.scss';

interface QueryHistoryTableProps {
  queryHistory: QueryHistory[];
}

export function QueryHistoryTable({ queryHistory }: QueryHistoryTableProps) {
  if (queryHistory.length === 0) {
    return (
      <Card padded className={styles['query-history__empty']}>
        Nenhuma query no histórico. As queries serão salvas automaticamente quando coletadas.
      </Card>
    );
  }

  const getImpactBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getImpactIcon = (level: string) => {
    switch (level) {
      case 'critical':
      case 'high':
        return AlertTriangle;
      case 'medium':
        return Info;
      default:
        return Info;
    }
  };

  return (
    <div className={styles['query-history']}>
      <div className={styles['query-history__header']}>
        <h3 className={styles['query-history__title']}>Histórico de Queries</h3>
        <Badge variant="secondary">{queryHistory.length} queries</Badge>
      </div>

      <div className={styles['query-history__list']}>
        {queryHistory.map((query) => {
          const ImpactIcon = getImpactIcon(query.impactLevel);
          const totalBlks = query.sharedBlksHit + query.sharedBlksRead;
          const cacheHitRatio = totalBlks > 0
            ? ((query.sharedBlksHit / totalBlks) * 100).toFixed(1)
            : '100.0';

          return (
            <Card key={query.id} className={styles['query-history__card']}>
              <div className={styles['query-history__card-header']}>
                <ImpactIcon size={16} />
                <Badge variant={getImpactBadgeVariant(query.impactLevel)}>
                  {query.impactLevel.toUpperCase()}
                </Badge>
                <span className={styles['query-history__date']}>
                  {new Date(query.executedAt).toLocaleString('pt-BR')}
                </span>
              </div>

              <div>
                <p className={styles['query-history__impact-label']}>Impacto:</p>
                <p className={styles['query-history__impact-text']}>{query.impactDescription}</p>
              </div>

              <pre className={styles['query-history__query']}>{query.query}</pre>

              <div className={styles['query-history__stats']}>
                <div className={styles['query-history__stat']}>
                  <Clock size={12} />
                  <div>
                    <div className={styles['query-history__stat-value']}>{query.meanTime.toFixed(2)}ms</div>
                    <div className={styles['query-history__stat-label']}>Tempo médio</div>
                  </div>
                </div>
                <div className={styles['query-history__stat']}>
                  <Database size={12} />
                  <div>
                    <div className={styles['query-history__stat-value']}>{query.calls.toLocaleString()}</div>
                    <div className={styles['query-history__stat-label']}>Chamadas</div>
                  </div>
                </div>
                <div className={styles['query-history__stat']}>
                  <Zap size={12} />
                  <div>
                    <div className={styles['query-history__stat-value']}>{cacheHitRatio}%</div>
                    <div className={styles['query-history__stat-label']}>Cache Hit</div>
                  </div>
                </div>
                <div className={styles['query-history__stat']}>
                  <Database size={12} />
                  <div>
                    <div className={styles['query-history__stat-value']}>{query.rows.toLocaleString()}</div>
                    <div className={styles['query-history__stat-label']}>Linhas</div>
                  </div>
                </div>
              </div>

              {(query.tempBlksRead > 0 || query.tempBlksWritten > 0) && (
                <div className={styles['query-history__temp-warning']}>
                  <p>
                    ⚠️ Esta query utiliza arquivos temporários (temp blocks: {query.tempBlksRead} lidos, {query.tempBlksWritten} escritos)
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
