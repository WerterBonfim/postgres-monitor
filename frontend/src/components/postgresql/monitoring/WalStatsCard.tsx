import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { WalStats } from '../../../types/postgresql';
import { formatBytes } from '../../../lib/utils';
import styles from './WalStatsCard.module.scss';

interface WalStatsCardProps {
  walStats?: WalStats;
}

export function WalStatsCard({ walStats }: WalStatsCardProps) {
  if (!walStats) {
    return (
      <Card padded className={styles['wal-stats__empty']}>
        Estatísticas WAL não disponíveis
      </Card>
    );
  }

  return (
    <div className={styles['wal-stats']}>
      <Card className={styles['wal-stats__item']}>
        <h3 className={styles['wal-stats__title']}>Tamanho Total do WAL</h3>
        <div className={styles['wal-stats__value']}>{formatBytes(walStats.totalWalSize)}</div>
      </Card>

      <Card className={styles['wal-stats__item']}>
        <h3 className={styles['wal-stats__title']}>Checkpoints</h3>
        <div className={styles['wal-stats__rows']}>
          <div className={styles['wal-stats__row']}>
            <span className={styles['wal-stats__label']}>Agendados:</span>
            <Badge variant="secondary">{walStats.checkpointTimed}</Badge>
          </div>
          <div className={styles['wal-stats__row']}>
            <span className={styles['wal-stats__label']}>Solicitados:</span>
            <Badge variant="secondary">{walStats.checkpointReq}</Badge>
          </div>
        </div>
      </Card>

      <Card className={styles['wal-stats__item']}>
        <h3 className={styles['wal-stats__title']}>Tempo de Checkpoint</h3>
        <div className={styles['wal-stats__rows']}>
          <div className={styles['wal-stats__row']}>
            <span className={styles['wal-stats__label']}>Escrita:</span>
            <span className={styles['wal-stats__text']}>{walStats.checkpointWriteTime.toFixed(2)} ms</span>
          </div>
          <div className={styles['wal-stats__row']}>
            <span className={styles['wal-stats__label']}>Sincronização:</span>
            <span className={styles['wal-stats__text']}>{walStats.checkpointSyncTime.toFixed(2)} ms</span>
          </div>
        </div>
      </Card>

      {walStats.walLevel && (
        <Card className={styles['wal-stats__item']}>
          <h3 className={styles['wal-stats__title']}>Configurações WAL</h3>
          <div className={styles['wal-stats__rows']}>
            <div className={styles['wal-stats__row']}>
              <span className={styles['wal-stats__label']}>Nível:</span>
              <Badge variant="outline">{walStats.walLevel}</Badge>
            </div>
            {walStats.walCompression !== undefined && (
              <div className={styles['wal-stats__row']}>
                <span className={styles['wal-stats__label']}>Compressão:</span>
                <Badge variant={walStats.walCompression ? 'default' : 'secondary'}>
                  {walStats.walCompression ? 'Ativada' : 'Desativada'}
                </Badge>
              </div>
            )}
            {walStats.maxWalSize && (
              <div className={styles['wal-stats__row']}>
                <span className={styles['wal-stats__label']}>Tamanho Máx:</span>
                <span className={styles['wal-stats__text']}>{formatBytes(walStats.maxWalSize)}</span>
              </div>
            )}
            {walStats.minWalSize && (
              <div className={styles['wal-stats__row']}>
                <span className={styles['wal-stats__label']}>Tamanho Mín:</span>
                <span className={styles['wal-stats__text']}>{formatBytes(walStats.minWalSize)}</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
