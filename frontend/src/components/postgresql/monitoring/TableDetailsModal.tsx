import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { Database, TrendingUp, Activity, RefreshCw, AlertTriangle, CheckCircle, Info, Columns } from 'lucide-react';
import { postgresqlApi } from '../../../services/postgresqlApi';
import type { TableDetails } from '../../../types/postgresql';
import { formatBytes } from '../../../lib/utils';
import { cx } from '../../../lib/cx';
import styles from './TableDetailsModal.module.scss';

interface TableDetailsModalProps {
  connectionId: string;
  schemaName: string;
  tableName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TableDetailsModal({
  connectionId,
  schemaName,
  tableName,
  open,
  onOpenChange,
}: TableDetailsModalProps) {
  const { data: tableDetails, isLoading, error } = useQuery<TableDetails>({
    queryKey: ['table-details', connectionId, schemaName, tableName],
    queryFn: () => postgresqlApi.getTableDetails(connectionId, schemaName, tableName),
    enabled: open && !!connectionId,
  });

  if (!open) return null;

  const getImpactBadgeVariant = (level: string): 'destructive' | 'default' | 'secondary' => {
    switch (level) {
      case 'critical':
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full">
        <DialogHeader>
          <DialogTitle className={styles['detail-modal__title']}>
            <Database size={20} />
            Detalhes da Tabela: {tableName}
          </DialogTitle>
          <DialogDescription>{schemaName}</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className={styles['detail-modal__loading']}>
            <RefreshCw size={24} className={styles['detail-modal__spin']} />
            <span>Carregando detalhes da tabela...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle size={16} />
            <AlertDescription>
              Erro ao carregar detalhes da tabela: {error instanceof Error ? error.message : 'Erro desconhecido'}
            </AlertDescription>
          </Alert>
        )}

        {tableDetails && (
          <div className={styles['detail-modal__body']}>
            <Alert variant={getImpactBadgeVariant(tableDetails.impactLevel) === 'destructive' ? 'destructive' : 'default'}>
              <AlertTriangle size={16} />
              <AlertDescription>
                <div className={styles['detail-modal__impact-alert']}>
                  <strong>Nível de Impacto:</strong>
                  <Badge variant={getImpactBadgeVariant(tableDetails.impactLevel)}>
                    {tableDetails.impactLevel.toUpperCase()}
                  </Badge>
                </div>
                <div>{tableDetails.impactDescription}</div>
              </AlertDescription>
            </Alert>

            <Card className={styles['detail-modal__section']}>
              <h3 className={styles['detail-modal__section-title']}>
                <Info size={16} />
                Informações Básicas
              </h3>
              <div className={styles['detail-modal__grid']}>
                <div>
                  <div className={styles['detail-modal__field-label']}>Tamanho Total</div>
                  <div className={styles['detail-modal__field-value']}>{formatBytes(tableDetails.totalSize)}</div>
                </div>
                <div>
                  <div className={styles['detail-modal__field-label']}>Tamanho da Tabela</div>
                  <div className={styles['detail-modal__field-value']}>{formatBytes(tableDetails.tableSize)}</div>
                </div>
                <div>
                  <div className={styles['detail-modal__field-label']}>Tamanho dos Índices</div>
                  <div className={styles['detail-modal__field-value']}>{formatBytes(tableDetails.indexSize)}</div>
                </div>
                <div>
                  <div className={styles['detail-modal__field-label']}>Total de Linhas</div>
                  <div className={styles['detail-modal__field-value']}>{tableDetails.rowCount.toLocaleString()}</div>
                </div>
              </div>
            </Card>

            <Card className={styles['detail-modal__section']}>
              <h3 className={styles['detail-modal__section-title']}>
                <Activity size={16} />
                Estatísticas de Uso
              </h3>
              <div className={styles['detail-modal__grid']}>
                <div>
                  <div className={styles['detail-modal__field-label']}>Seq Scans</div>
                  <div className={cx(styles['detail-modal__field-value'], styles['detail-modal__field-value--lg'])}>
                    {tableDetails.seqScans.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className={styles['detail-modal__field-label']}>Index Scans</div>
                  <div className={cx(styles['detail-modal__field-value'], styles['detail-modal__field-value--lg'])}>
                    {tableDetails.indexScans.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className={styles['detail-modal__field-label']}>Uso do Índice</div>
                  <div className={cx(styles['detail-modal__field-value'], styles['detail-modal__field-value--lg'])}>
                    {tableDetails.indexUsageRatio.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className={styles['detail-modal__field-label']}>Cache Hit Ratio</div>
                  <div className={cx(styles['detail-modal__field-value'], styles['detail-modal__field-value--lg'])}>
                    {tableDetails.cacheHitRatio.toFixed(1)}%
                  </div>
                </div>
              </div>
            </Card>

            <Card className={styles['detail-modal__section']}>
              <h3 className={styles['detail-modal__section-title']}>
                <TrendingUp size={16} />
                Tuplas e Operações
              </h3>
              <div className={styles['detail-modal__subsection']}>
                <div className={styles['detail-modal__grid']}>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Tuplas Vivas</div>
                    <div className={styles['detail-modal__field-value']}>{tableDetails.liveTuples.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Tuplas Mortas</div>
                    <div className={styles['detail-modal__field-row']}>
                      <span className={styles['detail-modal__field-value']}>{tableDetails.deadTuples.toLocaleString()}</span>
                      {tableDetails.deadTupleRatio > 10 && (
                        <Badge variant="destructive">{tableDetails.deadTupleRatio.toFixed(1)}%</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>INSERTs</div>
                    <div className={styles['detail-modal__field-value']}>{tableDetails.inserts.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>UPDATEs</div>
                    <div className={styles['detail-modal__field-value']}>{tableDetails.updates.toLocaleString()}</div>
                  </div>
                </div>
                <div className={cx(styles['detail-modal__grid'], styles['detail-modal__grid--3'])}>
                  <div>
                    <div className={styles['detail-modal__field-label']}>DELETEs</div>
                    <div className={styles['detail-modal__field-value']}>{tableDetails.deletes.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Tuplas Lidas (Seq)</div>
                    <div className={styles['detail-modal__field-value']}>{tableDetails.seqTupRead.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Tuplas Obtidas (Idx)</div>
                    <div className={styles['detail-modal__field-value']}>{tableDetails.indexTupFetch.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className={styles['detail-modal__section']}>
              <h3 className={styles['detail-modal__section-title']}>
                <RefreshCw size={16} />
                Reorganizações e Manutenção
              </h3>
              <div className={styles['detail-modal__subsection']}>
                <div className={styles['detail-modal__grid']}>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Total de Reorganizações</div>
                    <div className={cx(styles['detail-modal__field-value'], styles['detail-modal__field-value--lg'])}>
                      {tableDetails.totalReorganizations.toLocaleString()}
                    </div>
                    <div className={styles['detail-modal__field-label']}>
                      (VACUUM: {tableDetails.vacuumCount + tableDetails.autovacuumCount})
                    </div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>VACUUM Manual</div>
                    <div className={styles['detail-modal__field-value']}>{tableDetails.vacuumCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>AUTO VACUUM</div>
                    <div className={styles['detail-modal__field-value']}>{tableDetails.autovacuumCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>ANALYZE</div>
                    <div className={styles['detail-modal__field-value']}>
                      {(tableDetails.analyzeCount + tableDetails.autoanalyzeCount).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className={styles['detail-modal__meta-grid']}>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Último VACUUM Manual</div>
                    <div className={styles['detail-modal__field-value']}>
                      {tableDetails.lastVacuum
                        ? new Date(tableDetails.lastVacuum).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Último AUTO VACUUM</div>
                    <div className={styles['detail-modal__field-value']}>
                      {tableDetails.lastAutovacuum
                        ? new Date(tableDetails.lastAutovacuum).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Último ANALYZE Manual</div>
                    <div className={styles['detail-modal__field-value']}>
                      {tableDetails.lastAnalyze
                        ? new Date(tableDetails.lastAnalyze).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Último AUTO ANALYZE</div>
                    <div className={styles['detail-modal__field-value']}>
                      {tableDetails.lastAutoanalyze
                        ? new Date(tableDetails.lastAutoanalyze).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className={styles['detail-modal__section']}>
              <h3 className={styles['detail-modal__section-title']}>
                <Columns size={16} />
                Colunas ({tableDetails.columns.length})
              </h3>
              <div className={styles['detail-modal__table-scroll']}>
                <table className={styles['detail-modal__table']}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Nullable</th>
                      <th>Default</th>
                      <th>Primary Key</th>
                      <th>Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableDetails.columns.map((column, idx) => (
                      <tr key={idx}>
                        <td>{column.columnName}</td>
                        <td>
                          {column.dataType}
                          {column.characterMaximumLength && `(${column.characterMaximumLength})`}
                          {column.numericPrecision && column.numericScale &&
                            `(${column.numericPrecision},${column.numericScale})`}
                          {column.numericPrecision && !column.numericScale &&
                            `(${column.numericPrecision})`}
                        </td>
                        <td>
                          {column.isNullable ? (
                            <Badge variant="outline">Sim</Badge>
                          ) : (
                            <Badge variant="secondary">Não</Badge>
                          )}
                        </td>
                        <td>{column.defaultValue || '-'}</td>
                        <td>
                          {column.isPrimaryKey ? (
                            <Badge variant="default">
                              <CheckCircle size={12} />
                              PK
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {column.characterMaximumLength && `Max length: ${column.characterMaximumLength}`}
                          {column.numericPrecision && `Precision: ${column.numericPrecision}`}
                          {column.numericScale && ` Scale: ${column.numericScale}`}
                          {!column.characterMaximumLength && !column.numericPrecision && '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
