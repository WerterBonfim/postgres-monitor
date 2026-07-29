import { Card } from '../../ui/card';
import { cx } from '../../../lib/cx';
import { EfficiencyInfoButton } from './EfficiencyInfoButton';
import styles from './EfficiencyGauge.module.scss';

interface EfficiencyGaugeProps {
  value: number;
  label: string;
  unit?: string;
  thresholds?: {
    good: number;
    warning: number;
  };
  infoType?: 'cache-hit' | 'commit-rollback' | 'temp-files';
}

export function EfficiencyGauge({
  value,
  label,
  unit = '%',
  thresholds = { good: 95, warning: 90 },
  infoType,
}: EfficiencyGaugeProps) {
  const percentage = Math.min(100, Math.max(0, value));
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percentage / 100) * circumference;

  const getStatus = (): 'good' | 'warning' | 'critical' => {
    if (percentage >= thresholds.good) return 'good';
    if (percentage >= thresholds.warning) return 'warning';
    return 'critical';
  };

  const status = getStatus();

  return (
    <Card className={styles['efficiency-gauge']}>
      <div className={styles['efficiency-gauge__inner']}>
        <div className={styles['efficiency-gauge__header']}>
          <h3 className={styles['efficiency-gauge__label']}>{label}</h3>
          {infoType && (
            <EfficiencyInfoButton type={infoType} value={value} status={status} />
          )}
        </div>
        <div className={styles['efficiency-gauge__chart-wrap']}>
          <svg className={styles['efficiency-gauge__svg']}>
            <circle
              cx="50%"
              cy="50%"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className={cx(styles['efficiency-gauge__track'], styles[`efficiency-gauge__track--${status}`])}
            />
            <circle
              cx="50%"
              cy="50%"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={cx(styles['efficiency-gauge__progress'], styles[`efficiency-gauge__progress--${status}`])}
            />
          </svg>
          <div className={styles['efficiency-gauge__center']}>
            <div>
              <div className={cx(styles['efficiency-gauge__value'], styles[`efficiency-gauge__value--${status}`])}>
                {value.toFixed(1)}
              </div>
              <div className={styles['efficiency-gauge__unit']}>{unit}</div>
            </div>
          </div>
        </div>
        <div className={cx(styles['efficiency-gauge__status'], styles[`efficiency-gauge__status--${status}`])}>
          {percentage >= thresholds.good
            ? 'Eficiência Excelente'
            : percentage >= thresholds.warning
            ? 'Atenção Necessária'
            : 'Requer Ação'}
        </div>
      </div>
    </Card>
  );
}
