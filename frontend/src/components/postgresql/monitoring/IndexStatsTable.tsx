import { useState, useMemo } from 'react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { StatusBadge } from './StatusBadge';
import { IndexDetailsModal } from './IndexDetailsModal';
import { Search, Eye } from 'lucide-react';
import type { IndexStats } from '../../../types/postgresql';
import { formatBytes } from '../../../lib/utils';
import styles from './IndexStatsTable.module.scss';

interface IndexStatsTableProps {
  indexStats: IndexStats[];
  connectionId?: string;
}

type FilterStatus = 'all' | 'unused' | 'low_usage' | 'normal' | 'high_usage';

export function IndexStatsTable({ indexStats, connectionId }: IndexStatsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [selectedIndex, setSelectedIndex] = useState<{
    schemaName: string;
    tableName: string;
    indexName: string;
  } | null>(null);

  const filteredStats = useMemo(() => {
    return indexStats.filter((index) => {
      const matchesSearch =
        index.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        index.indexName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        index.schemaName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || index.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [indexStats, searchTerm, statusFilter]);

  const statsByStatus = useMemo(() => {
    return {
      all: indexStats.length,
      unused: indexStats.filter((i) => i.status === 'unused').length,
      low_usage: indexStats.filter((i) => i.status === 'low_usage').length,
      normal: indexStats.filter((i) => i.status === 'normal').length,
      high_usage: indexStats.filter((i) => i.status === 'high_usage').length,
    };
  }, [indexStats]);

  const filterLabels: Record<FilterStatus, string> = {
    all: 'Todos',
    unused: 'Não Utilizados',
    low_usage: 'Baixo Uso',
    normal: 'Normal',
    high_usage: 'Alto Uso',
  };

  return (
    <Card className={styles['index-stats-table']}>
      <div className={styles['index-stats-table__inner']}>
        <div className={styles['index-stats-table__header']}>
          <h3 className={styles['index-stats-table__title']}>Estatísticas de Índices</h3>
          <Badge variant="secondary">{filteredStats.length} índices</Badge>
        </div>

        <div className={styles['index-stats-table__filters']}>
          <div className={styles['index-stats-table__search']}>
            <Search size={16} />
            <Input
              type="text"
              placeholder="Pesquisar por tabela ou índice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className={styles['index-stats-table__filter-badges']}>
            {(['all', 'unused', 'low_usage', 'normal', 'high_usage'] as FilterStatus[]).map((status) => (
              <Badge
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                className={styles['index-stats-table__filter-badge']}
                onClick={() => setStatusFilter(status)}
              >
                {filterLabels[status]} ({statsByStatus[status]})
              </Badge>
            ))}
          </div>
        </div>

        <div className={styles['index-stats-table__scroll']}>
          <table className={styles['index-stats-table__table']}>
            <thead>
              <tr>
                <th>Schema</th>
                <th>Tabela</th>
                <th>Índice</th>
                <th>Scans</th>
                <th>Tuplas Lidas</th>
                <th>Tamanho</th>
                <th>% da Tabela</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={9} className={styles['index-stats-table__empty-cell']}>
                    Nenhum índice encontrado
                  </td>
                </tr>
              ) : (
                filteredStats.map((index, idx) => (
                  <tr key={idx}>
                    <td>{index.schemaName}</td>
                    <td className={styles['index-stats-table__table-name']}>{index.tableName}</td>
                    <td className={styles['index-stats-table__index-name']}>{index.indexName}</td>
                    <td>{index.indexScans.toLocaleString()}</td>
                    <td>{index.indexTuplesRead.toLocaleString()}</td>
                    <td>{formatBytes(index.indexSize)}</td>
                    <td>{index.percentOfTable.toFixed(2)}%</td>
                    <td>
                      <StatusBadge status={index.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedIndex({
                            schemaName: index.schemaName,
                            tableName: index.tableName,
                            indexName: index.indexName,
                          })
                        }
                        className={styles['index-stats-table__view-btn']}
                        title="Ver detalhes do índice"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedIndex && connectionId && (
        <IndexDetailsModal
          connectionId={connectionId}
          schemaName={selectedIndex.schemaName}
          tableName={selectedIndex.tableName}
          indexName={selectedIndex.indexName}
          open={!!selectedIndex}
          onOpenChange={(open) => !open && setSelectedIndex(null)}
        />
      )}
    </Card>
  );
}
