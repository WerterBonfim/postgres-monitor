import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { postgresqlApi } from '../../services/postgresqlApi';
import type { PostgresConnection } from '../../types/postgresql';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { RefreshCw, Database, Lightbulb, Zap, Search, Table as TableIcon, Activity, Lock, HardDrive, History, AlertTriangle, Info, FileText } from 'lucide-react';
import { toast } from '../ui/toaster';
import { MonitoringDashboard } from './monitoring/MonitoringDashboard';
import { IndexStatsTable } from './monitoring/IndexStatsTable';
import { RecommendationCard } from './monitoring/RecommendationCard';
import { EfficiencyGauge } from './monitoring/EfficiencyGauge';
import { QueryDetailsTable } from './monitoring/QueryDetailsTable';
import { TransactionsTable } from './monitoring/TransactionsTable';
import { LocksVisualization } from './monitoring/LocksVisualization';
import { WalStatsCard } from './monitoring/WalStatsCard';
import { TablespacesList } from './monitoring/TablespacesList';
import { MemoryConfigCard } from './monitoring/MemoryConfigCard';
import { HistoricalMetricsChart } from './monitoring/HistoricalMetricsChart';
import { HistoricalMetricsTable } from './monitoring/HistoricalMetricsTable';
import { PgStatStatementsInfo } from './PgStatStatementsInfo';
import { EfficiencyInfoButton } from './monitoring/EfficiencyInfoButton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { QueryHistoryTable } from './monitoring/QueryHistoryTable';
import { PostgresLogsViewer } from './monitoring/PostgresLogsViewer';
import { formatBytes } from '../../lib/utils';
import styles from './MonitoringMetrics.module.scss';

interface MonitoringMetricsProps {
  connections: PostgresConnection[];
}

export function MonitoringMetrics({ connections }: MonitoringMetricsProps) {
  const defaultConnection = connections.find(c => c.isDefault) || connections[0];
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    defaultConnection?.id || ''
  );
  const [isCollecting, setIsCollecting] = useState(false);
  const [showPgStatInfo, setShowPgStatInfo] = useState(false);
  const [historicalPeriod, setHistoricalPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [pollingInterval, setPollingInterval] = useState<number>(3000);
  const [pollingEnabled, setPollingEnabled] = useState<boolean>(true);
  const queryClient = useQueryClient();

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['postgresql-metrics', selectedConnectionId],
    queryFn: () => postgresqlApi.getMonitoringMetrics(selectedConnectionId),
    enabled: !!selectedConnectionId,
    refetchInterval: pollingEnabled && selectedConnectionId ? pollingInterval : false,
    staleTime: 1000,
  });

  const { data: queryHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['postgresql-query-history', selectedConnectionId],
    queryFn: () => postgresqlApi.getQueryHistory(selectedConnectionId),
    enabled: !!selectedConnectionId,
    refetchInterval: pollingEnabled && selectedConnectionId ? pollingInterval : false,
    staleTime: 1000,
  });

  const { data: logs = [], isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['postgresql-logs', selectedConnectionId],
    queryFn: () => postgresqlApi.getLogs(selectedConnectionId, 100),
    enabled: !!selectedConnectionId,
    refetchInterval: pollingEnabled && selectedConnectionId ? pollingInterval : false,
    staleTime: 2000,
  });

  const { data: historicalMetrics = [] } = useQuery({
    queryKey: ['postgresql-historical', selectedConnectionId, historicalPeriod],
    queryFn: () => postgresqlApi.getHistoricalMetrics(selectedConnectionId, historicalPeriod),
    enabled: !!selectedConnectionId,
    refetchInterval: pollingEnabled && selectedConnectionId ? pollingInterval : false,
    staleTime: 1000,
  });

  const handleCollectMetrics = async () => {
    if (!selectedConnectionId) {
      toast({
        title: 'Erro',
        description: 'Selecione uma conexão antes de coletar métricas',
        variant: 'destructive',
      });
      return;
    }

    setIsCollecting(true);
    try {
      await postgresqlApi.collectMonitoringMetrics(selectedConnectionId);
      toast({
        title: 'Sucesso',
        description: 'Métricas coletadas com sucesso!',
        variant: 'success',
      });
      await queryClient.invalidateQueries({ queryKey: ['postgresql-metrics', selectedConnectionId] });
    } catch (error) {
      toast({
        title: 'Erro ao coletar métricas',
        description: error instanceof Error ? error.message : 'Não foi possível coletar as métricas',
        variant: 'destructive',
      });
    } finally {
      setIsCollecting(false);
    }
  };

  if (connections.length === 0) {
    return (
      <Card padded className={styles['monitoring-metrics__empty']}>
        Configure pelo menos uma conexão para visualizar métricas.
      </Card>
    );
  }

  const latestMetric = metrics.length > 0 ? metrics[0] : null;

  return (
    <div className={styles['monitoring-metrics']}>
      <div className={styles['monitoring-metrics__header']}>
        <h2 className={styles['monitoring-metrics__title']}>Métricas de Monitoramento</h2>
      </div>

      <Card className={styles['monitoring-metrics__controls-card']}>
        <div className={styles['monitoring-metrics__controls']}>
          <div className={styles['monitoring-metrics__connection-row']}>
            <div className={styles['monitoring-metrics__connection-field']}>
              <label className={styles['monitoring-metrics__label']}>Conexão</label>
              <select
                value={selectedConnectionId}
                onChange={(e) => setSelectedConnectionId(e.target.value)}
                className={styles['monitoring-metrics__select']}
              >
                <option value="">Selecione uma conexão</option>
                {connections.map((conn) => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name} {conn.isDefault && '(Padrão)'} ({conn.host}:{conn.port}/{conn.database})
                  </option>
                ))}
              </select>
            </div>
            {selectedConnectionId && (
              <Button
                onClick={handleCollectMetrics}
                disabled={isCollecting}
                className={styles['monitoring-metrics__collect-btn']}
              >
                <RefreshCw size={16} className={isCollecting ? styles['monitoring-metrics__spin'] : undefined} />
                {isCollecting ? 'Coletando...' : 'Coletar Métricas'}
              </Button>
            )}
          </div>

          {selectedConnectionId && (
            <div className={styles['monitoring-metrics__polling']}>
              <div className={styles['monitoring-metrics__polling-checkbox']}>
                <Checkbox
                  id="pollingEnabled"
                  checked={pollingEnabled}
                  onCheckedChange={(checked) => setPollingEnabled(checked === true)}
                />
                <label htmlFor="pollingEnabled">Atualização Automática</label>
              </div>
              <div className={styles['monitoring-metrics__polling-interval']}>
                <label htmlFor="pollingInterval">Intervalo:</label>
                <input
                  type="number"
                  id="pollingInterval"
                  min="1000"
                  step="1000"
                  value={pollingInterval}
                  onChange={(e) => setPollingInterval(Math.max(1000, parseInt(e.target.value) || 3000))}
                  className={styles['monitoring-metrics__interval-input']}
                  disabled={!pollingEnabled}
                />
                <span>ms</span>
              </div>
              {pollingEnabled && (
                <div className={styles['monitoring-metrics__polling-status']}>
                  <div className={styles['monitoring-metrics__polling-dot']} />
                  <span>Atualizando a cada {(pollingInterval / 1000).toFixed(1)}s</span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {isLoading && selectedConnectionId && (
        <div className={styles['monitoring-metrics__loading']}>
          <RefreshCw size={32} className={styles['monitoring-metrics__spin']} />
          <p>Carregando métricas...</p>
        </div>
      )}

      {!selectedConnectionId && (
        <Card padded className={styles['monitoring-metrics__empty']}>
          Selecione uma conexão para visualizar as métricas de monitoramento.
        </Card>
      )}

      {showPgStatInfo && (
        <Card className={styles['monitoring-metrics__pg-stat-card']}>
          <div className={styles['monitoring-metrics__pg-stat-header']}>
            <h3 className={styles['monitoring-metrics__pg-stat-title']}>Configuração do pg_stat_statements</h3>
            <Button variant="ghost" onClick={() => setShowPgStatInfo(false)}>Fechar</Button>
          </div>
          <PgStatStatementsInfo />
        </Card>
      )}

      {latestMetric && !isLoading && (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview" className={styles['monitoring-metrics__tab-trigger']}>
              <Database size={16} />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="indexes" className={styles['monitoring-metrics__tab-trigger']}>
              <Database size={16} />
              Índices
            </TabsTrigger>
            <TabsTrigger value="recommendations" className={styles['monitoring-metrics__tab-trigger']}>
              <Lightbulb size={16} />
              Recomendações
              {latestMetric.indexRecommendations?.length > 0 && (
                <Badge variant="destructive">{latestMetric.indexRecommendations.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="efficiency" className={styles['monitoring-metrics__tab-trigger']}>
              <Zap size={16} />
              Eficiência
            </TabsTrigger>
            <TabsTrigger value="queries" className={styles['monitoring-metrics__tab-trigger']}>
              <Search size={16} />
              Queries
            </TabsTrigger>
            <TabsTrigger value="tables" className={styles['monitoring-metrics__tab-trigger']}>
              <TableIcon size={16} />
              Tabelas
            </TabsTrigger>
            <TabsTrigger value="query-details" className={styles['monitoring-metrics__tab-trigger']}>
              <Search size={16} />
              Queries Detalhadas
              {!latestMetric.pgStatStatementsAvailable && (
                <Badge variant="destructive">
                  <AlertTriangle size={12} />
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="transactions" className={styles['monitoring-metrics__tab-trigger']}>
              <Activity size={16} />
              Transações
            </TabsTrigger>
            <TabsTrigger value="locks" className={styles['monitoring-metrics__tab-trigger']}>
              <Lock size={16} />
              Locks
            </TabsTrigger>
            <TabsTrigger value="wal-system" className={styles['monitoring-metrics__tab-trigger']}>
              <HardDrive size={16} />
              WAL & Sistema
            </TabsTrigger>
            <TabsTrigger value="history" className={styles['monitoring-metrics__tab-trigger']}>
              <History size={16} />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="logs" className={styles['monitoring-metrics__tab-trigger']}>
              <FileText size={16} />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className={styles['monitoring-metrics__tab-content']}>
            <MonitoringDashboard metrics={metrics} />
          </TabsContent>

          <TabsContent value="indexes" className={styles['monitoring-metrics__tab-content']}>
            {latestMetric.indexStats && latestMetric.indexStats.length > 0 ? (
              <IndexStatsTable
                indexStats={latestMetric.indexStats}
                connectionId={selectedConnectionId}
              />
            ) : (
              <Card padded className={styles['monitoring-metrics__empty']}>
                Nenhuma estatística de índice disponível.
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className={styles['monitoring-metrics__tab-content']}>
            {latestMetric.indexRecommendations && latestMetric.indexRecommendations.length > 0 ? (
              <div className={styles['monitoring-metrics__recommendations-list']}>
                <div className={styles['monitoring-metrics__recommendations-header']}>
                  <h3 className={styles['monitoring-metrics__section-title']}>
                    Recomendações ({latestMetric.indexRecommendations.length})
                  </h3>
                  <Badge variant="secondary">
                    {latestMetric.indexRecommendations.filter((r) => r.expectedImpact === 'high').length} de alto impacto
                  </Badge>
                </div>
                {latestMetric.indexRecommendations.map((rec, idx) => (
                  <RecommendationCard key={idx} recommendation={rec} />
                ))}
              </div>
            ) : (
              <Card padded className={styles['monitoring-metrics__empty']}>
                Nenhuma recomendação disponível no momento.
              </Card>
            )}
          </TabsContent>

          <TabsContent value="efficiency" className={styles['monitoring-metrics__tab-content']}>
            {latestMetric.databaseEfficiency &&
             latestMetric.databaseEfficiency.commitRollbackRatio < 90 && (
              <Alert variant="destructive" className={styles['monitoring-metrics__alert-warning']}>
                <AlertTriangle size={16} />
                <AlertTitle className={styles['monitoring-metrics__alert-title-row']}>
                  <span>Ratio Commits/Rollbacks Requer Atenção</span>
                  <EfficiencyInfoButton
                    type="commit-rollback"
                    value={latestMetric.databaseEfficiency.commitRollbackRatio}
                    status="critical"
                  />
                </AlertTitle>
                <AlertDescription>
                  O ratio de commits/rollbacks está abaixo de 90%, indicando um número significativo de transações sendo revertidas.
                  Isso pode impactar a performance e indicar problemas de concorrência, deadlocks ou erros na aplicação.
                  <span> Clique no ícone de informação acima para ver detalhes, motivos e ações recomendadas.</span>
                </AlertDescription>
              </Alert>
            )}

            <div className={styles['monitoring-metrics__efficiency-grid']}>
              {latestMetric.databaseEfficiency && (
                <>
                  <EfficiencyGauge
                    value={latestMetric.databaseEfficiency.globalCacheHitRatio}
                    label="Cache Hit Ratio Global"
                    thresholds={{ good: 95, warning: 90 }}
                    infoType="cache-hit"
                  />
                  <EfficiencyGauge
                    value={latestMetric.databaseEfficiency.commitRollbackRatio}
                    label="Ratio Commits/Rollbacks"
                    thresholds={{ good: 95, warning: 90 }}
                    infoType="commit-rollback"
                  />
                  <Card className={styles['monitoring-metrics__temp-card']}>
                    <div className={styles['monitoring-metrics__temp-header']}>
                      <h3 className={styles['monitoring-metrics__temp-label']}>Arquivos Temporários</h3>
                      <EfficiencyInfoButton
                        type="temp-files"
                        value={latestMetric.databaseEfficiency.tempFilesCount}
                        status={
                          latestMetric.databaseEfficiency.tempFilesCount === 0
                            ? 'good'
                            : latestMetric.databaseEfficiency.tempFilesCount < 100
                            ? 'warning'
                            : 'critical'
                        }
                      />
                    </div>
                    <div className={styles['monitoring-metrics__temp-value']}>
                      {latestMetric.databaseEfficiency.tempFilesCount.toLocaleString()}
                    </div>
                    <p className={styles['monitoring-metrics__temp-desc']}>
                      {formatBytes(latestMetric.databaseEfficiency.tempBytes)}
                    </p>
                  </Card>
                </>
              )}
            </div>

            {latestMetric.tableEfficiency && latestMetric.tableEfficiency.length > 0 && (
              <Card className={styles['monitoring-metrics__table-card']}>
                <h3 className={styles['monitoring-metrics__section-title']}>Eficiência por Tabela</h3>
                <div className={styles['monitoring-metrics__table-scroll']}>
                  <table className={styles['monitoring-metrics__table']}>
                    <thead>
                      <tr>
                        <th>Schema</th>
                        <th>Tabela</th>
                        <th>Seq Scans</th>
                        <th>Index Scans</th>
                        <th>Ratio Seq/Idx</th>
                        <th>Cache Hit</th>
                        <th>Tamanho</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestMetric.tableEfficiency.map((table, idx) => (
                        <tr key={idx}>
                          <td>{table.schemaName}</td>
                          <td>{table.tableName}</td>
                          <td>{table.seqScanCount.toLocaleString()}</td>
                          <td>{table.indexScanCount.toLocaleString()}</td>
                          <td>{(table.seqIndexRatio * 100).toFixed(1)}%</td>
                          <td>{table.cacheHitRatio.toFixed(1)}%</td>
                          <td>{formatBytes(table.tableSize)}</td>
                          <td>
                            {table.needsAttention ? (
                              <Badge variant="destructive">Atenção</Badge>
                            ) : (
                              <Badge variant="secondary">OK</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="queries" className={styles['monitoring-metrics__tab-content']}>
            {isLoadingHistory ? (
              <Card padded className={styles['monitoring-metrics__empty']}>
                Carregando histórico de queries...
              </Card>
            ) : (
              <QueryHistoryTable queryHistory={queryHistory} />
            )}
          </TabsContent>

          <TabsContent value="tables" className={styles['monitoring-metrics__tab-content']}>
            {latestMetric.tableStats && latestMetric.tableStats.length > 0 ? (
              <Card className={styles['monitoring-metrics__table-card']}>
                <div className={styles['monitoring-metrics__table-header']}>
                  <h3 className={styles['monitoring-metrics__section-title']}>Estatísticas de Tabelas</h3>
                  <Badge variant="secondary">{latestMetric.tableStats.length} tabelas</Badge>
                </div>
                <div className={styles['monitoring-metrics__table-scroll']}>
                  <table className={styles['monitoring-metrics__table']}>
                    <thead>
                      <tr>
                        <th>Schema</th>
                        <th>Tabela</th>
                        <th>Seq Scan</th>
                        <th>Index Scan</th>
                        <th>Inserts</th>
                        <th>Updates</th>
                        <th>Deletes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestMetric.tableStats.map((table, index) => {
                        const tableEfficiency = latestMetric.tableEfficiency?.find(
                          (t) => t.tableName === table.tableName && t.schemaName === table.schemaName
                        );
                        const needsIndex = tableEfficiency?.needsAttention || table.seqScan > table.idxScan * 5;

                        return (
                          <tr key={index}>
                            <td>{table.schemaName}</td>
                            <td>
                              <div className={styles['monitoring-metrics__table-name-cell']}>
                                {table.tableName}
                                {needsIndex && (
                                  <Badge variant="destructive">Precisa índice</Badge>
                                )}
                              </div>
                            </td>
                            <td>{table.seqScan.toLocaleString()}</td>
                            <td>{table.idxScan.toLocaleString()}</td>
                            <td>{table.tupleInsert.toLocaleString()}</td>
                            <td>{table.tupleUpdate.toLocaleString()}</td>
                            <td>{table.tupleDelete.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card padded className={styles['monitoring-metrics__empty']}>
                Nenhuma estatística de tabela disponível.
              </Card>
            )}
          </TabsContent>

          <TabsContent value="query-details" className={styles['monitoring-metrics__tab-content']}>
            <Card className={styles['monitoring-metrics__info-card']}>
              <div className={styles['monitoring-metrics__info-row']}>
                <Info size={20} />
                <div className={styles['monitoring-metrics__info-content']}>
                  <h4>Sobre Queries Detalhadas</h4>
                  <div className={styles['monitoring-metrics__info-text']}>
                    <p>
                      Esta aba exibe estatísticas detalhadas de todas as queries executadas no banco de dados,
                      coletadas através da extensão <strong>pg_stat_statements</strong> do PostgreSQL.
                    </p>
                    <p><strong>O que você pode ver aqui:</strong></p>
                    <ul>
                      <li><strong>Tempo de execução:</strong> Tempo total, médio, mínimo e máximo de cada query</li>
                      <li><strong>Número de chamadas:</strong> Quantas vezes cada query foi executada</li>
                      <li><strong>Uso de cache:</strong> Quantas leituras foram do cache vs disco</li>
                      <li><strong>Operações temporárias:</strong> Uso de arquivos temporários para ordenações/joins grandes</li>
                      <li><strong>Linhas processadas:</strong> Quantas linhas cada query retornou</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            {!latestMetric.pgStatStatementsAvailable && (
              <Card className={styles['monitoring-metrics__warning-card']}>
                <div className={styles['monitoring-metrics__warning-row']}>
                  <AlertTriangle size={20} />
                  <div className={styles['monitoring-metrics__warning-content']}>
                    <h4>pg_stat_statements não está disponível</h4>
                    <p>
                      Esta funcionalidade requer a extensão pg_stat_statements. Consulte a
                      documentação para instalação.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPgStatInfo(true)}
                      className={styles['monitoring-metrics__warning-btn']}
                    >
                      <Info size={16} />
                      Ver instruções de instalação
                    </Button>
                  </div>
                </div>
              </Card>
            )}
            {latestMetric.queryDetails && latestMetric.queryDetails.length > 0 ? (
              <QueryDetailsTable queryDetails={latestMetric.queryDetails} />
            ) : latestMetric.pgStatStatementsAvailable ? (
              <Card padded className={styles['monitoring-metrics__empty']}>
                Nenhuma query detalhada disponível.
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="transactions" className={styles['monitoring-metrics__tab-content']}>
            {latestMetric.activeTransactions && latestMetric.activeTransactions.length > 0 ? (
              <TransactionsTable transactions={latestMetric.activeTransactions} />
            ) : (
              <Card padded className={styles['monitoring-metrics__empty']}>
                Nenhuma transação ativa no momento.
              </Card>
            )}
          </TabsContent>

          <TabsContent value="locks" className={styles['monitoring-metrics__tab-content']}>
            <LocksVisualization
              lockDetails={latestMetric.lockDetails || []}
              blockingLocks={latestMetric.blockingLocks || []}
            />
          </TabsContent>

          <TabsContent value="wal-system" className={styles['monitoring-metrics__tab-content']}>
            <div className={styles['monitoring-metrics__wal-section']}>
              <div>
                <h3 className={styles['monitoring-metrics__wal-title']}>Estatísticas WAL</h3>
                <WalStatsCard walStats={latestMetric.walStats} />
              </div>
              <div>
                <h3 className={styles['monitoring-metrics__wal-title']}>Tablespaces</h3>
                <TablespacesList tablespaces={latestMetric.tablespaces || []} />
              </div>
              <div>
                <h3 className={styles['monitoring-metrics__wal-title']}>Configurações de Memória</h3>
                <MemoryConfigCard memoryConfig={latestMetric.memoryConfig} />
              </div>
              {latestMetric.systemInfo && (
                <Card className={styles['monitoring-metrics__system-card']}>
                  <h3 className={styles['monitoring-metrics__section-title']}>Informações do Sistema</h3>
                  <div className={styles['monitoring-metrics__system-rows']}>
                    <div className={styles['monitoring-metrics__system-row']}>
                      <span className={styles['monitoring-metrics__system-label']}>Versão:</span>
                      <span className={styles['monitoring-metrics__system-code']}>{latestMetric.systemInfo.version}</span>
                    </div>
                    {latestMetric.systemInfo.dataDirectory && (
                      <div className={styles['monitoring-metrics__system-row']}>
                        <span className={styles['monitoring-metrics__system-label']}>Diretório de Dados:</span>
                        <code className={styles['monitoring-metrics__system-code']}>{latestMetric.systemInfo.dataDirectory}</code>
                      </div>
                    )}
                    {latestMetric.systemInfo.configFile && (
                      <div className={styles['monitoring-metrics__system-row']}>
                        <span className={styles['monitoring-metrics__system-label']}>Arquivo de Config:</span>
                        <code className={styles['monitoring-metrics__system-code']}>{latestMetric.systemInfo.configFile}</code>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className={styles['monitoring-metrics__tab-content']}>
            <Card className={styles['monitoring-metrics__history-controls']}>
              <div className={styles['monitoring-metrics__history-header']}>
                <h3 className={styles['monitoring-metrics__section-title']}>Histórico Consolidado</h3>
                <div className={styles['monitoring-metrics__period-buttons']}>
                  <Button
                    variant={historicalPeriod === '24h' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHistoricalPeriod('24h')}
                  >
                    24h
                  </Button>
                  <Button
                    variant={historicalPeriod === '7d' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHistoricalPeriod('7d')}
                  >
                    7d
                  </Button>
                  <Button
                    variant={historicalPeriod === '30d' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHistoricalPeriod('30d')}
                  >
                    30d
                  </Button>
                </div>
              </div>
            </Card>
            <HistoricalMetricsChart metrics={historicalMetrics} />
            <HistoricalMetricsTable metrics={historicalMetrics} />
          </TabsContent>

          <TabsContent value="logs" className={styles['monitoring-metrics__tab-content']}>
            <PostgresLogsViewer
              logs={logs}
              isLoading={isLoadingLogs}
              onRefresh={() => refetchLogs()}
            />
          </TabsContent>
        </Tabs>
      )}

      {metrics.length === 0 && selectedConnectionId && !isLoading && (
        <Card padded className={styles['monitoring-metrics__empty']}>
          Nenhuma métrica encontrada para esta conexão. Clique em "Coletar Métricas" para começar.
        </Card>
      )}
    </div>
  );
}
