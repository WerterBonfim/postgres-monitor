import * as React from 'react';
import { cx } from '../../lib/cx';
import styles from './Dialog.module.scss';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  size?: 'default' | 'lg' | 'xl' | 'full';
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className={styles['dialog__overlay-root']} onClick={() => onOpenChange(false)}>
      <div className={styles['dialog__backdrop']} onClick={() => onOpenChange(false)} />
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function DialogContent({
  className,
  children,
  size = 'default',
  ...props
}: DialogContentProps) {
  return (
    <div
      className={cx(
        styles['dialog__content'],
        size !== 'default' && styles[`dialog__content--${size}`],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return <div className={cx(styles['dialog__header'], className)} {...props} />;
}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return <h2 className={cx(styles['dialog__title'], className)} {...props} />;
}

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return <p className={cx(styles['dialog__description'], className)} {...props} />;
}

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return <div className={cx(styles['dialog__footer'], className)} {...props} />;
}
