import { useState, useMemo } from 'react';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Search, Clock, AlertTriangle } from 'lucide-react';
import type { TransactionDetail } from '../../../types/postgresql';
import styles from './TransactionsTable.module.scss';

interface TransactionsTableProps {
  transactions: TransactionDetail[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.datname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.usename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.query?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.applicationName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const getStateBadge = (state: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      idle: 'secondary',
      'idle in transaction': 'destructive',
      'idle in transaction (aborted)': 'destructive',
    };

    return <Badge variant={variants[state] || 'outline'}>{state}</Badge>;
  };

  const formatDuration = (runtime?: string) => {
    if (!runtime) return '-';
    return runtime;
  };

  if (transactions.length === 0) {
    return (
      <Card padded className={styles['transactions-table__empty']}>
        Nenhuma transação ativa no momento.
      </Card>
    );
  }

  const longRunning = filtered.filter(
    (t) => t.runtime && parseFloat(t.runtime.replace(/[^\d.]/g, '')) > 300
  );

  return (
    <div className={styles['transactions-table']}>
      {longRunning.length > 0 && (
        <Card className={styles['transactions-table__warning']}>
          <div className={styles['transactions-table__warning-row']}>
            <AlertTriangle size={16} />
            <span>
              {longRunning.length} transação(ões) rodando há mais de 5 minutos
            </span>
          </div>
        </Card>
      )}

      <Card className={styles['transactions-table__card']}>
        <div className={styles['transactions-table__search']}>
          <Search size={16} />
          <Input
            placeholder="Buscar transações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles['transactions-table__scroll']}>
          <table className={styles['transactions-table__table']}>
            <thead>
              <tr>
                <th>PID</th>
                <th>Usuário</th>
                <th>Banco</th>
                <th>Estado</th>
                <th>Tempo de Execução</th>
                <th>Query</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((transaction, idx) => (
                <tr key={idx}>
                  <td>
                    <code>{transaction.pid}</code>
                  </td>
                  <td>{transaction.usename}</td>
                  <td>{transaction.datname}</td>
                  <td>{getStateBadge(transaction.state)}</td>
                  <td>
                    <div className={styles['transactions-table__duration']}>
                      <Clock size={12} />
                      {formatDuration(transaction.runtime)}
                    </div>
                  </td>
                  <td>
                    {transaction.query ? (
                      <code className={styles['transactions-table__query-code']}>
                        {transaction.query.substring(0, 100)}
                        {transaction.query.length > 100 && '...'}
                      </code>
                    ) : (
                      <span className={styles['transactions-table__no-query']}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
