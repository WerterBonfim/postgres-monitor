import * as React from 'react';
import { cx } from '../../lib/cx';
import styles from './Tooltip.module.scss';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ children, content, side = 'top', className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div
      className={styles.tooltip}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cx(
            styles['tooltip__content'],
            styles[`tooltip__content--${side}`],
            className
          )}
          role="tooltip"
        >
          {content}
          <div
            className={cx(styles['tooltip__arrow'], styles[`tooltip__arrow--${side}`])}
          />
        </div>
      )}
    </div>
  );
}
