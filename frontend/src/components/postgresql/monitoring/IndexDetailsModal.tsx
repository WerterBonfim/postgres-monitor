import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { Database, TrendingUp, Activity, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { postgresqlApi } from '../../../services/postgresqlApi';
import type { IndexDetails } from '../../../types/postgresql';
import { formatBytes } from '../../../lib/utils';
import { cx } from '../../../lib/cx';
import styles from './IndexDetailsModal.module.scss';

interface IndexDetailsModalProps {
  connectionId: string;
  schemaName: string;
  tableName: string;
  indexName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IndexDetailsModal({
  connectionId,
  schemaName,
  tableName,
  indexName,
  open,
  onOpenChange,
}: IndexDetailsModalProps) {
  const { data: indexDetails, isLoading, error } = useQuery<IndexDetails>({
    queryKey: ['index-details', connectionId, schemaName, tableName, indexName],
    queryFn: () => postgresqlApi.getIndexDetails(connectionId, schemaName, tableName, indexName),
    enabled: open && !!connectionId,
  });

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full">
        <DialogHeader>
          <DialogTitle className={styles['detail-modal__title']}>
            <Database size={20} />
            Detalhes do Índice: {indexName}
          </DialogTitle>
          <DialogDescription>
            {schemaName}.{tableName}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className={styles['detail-modal__loading']}>
            <RefreshCw size={24} className={styles['detail-modal__spin']} />
            <span>Carregando detalhes do índice...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle size={16} />
            <AlertDescription>
              Erro ao carregar detalhes do índice: {error instanceof Error ? error.message : 'Erro desconhecido'}
            </AlertDescription>
          </Alert>
        )}

        {indexDetails && (
          <div className={styles['detail-modal__body']}>
            <Card className={styles['detail-modal__section']}>
              <h3 className={styles['detail-modal__section-title']}>
                <Info size={16} />
                Informações Básicas
              </h3>
              <div className={styles['detail-modal__grid']}>
                <div>
                  <div className={styles['detail-modal__field-label']}>Tamanho do Índice</div>
                  <div className={styles['detail-modal__field-value']}>{formatBytes(indexDetails.indexSize)}</div>
                </div>
                <div>
                  <div className={styles['detail-modal__field-label']}>Tamanho da Tabela</div>
                  <div className={styles['detail-modal__field-value']}>{formatBytes(indexDetails.tableSize)}</div>
                </div>
                <div>
                  <div className={styles['detail-modal__field-label']}>% da Tabela</div>
                  <div className={styles['detail-modal__field-value']}>{indexDetails.indexPercentOfTable.toFixed(2)}%</div>
                </div>
                <div>
                  <div className={styles['detail-modal__field-label']}>Status</div>
                  <div>
                    {indexDetails.isValid ? (
                      <Badge variant="success">
                        <CheckCircle size={12} />
                        Válido
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle size={12} />
                        Inválido
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <div className={styles['detail-modal__field-label']}>Tipo</div>
                  <div className={styles['detail-modal__field-row']}>
                    {indexDetails.isPrimary && <Badge variant="default">Primary Key</Badge>}
                    {indexDetails.isUnique && <Badge variant="outline">Unique</Badge>}
                  </div>
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
                  <div className={styles['detail-modal__field-label']}>Scans do Índice</div>
                  <div className={cx(styles['detail-modal__field-value'], styles['detail-modal__field-value--lg'])}>
                    {indexDetails.indexScans.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className={styles['detail-modal__field-label']}>Tuplas Lidas</div>
                  <div className={cx(styles['detail-modal__field-value'], styles['detail-modal__field-value--lg'])}>
                    {indexDetails.indexTuplesRead.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className={styles['detail-modal__field-label']}>Tuplas Obtidas</div>
                  <div className={cx(styles['detail-modal__field-value'], styles['detail-modal__field-value--lg'])}>
                    {indexDetails.indexTuplesFetched.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className={styles['detail-modal__field-label']}>Uso do Índice</div>
                  <div className={cx(styles['detail-modal__field-value'], styles['detail-modal__field-value--lg'])}>
                    {indexDetails.tableIndexUsageRatio.toFixed(1)}%
                  </div>
                </div>
              </div>
            </Card>

            <Card className={styles['detail-modal__section']}>
              <h3 className={styles['detail-modal__section-title']}>
                <TrendingUp size={16} />
                Comportamento da Tabela
              </h3>
              <div className={styles['detail-modal__subsection']}>
                <div className={styles['detail-modal__grid']}>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Seq Scans</div>
                    <div className={styles['detail-modal__field-value']}>{indexDetails.tableSeqScans.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Index Scans</div>
                    <div className={styles['detail-modal__field-value']}>{indexDetails.tableIndexScans.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Tuplas Vivas</div>
                    <div className={styles['detail-modal__field-value']}>{indexDetails.tableLiveTuples.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Tuplas Mortas</div>
                    <div className={styles['detail-modal__field-row']}>
                      <span className={styles['detail-modal__field-value']}>{indexDetails.tableDeadTuples.toLocaleString()}</span>
                      {indexDetails.tableDeadTupleRatio > 10 && (
                        <Badge variant="destructive">{indexDetails.tableDeadTupleRatio.toFixed(1)}%</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className={cx(styles['detail-modal__grid'], styles['detail-modal__grid--3'])}>
                  <div>
                    <div className={styles['detail-modal__field-label']}>INSERTs</div>
                    <div className={styles['detail-modal__field-value']}>{indexDetails.tableInserts.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>UPDATEs</div>
                    <div className={styles['detail-modal__field-value']}>{indexDetails.tableUpdates.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>DELETEs</div>
                    <div className={styles['detail-modal__field-value']}>{indexDetails.tableDeletes.toLocaleString()}</div>
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
                      {indexDetails.totalReorganizations.toLocaleString()}
                    </div>
                    <div className={styles['detail-modal__field-label']}>
                      (VACUUM: {indexDetails.vacuumCount + indexDetails.autovacuumCount})
                    </div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>VACUUM Manual</div>
                    <div className={styles['detail-modal__field-value']}>{indexDetails.vacuumCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>AUTO VACUUM</div>
                    <div className={styles['detail-modal__field-value']}>{indexDetails.autovacuumCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>ANALYZE</div>
                    <div className={styles['detail-modal__field-value']}>
                      {(indexDetails.analyzeCount + indexDetails.autoanalyzeCount).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className={styles['detail-modal__meta-grid']}>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Último VACUUM Manual</div>
                    <div className={styles['detail-modal__field-value']}>
                      {indexDetails.lastVacuum
                        ? new Date(indexDetails.lastVacuum).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Último AUTO VACUUM</div>
                    <div className={styles['detail-modal__field-value']}>
                      {indexDetails.lastAutovacuum
                        ? new Date(indexDetails.lastAutovacuum).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Último ANALYZE Manual</div>
                    <div className={styles['detail-modal__field-value']}>
                      {indexDetails.lastAnalyze
                        ? new Date(indexDetails.lastAnalyze).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </div>
                  </div>
                  <div>
                    <div className={styles['detail-modal__field-label']}>Último AUTO ANALYZE</div>
                    <div className={styles['detail-modal__field-value']}>
                      {indexDetails.lastAutoanalyze
                        ? new Date(indexDetails.lastAutoanalyze).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className={styles['detail-modal__section']}>
              <h3 className={styles['detail-modal__section-title']}>Definição do Índice</h3>
              <pre className={styles['detail-modal__code']}>{indexDetails.indexDefinition}</pre>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
