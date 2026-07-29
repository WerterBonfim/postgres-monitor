import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { postgresqlApi } from '../../services/postgresqlApi';
import type { PostgresConnection, QueryPlanResult } from '../../types/postgresql';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import styles from './QueryPlanExecutor.module.scss';

interface QueryPlanExecutorProps {
  connections: PostgresConnection[];
}

export function QueryPlanExecutor({ connections }: QueryPlanExecutorProps) {
  const defaultConnection = connections.find(c => c.isDefault) || connections[0];
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    defaultConnection?.id || ''
  );
  const [query, setQuery] = useState<string>('SELECT * FROM users LIMIT 10;');
  const [planResult, setPlanResult] = useState<QueryPlanResult | null>(null);

  const executeMutation = useMutation({
    mutationFn: ({ connectionId, query }: { connectionId: string; query: string }) =>
      postgresqlApi.executeExplainAnalyze(connectionId, query),
    onSuccess: (data) => {
      setPlanResult(data);
    },
  });

  const handleExecute = () => {
    if (!selectedConnectionId || !query.trim()) {
      return;
    }
    executeMutation.mutate({ connectionId: selectedConnectionId, query });
  };

  const renderPlanNode = (node: QueryPlanResult['plan'], depth = 0) => {
    return (
      <div key={node.nodeType} className={styles['query-plan-executor__plan-node']} style={{ marginLeft: `${depth * 20}px` }}>
        <div className={styles['query-plan-executor__plan-node-header']}>
          <Badge variant="outline">{node.nodeType}</Badge>
          {node.relationName && (
            <span className={styles['query-plan-executor__plan-node-meta']}>
              {node.relationName}
              {node.alias && ` (${node.alias})`}
            </span>
          )}
        </div>
        <div className={styles['query-plan-executor__plan-node-meta']}>
          <div>
            Custo: {node.cost.startup.toFixed(2)}..{node.cost.total.toFixed(2)}
          </div>
          {node.actualTime && (
            <div>
              Tempo: {node.actualTime.first.toFixed(2)}ms..{node.actualTime.total.toFixed(2)}ms
            </div>
          )}
          <div>
            Linhas: {node.rows.estimated.toLocaleString()}
            {node.rows.actual !== undefined && ` (${node.rows.actual.toLocaleString()} real)`}
          </div>
          {node.buffers && (
            <div>
              Buffers: {node.buffers.sharedHit} hit, {node.buffers.sharedRead} read
            </div>
          )}
        </div>
        {node.children.length > 0 && (
          <div>
            {node.children.map((child, index) => (
              <div key={index}>{renderPlanNode(child, depth + 1)}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (connections.length === 0) {
    return (
      <Card padded className={styles['query-plan-executor__empty']}>
        Configure pelo menos uma conexão para executar query plans.
      </Card>
    );
  }

  return (
    <div className={styles['query-plan-executor']}>
      <h2 className={styles['query-plan-executor__title']}>Análise de Query Plan</h2>

      <Card className={styles['query-plan-executor__form-card']}>
        <div className={styles['query-plan-executor__field']}>
          <label className={styles['query-plan-executor__label']}>Conexão</label>
          <select
            value={selectedConnectionId}
            onChange={(e) => setSelectedConnectionId(e.target.value)}
            className={styles['query-plan-executor__select']}
          >
            <option value="">Selecione uma conexão</option>
            {connections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name} {conn.isDefault && '(Padrão)'} ({conn.host}:{conn.port}/{conn.database})
              </option>
            ))}
          </select>
        </div>

        <div className={styles['query-plan-executor__field']}>
          <label className={styles['query-plan-executor__label']}>Query SQL</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={8}
            className={styles['query-plan-executor__textarea']}
            placeholder="Digite sua query SQL aqui..."
          />
        </div>

        <Button onClick={handleExecute} disabled={!selectedConnectionId || !query.trim() || executeMutation.isPending}>
          {executeMutation.isPending ? 'Executando...' : 'Executar EXPLAIN ANALYZE'}
        </Button>
      </Card>

      {executeMutation.isError && (
        <Card className={styles['query-plan-executor__error-card']}>
          <p>
            Erro: {executeMutation.error instanceof Error ? executeMutation.error.message : 'Erro desconhecido'}
          </p>
        </Card>
      )}

      {planResult && (
        <div className={styles['query-plan-executor__results']}>
          <Card className={styles['query-plan-executor__result-card']}>
            <h3 className={styles['query-plan-executor__result-title']}>Resultado do Query Plan</h3>
            <div>
              <div className={styles['query-plan-executor__metrics-grid']}>
                <div>
                  <span className={styles['query-plan-executor__metric-label']}>Tempo de Planejamento:</span>
                  <span className={styles['query-plan-executor__metric-value']}>{planResult.planningTime.toFixed(2)}ms</span>
                </div>
                <div>
                  <span className={styles['query-plan-executor__metric-label']}>Tempo de Execução:</span>
                  <span className={styles['query-plan-executor__metric-value']}>{planResult.executionTime.toFixed(2)}ms</span>
                </div>
              </div>

              <div>
                <h4 className={styles['query-plan-executor__section-title']}>Árvore do Plano de Execução</h4>
                <div className={styles['query-plan-executor__plan-tree']}>
                  {renderPlanNode(planResult.plan)}
                </div>
              </div>

              {planResult.insights && (
                <div>
                  <h4 className={styles['query-plan-executor__section-title']}>Insights e Recomendações</h4>
                  {planResult.insights.problems.length > 0 && (
                    <div>
                      <h5 className={styles['query-plan-executor__problems-title']}>Problemas Identificados:</h5>
                      <ul className={styles['query-plan-executor__problems-list']}>
                        {planResult.insights.problems.map((problem, index) => (
                          <li key={index}>{problem}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {planResult.insights.recommendations.length > 0 && (
                    <div>
                      <h5 className={styles['query-plan-executor__section-title']}>Recomendações:</h5>
                      <div className={styles['query-plan-executor__recommendations']}>
                        {planResult.insights.recommendations.map((rec, index) => (
                          <Card key={index} className={styles['query-plan-executor__rec-card']}>
                            <Badge variant={rec.impact === 'high' ? 'destructive' : rec.impact === 'medium' ? 'default' : 'secondary'}>
                              {rec.type} - {rec.impact}
                            </Badge>
                            <p className={styles['query-plan-executor__rec-description']}>{rec.description}</p>
                            {rec.sqlScript && (
                              <pre className={styles['query-plan-executor__rec-code']}>{rec.sqlScript}</pre>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
