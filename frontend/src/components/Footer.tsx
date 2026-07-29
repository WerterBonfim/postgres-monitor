import { useState } from 'react';
import { Button } from './ui/button';
import { FileText } from 'lucide-react';
import { BackendLogsModal } from './BackendLogsModal';
import styles from './Footer.module.scss';

export function Footer() {
  const [logsModalOpen, setLogsModalOpen] = useState(false);

  return (
    <>
      <footer className={styles.footer}>
        <div className={styles['footer__inner']}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLogsModalOpen(true)}
          >
            <FileText size={16} className={styles['footer__icon']} />
            Ver Logs
          </Button>
        </div>
      </footer>
      <BackendLogsModal open={logsModalOpen} onOpenChange={setLogsModalOpen} />
    </>
  );
}
