import { useState, useMemo } from 'react';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Search, ArrowUpDown } from 'lucide-react';
import type { QueryDetail } from '../../../types/postgresql';
import { formatBytes } from '../../../lib/utils';
import styles from './QueryDetailsTable.module.scss';

interface QueryDetailsTableProps {
  queryDetails: QueryDetail[];
}

type SortField = 'totalTime' | 'meanTime' | 'calls' | 'sharedBlksRead';
type SortDirection = 'asc' | 'desc';

export function QueryDetailsTable({ queryDetails }: QueryDetailsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredAndSorted = useMemo(() => {
    const filtered = queryDetails.filter((q) =>
      q.query.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortField) {
        case 'totalTime':
          aVal = a.totalTime;
          bVal = b.totalTime;
          break;
        case 'meanTime':
          aVal = a.meanTime;
          bVal = b.meanTime;
          break;
        case 'calls':
          aVal = a.calls;
          bVal = b.calls;
          break;
        case 'sharedBlksRead':
          aVal = a.sharedBlksRead;
          bVal = b.sharedBlksRead;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aVal - bVal;
      }
      return bVal - aVal;
    });

    return filtered;
  }, [queryDetails, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className={styles['query-details-table__sort-btn']}
    >
      {label}
      <ArrowUpDown size={12} />
    </button>
  );

  if (queryDetails.length === 0) {
    return (
      <Card padded className={styles['query-details-table__empty']}>
        Nenhuma query detalhada disponível. Certifique-se de que pg_stat_statements está
        configurado.
      </Card>
    );
  }

  return (
    <Card className={styles['query-details-table']}>
      <div className={styles['query-details-table__search']}>
        <Search size={16} />
        <Input
          placeholder="Buscar queries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className={styles['query-details-table__scroll']}>
        <table className={styles['query-details-table__table']}>
          <thead>
            <tr>
              <th>
                <SortButton field="totalTime" label="Tempo Total" />
              </th>
              <th>
                <SortButton field="meanTime" label="Tempo Médio" />
              </th>
              <th>
                <SortButton field="calls" label="Chamadas" />
              </th>
              <th>
                <SortButton field="sharedBlksRead" label="I/O Disco" />
              </th>
              <th>Cache Hit</th>
              <th>Query</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((query, idx) => {
              const cacheHitRatio =
                query.sharedBlksHit + query.sharedBlksRead > 0
                  ? ((query.sharedBlksHit / (query.sharedBlksHit + query.sharedBlksRead)) * 100).toFixed(1)
                  : '100.0';

              return (
                <tr key={idx}>
                  <td>
                    <Badge variant="outline">{query.totalTime.toFixed(2)} ms</Badge>
                  </td>
                  <td>{query.meanTime.toFixed(2)} ms</td>
                  <td>{query.calls.toLocaleString()}</td>
                  <td>
                    {query.sharedBlksRead > 0 && (
                      <Badge variant="destructive">
                        {formatBytes(query.sharedBlksRead * 8192)}
                      </Badge>
                    )}
                    {query.sharedBlksRead === 0 && (
                      <Badge variant="secondary">0 B</Badge>
                    )}
                  </td>
                  <td>
                    <Badge
                      variant={
                        parseFloat(cacheHitRatio) > 95
                          ? 'default'
                          : parseFloat(cacheHitRatio) > 80
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {cacheHitRatio}%
                    </Badge>
                  </td>
                  <td>
                    <code className={styles['query-details-table__query-code']}>
                      {query.query.substring(0, 100)}
                      {query.query.length > 100 && '...'}
                    </code>
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
