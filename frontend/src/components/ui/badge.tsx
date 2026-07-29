import * as React from 'react';
import { cx } from '../../lib/cx';
import styles from './Badge.module.scss';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'danger';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cx(styles.badge, styles[`badge--${variant}`], className)}
      {...props}
    />
  );
}

export { Badge };
