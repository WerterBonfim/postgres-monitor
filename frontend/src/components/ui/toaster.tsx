import { useEffect, useState } from 'react';
import { Toast, type ToastProps } from './toast';
import { createPortal } from 'react-dom';
import styles from './Toast.module.scss';

export interface ToastData extends ToastProps {
  id: string;
  duration?: number;
}

let toastIdCounter = 0;
const toasts: ToastData[] = [];
const listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

export function toast(data: Omit<ToastData, 'id'>) {
  const id = `toast-${++toastIdCounter}`;
  const toastData: ToastData = {
    ...data,
    id,
    duration: data.duration ?? 5000,
  };

  toasts.push(toastData);
  notify();

  if (toastData.duration && toastData.duration > 0) {
    setTimeout(() => {
      dismiss(id);
    }, toastData.duration);
  }

  return id;
}

export function dismiss(id: string) {
  const index = toasts.findIndex((t) => t.id === id);
  if (index > -1) {
    toasts.splice(index, 1);
    notify();
  }
}

export function Toaster() {
  const [mounted, setMounted] = useState(false);
  const [toastList, setToastList] = useState<ToastData[]>([]);

  useEffect(() => {
    setMounted(true);
    const listener = () => {
      setToastList([...toasts]);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className={styles.toaster}>
      {toastList.map((toastData) => (
        <Toast
          key={toastData.id}
          {...toastData}
          onClose={() => dismiss(toastData.id)}
        />
      ))}
    </div>,
    document.body
  );
}
