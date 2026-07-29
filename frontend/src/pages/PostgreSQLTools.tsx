import { useQuery } from '@tanstack/react-query';
import { postgresqlApi } from '../services/postgresqlApi';
import { ConnectionsManager } from '../components/postgresql/ConnectionsManager';
import { QueryPlanExecutor } from '../components/postgresql/QueryPlanExecutor';
import { MonitoringMetrics } from '../components/postgresql/MonitoringMetrics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cx } from '../lib/cx';
import styles from './PostgreSQLTools.module.scss';

export function PostgreSQLTools() {
  const { data: connections = [] } = useQuery({
    queryKey: ['postgresql-connections'],
    queryFn: () => postgresqlApi.getConnections(),
  });

  return (
    <div className={styles['postgresql-tools']}>
      <main className={cx('main-content', styles['postgresql-tools__container'], styles['postgresql-tools__main'])}>
        <Tabs defaultValue="connections">
          <TabsList className={styles['postgresql-tools__tabs-list']}>
            <TabsTrigger value="connections">Conexões</TabsTrigger>
            <TabsTrigger value="query-plan">Query Plan</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className={styles['postgresql-tools__tab-content']}>
            <ConnectionsManager />
          </TabsContent>

          <TabsContent value="query-plan" className={styles['postgresql-tools__tab-content']}>
            <QueryPlanExecutor connections={connections} />
          </TabsContent>

          <TabsContent value="monitoring" className={styles['postgresql-tools__tab-content']}>
            <MonitoringMetrics connections={connections} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
