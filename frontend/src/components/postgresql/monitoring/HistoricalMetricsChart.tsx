import { Card } from '../../ui/card';
import { cx } from '../../../lib/cx';
import type { HistoricalMetric } from '../../../types/postgresql';
import styles from './HistoricalMetricsChart.module.scss';

interface HistoricalMetricsChartProps {
  metrics: HistoricalMetric[];
}

export function HistoricalMetricsChart({ metrics }: HistoricalMetricsChartProps) {
  if (metrics.length === 0) {
    return (
      <Card padded className={styles['historical-chart__empty']}>
        Nenhum dado histórico disponível para visualização em gráfico.
      </Card>
    );
  }

  const chartData = metrics.map((m) => {
    const data = m.aggregatedData;
    return {
      period: new Date(m.periodStart).toLocaleString('pt-BR', {
        month: 'short',
        day: 'numeric',
        hour: m.periodType === 'Hourly' ? '2-digit' : undefined,
      }),
      cacheHitRatio: (data.avgGlobalCacheHitRatio as number | undefined) || 0,
      activeConnections: (data.avgActiveConnections as number | undefined) || 0,
    };
  });

  const maxCacheHit = Math.max(...chartData.map((d) => d.cacheHitRatio), 100);
  const maxConnections = Math.max(...chartData.map((d) => d.activeConnections), 1);

  return (
    <div className={styles['historical-chart']}>
      <Card className={styles['historical-chart__card']}>
        <h3 className={styles['historical-chart__title']}>Cache Hit Ratio ao Longo do Tempo</h3>
        <div className={styles['historical-chart__rows']}>
          {chartData.map((data, idx) => (
            <div key={idx} className={styles['historical-chart__row']}>
              <div className={styles['historical-chart__label']}>{data.period}</div>
              <div className={styles['historical-chart__bar-track']}>
                <div
                  className={cx(styles['historical-chart__bar'], styles['historical-chart__bar--primary'])}
                  style={{ width: `${(data.cacheHitRatio / maxCacheHit) * 100}%` }}
                >
                  <span className={styles['historical-chart__bar-value']}>
                    {data.cacheHitRatio.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className={styles['historical-chart__card']}>
        <h3 className={styles['historical-chart__title']}>Conexões Ativas Médias</h3>
        <div className={styles['historical-chart__rows']}>
          {chartData.map((data, idx) => (
            <div key={idx} className={styles['historical-chart__row']}>
              <div className={styles['historical-chart__label']}>{data.period}</div>
              <div className={styles['historical-chart__bar-track']}>
                <div
                  className={cx(styles['historical-chart__bar'], styles['historical-chart__bar--blue'])}
                  style={{ width: `${(data.activeConnections / maxConnections) * 100}%` }}
                >
                  <span className={styles['historical-chart__bar-value']}>
                    {data.activeConnections.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
