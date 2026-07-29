import { useState } from 'react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { RefreshCw, AlertCircle, Info } from 'lucide-react';
import { cx } from '../../../lib/cx';
import styles from './PostgresLogsViewer.module.scss';

interface PostgresLogsViewerProps {
  logs: string[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function PostgresLogsViewer({ logs, isLoading, onRefresh }: PostgresLogsViewerProps) {
  const [autoScroll, setAutoScroll] = useState(true);

  const getLogLevel = (line: string): 'error' | 'warning' | 'info' | 'unknown' => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('error') || lowerLine.includes('fatal') || lowerLine.includes('panic')) {
      return 'error';
    }
    if (lowerLine.includes('warning') || lowerLine.includes('warn')) {
      return 'warning';
    }
    if (lowerLine.includes('info') || lowerLine.includes('notice')) {
      return 'info';
    }
    return 'unknown';
  };

  const getLogLevelIcon = (level: 'error' | 'warning' | 'info' | 'unknown') => {
    switch (level) {
      case 'error':
        return <AlertCircle size={12} />;
      case 'warning':
        return <AlertCircle size={12} />;
      case 'info':
        return <Info size={12} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card padded className={styles['postgres-logs__empty']}>
        <RefreshCw size={20} className={styles['postgres-logs__loading-icon']} />
        Carregando logs...
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card padded className={styles['postgres-logs__empty']}>
        Nenhum log disponível.
      </Card>
    );
  }

  if (logs.length > 0 && logs[0].includes('Não foi possível acessar')) {
    return (
      <Card className={styles['postgres-logs__warning-card']}>
        <div>
          {logs.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className={styles['postgres-logs']}>
      <div className={styles['postgres-logs__header']}>
        <div className={styles['postgres-logs__title-row']}>
          <h3 className={styles['postgres-logs__title']}>Logs do PostgreSQL</h3>
          <Badge variant="secondary">{logs.length} linhas</Badge>
        </div>
        <div className={styles['postgres-logs__controls']}>
          <label className={styles['postgres-logs__auto-scroll']}>
            <Checkbox
              checked={autoScroll}
              onCheckedChange={(checked) => setAutoScroll(checked === true)}
            />
            Auto-scroll
          </label>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? styles['postgres-logs__loading-icon'] : undefined} />
            </Button>
          )}
        </div>
      </div>

      <Card className={styles['postgres-logs__viewer']}>
        <div className={styles['postgres-logs__terminal']}>
          {logs.map((line, index) => {
            const level = getLogLevel(line);
            const levelIcon = getLogLevelIcon(level);

            return (
              <div
                key={index}
                className={cx(
                  styles['postgres-logs__line'],
                  styles[`postgres-logs__line--${level}`]
                )}
              >
                {levelIcon && <span className={styles['postgres-logs__line-icon']}>{levelIcon}</span>}
                <span className={styles['postgres-logs__line-text']}>{line}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className={styles['postgres-logs__legend']}>
        <p>Mostrando as últimas {logs.length} linhas dos logs do PostgreSQL.</p>
        <p>
          <span className={styles['postgres-logs__legend-item--error']}>●</span> Erro |{' '}
          <span className={styles['postgres-logs__legend-item--warning']}>●</span> Aviso |{' '}
          <span className={styles['postgres-logs__legend-item--info']}>●</span> Info
        </p>
      </div>
    </div>
  );
}
