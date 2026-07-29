import type { MonitoringMetric } from '../../../types/postgresql';
import { MetricCard } from './MetricCard';
import { EfficiencyGauge } from './EfficiencyGauge';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import {
  Database,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Activity,
  Zap,
} from 'lucide-react';
import { formatBytes } from '../../../lib/utils';
import styles from './MonitoringDashboard.module.scss';

interface MonitoringDashboardProps {
  metrics: MonitoringMetric[];
}

export function MonitoringDashboard({ metrics }: MonitoringDashboardProps) {
  if (metrics.length === 0) {
    return (
      <Card padded className={styles['monitoring-dashboard__empty']}>
        Nenhuma métrica coletada. Clique em "Coletar Métricas" para começar.
      </Card>
    );
  }

  const latestMetric = metrics[0];

  const totalIndexes = latestMetric.indexStats?.length || 0;
  const unusedIndexes = latestMetric.indexStats?.filter((i) => i.status === 'unused').length || 0;
  const totalIndexSize = latestMetric.indexStats?.reduce((sum, i) => sum + i.indexSize, 0) || 0;

  const recommendations = latestMetric.indexRecommendations || [];
  const highImpactRecommendations = recommendations.filter((r) => r.expectedImpact === 'high').length;

  const tablesNeedingAttention = latestMetric.tableEfficiency?.filter((t) => t.needsAttention).length || 0;
  const avgCacheHitRatio =
    latestMetric.tableEfficiency?.reduce((sum, t) => sum + t.cacheHitRatio, 0) /
      (latestMetric.tableEfficiency?.length || 1) || 0;

  const globalCacheHitRatio = latestMetric.databaseEfficiency?.globalCacheHitRatio || 0;

  const slowQueries = latestMetric.slowQueries?.length || 0;

  return (
    <div className={styles['monitoring-dashboard']}>
      <h2 className={styles['monitoring-dashboard__title']}>Dashboard de Monitoramento</h2>

      <div className={styles['monitoring-dashboard__grid']}>
        <EfficiencyGauge
          value={globalCacheHitRatio}
          label="Cache Hit Ratio Global"
          thresholds={{ good: 95, warning: 90 }}
          infoType="cache-hit"
        />
        <MetricCard
          title="Conexões Ativas"
          value={latestMetric.connectionStats?.activeConnections || 0}
          description={`Total: ${latestMetric.connectionStats?.totalConnections || 0}`}
          icon={Activity}
          variant={latestMetric.connectionStats && latestMetric.connectionStats.activeConnections > 50 ? 'warning' : 'default'}
          infoType="active-connections"
        />
        <MetricCard
          title="Queries Lentas"
          value={slowQueries}
          description="Queries com tempo médio > 100ms"
          icon={AlertTriangle}
          variant={slowQueries > 5 ? 'destructive' : slowQueries > 0 ? 'warning' : 'success'}
          infoType="slow-queries"
        />
        <MetricCard
          title="Índices Não Utilizados"
          value={unusedIndexes}
          description={`De ${totalIndexes} índices`}
          icon={Database}
          variant={unusedIndexes > 0 ? 'warning' : 'success'}
          infoType="unused-indexes"
        />
      </div>

      <div className={styles['monitoring-dashboard__grid']}>
        <MetricCard
          title="Total de Índices"
          value={totalIndexes}
          description={`Tamanho total: ${formatBytes(totalIndexSize)}`}
          icon={Database}
          infoType="total-indexes"
        />
        <MetricCard
          title="Recomendações"
          value={recommendations.length}
          description={`${highImpactRecommendations} de alto impacto`}
          icon={Lightbulb}
          variant={highImpactRecommendations > 0 ? 'warning' : 'default'}
          infoType="recommendations"
        />
        <MetricCard
          title="Tabelas com Problemas"
          value={tablesNeedingAttention}
          description="Requerem atenção"
          icon={TrendingUp}
          variant={tablesNeedingAttention > 0 ? 'warning' : 'success'}
          infoType="tables-problems"
        />
        <MetricCard
          title="Cache Hit Ratio Médio"
          value={`${avgCacheHitRatio.toFixed(1)}%`}
          description="Média entre tabelas"
          icon={Zap}
          variant={avgCacheHitRatio >= 95 ? 'success' : avgCacheHitRatio >= 90 ? 'warning' : 'destructive'}
          infoType="avg-cache-hit"
        />
      </div>

      {latestMetric.indexStats && latestMetric.indexStats.length > 0 && (
        <Card className={styles['monitoring-dashboard__top-indexes']}>
          <h3 className={styles['monitoring-dashboard__section-title']}>Top 5 Índices Mais Utilizados</h3>
          <div className={styles['monitoring-dashboard__index-list']}>
            {latestMetric.indexStats
              .filter((i) => i.status !== 'unused')
              .sort((a, b) => b.indexScans - a.indexScans)
              .slice(0, 5)
              .map((index, idx) => (
                <div key={idx} className={styles['monitoring-dashboard__index-item']}>
                  <div>
                    <div className={styles['monitoring-dashboard__index-name']}>
                      {index.schemaName}.{index.tableName}
                    </div>
                    <div className={styles['monitoring-dashboard__index-detail']}>{index.indexName}</div>
                  </div>
                  <div className={styles['monitoring-dashboard__index-stats']}>
                    <Badge variant="default">{index.indexScans.toLocaleString()} scans</Badge>
                    <div className={styles['monitoring-dashboard__index-size']}>{formatBytes(index.indexSize)}</div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
