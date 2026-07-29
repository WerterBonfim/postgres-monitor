import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { RefreshCw, X } from 'lucide-react';
import { getBackendLogs } from '../services/backendApi';
import styles from './BackendLogsModal.module.scss';

interface BackendLogsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackendLogsModal({ open, onOpenChange }: BackendLogsModalProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedLogs = await getBackendLogs(200);
      if (Array.isArray(fetchedLogs)) {
        setLogs(fetchedLogs);
      } else {
        setError('Formato de resposta inválido');
        setLogs([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'Erro desconhecido ao carregar logs';
      setError(errorMessage);
      setLogs([]);
      console.error('Erro ao buscar logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className={styles['logs-modal__content']}>
        <DialogHeader>
          <DialogTitle>Logs do Backend</DialogTitle>
          <DialogDescription>
            Visualize os logs recentes do servidor backend
          </DialogDescription>
        </DialogHeader>

        <div className={styles['logs-modal__body']}>
          {isLoading && logs.length === 0 ? (
            <div className={styles['logs-modal__loading']}>
              <div className={styles['logs-modal__loading-text']}>Carregando logs...</div>
            </div>
          ) : error ? (
            <div className={styles['logs-modal__error-wrap']}>
              <div className={styles['logs-modal__error']}>
                <p className={styles['logs-modal__error-title']}>Erro ao carregar logs</p>
                <p className={styles['logs-modal__error-message']}>{error}</p>
              </div>
            </div>
          ) : (
            <div className={styles['logs-modal__logs-wrap']}>
              <pre className={styles['logs-modal__logs']}>
                {logs.length === 0 ? (
                  <span className={styles['logs-modal__empty']}>Nenhum log disponível</span>
                ) : (
                  logs.join('\n')
                )}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter className={styles['logs-modal__footer']}>
          <div className={styles['logs-modal__count']}>
            {logs.length > 0 && `${logs.length} linhas de log`}
          </div>
          <div className={styles['logs-modal__actions']}>
            <Button
              variant="outline"
              onClick={fetchLogs}
              disabled={isLoading}
            >
              <RefreshCw
                size={16}
                className={isLoading ? styles['logs-modal__icon--spinning'] : styles['logs-modal__icon']}
              />
              Atualizar
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X size={16} className={styles['logs-modal__icon']} />
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
