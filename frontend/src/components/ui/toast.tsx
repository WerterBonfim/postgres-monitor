import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cx } from '../../lib/cx';
import styles from './Toast.module.scss';

export interface ToastProps {
  id: string;
  title?: string;
  description: string;
  variant?: 'default' | 'destructive' | 'success' | 'info';
  onClose?: () => void;
}

export function Toast({ title, description, variant = 'default', onClose }: ToastProps) {
  const icons = {
    default: <Info size={20} />,
    destructive: <AlertCircle size={20} />,
    success: <CheckCircle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <div
      className={cx(
        styles.toast,
        variant !== 'default' && styles[`toast--${variant}`]
      )}
    >
      <div className={styles['toast__icon']}>{icons[variant]}</div>
      <div className={styles['toast__body']}>
        {title && <div className={styles['toast__title']}>{title}</div>}
        <div className={styles['toast__description']}>{description}</div>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className={styles['toast__close']}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
