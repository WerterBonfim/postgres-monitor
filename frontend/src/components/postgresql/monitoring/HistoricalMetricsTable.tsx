import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { HistoricalMetric } from '../../../types/postgresql';
import styles from './HistoricalMetricsTable.module.scss';

interface HistoricalMetricsTableProps {
  metrics: HistoricalMetric[];
}

export function HistoricalMetricsTable({ metrics }: HistoricalMetricsTableProps) {
  if (metrics.length === 0) {
    return (
      <Card padded className={styles['historical-table__empty']}>
        Nenhum dado histórico disponível para o período selecionado.
      </Card>
    );
  }

  return (
    <Card className={styles['historical-table']}>
      <h3 className={styles['historical-table__title']}>Métricas Históricas Consolidadas</h3>
      <div className={styles['historical-table__scroll']}>
        <table className={styles['historical-table__table']}>
          <thead>
            <tr>
              <th>Período</th>
              <th>Tipo</th>
              <th>Conexões Médias</th>
              <th>Cache Hit Ratio</th>
              <th>Locks Médios</th>
              <th>Métricas</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const data = metric.aggregatedData;
              const avgActiveConnections = data.avgActiveConnections as number | undefined;
              const avgGlobalCacheHitRatio = data.avgGlobalCacheHitRatio as number | undefined;
              const avgLockCount = data.avgLockCount as number | undefined;
              const metricCount = data.metricCount as number | undefined;

              return (
                <tr key={metric.id}>
                  <td>
                    <div>
                      <div>{new Date(metric.periodStart).toLocaleString('pt-BR')}</div>
                      <div className={styles['historical-table__period-end']}>
                        até {new Date(metric.periodEnd).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge variant="outline">{metric.periodType}</Badge>
                  </td>
                  <td>
                    {avgActiveConnections !== undefined
                      ? avgActiveConnections.toFixed(1)
                      : '-'}
                  </td>
                  <td>
                    {avgGlobalCacheHitRatio !== undefined ? (
                      <Badge
                        variant={
                          avgGlobalCacheHitRatio > 95
                            ? 'default'
                            : avgGlobalCacheHitRatio > 80
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {avgGlobalCacheHitRatio.toFixed(1)}%
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {avgLockCount !== undefined ? avgLockCount.toFixed(1) : '-'}
                  </td>
                  <td>
                    {metricCount !== undefined ? (
                      <Badge variant="secondary">{metricCount} coletas</Badge>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
