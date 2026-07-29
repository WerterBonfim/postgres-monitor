import { Card } from '../../ui/card';
import { cx } from '../../../lib/cx';
import type { LucideProps } from 'lucide-react';
import { DashboardInfoButton } from './DashboardInfoButton';
import styles from './MetricCard.module.scss';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ComponentType<LucideProps>;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  trend?: {
    value: number;
    label: string;
  };
  infoType?: 'active-connections' | 'slow-queries' | 'unused-indexes' | 'total-indexes' | 'recommendations' | 'tables-problems' | 'avg-cache-hit';
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  variant = 'default',
  trend,
  infoType,
}: MetricCardProps) {
  const getStatus = (): 'good' | 'warning' | 'critical' => {
    if (variant === 'success') return 'good';
    if (variant === 'warning') return 'warning';
    if (variant === 'destructive') return 'critical';
    return 'good';
  };

  return (
    <Card className={cx(styles['metric-card'], styles[`metric-card--${variant}`])}>
      <div className={styles['metric-card__body']}>
        <div className={styles['metric-card__content']}>
          <div className={styles['metric-card__header']}>
            {Icon && <Icon size={16} className={styles['metric-card__icon']} />}
            <h3 className={styles['metric-card__title']}>{title}</h3>
            {infoType && (
              <DashboardInfoButton
                type={infoType}
                value={typeof value === 'number' ? value : undefined}
                status={getStatus()}
              />
            )}
          </div>
          <div className={styles['metric-card__value']}>{value}</div>
          {description && (
            <p className={styles['metric-card__description']}>{description}</p>
          )}
          {trend && (
            <div
              className={cx(
                styles['metric-card__trend'],
                trend.value > 0 ? styles['metric-card__trend--up'] : styles['metric-card__trend--down']
              )}
            >
              {trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
