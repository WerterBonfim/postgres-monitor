import { Badge } from '../../ui/badge';
import { cx } from '../../../lib/cx';
import styles from './StatusBadge.module.scss';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    unused: { label: 'Não Utilizado', variant: 'destructive' },
    low_usage: { label: 'Baixo Uso', variant: 'outline' },
    normal: { label: 'Normal', variant: 'secondary' },
    high_usage: { label: 'Alto Uso', variant: 'default' },
  };

  const config = statusConfig[status] || { label: status, variant: 'default' };

  return (
    <Badge variant={config.variant} className={cx(styles['status-badge'], className)}>
      {config.label}
    </Badge>
  );
}
