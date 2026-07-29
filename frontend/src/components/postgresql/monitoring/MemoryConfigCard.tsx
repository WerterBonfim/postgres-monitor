import { Card } from '../../ui/card';
import { cx } from '../../../lib/cx';
import type { MemoryConfig } from '../../../types/postgresql';
import { formatBytes } from '../../../lib/utils';
import styles from './MemoryConfigCard.module.scss';

interface MemoryConfigCardProps {
  memoryConfig?: MemoryConfig;
}

export function MemoryConfigCard({ memoryConfig }: MemoryConfigCardProps) {
  if (!memoryConfig) {
    return (
      <Card padded className={styles['memory-config__empty']}>
        Configurações de memória não disponíveis
      </Card>
    );
  }

  return (
    <div className={styles['memory-config']}>
      <Card className={styles['memory-config__item']}>
        <h3 className={styles['memory-config__title']}>Shared Buffers</h3>
        <div className={styles['memory-config__value']}>{formatBytes(memoryConfig.sharedBuffers)}</div>
        <p className={styles['memory-config__description']}>
          Memória compartilhada para cache de dados
        </p>
      </Card>

      <Card className={styles['memory-config__item']}>
        <h3 className={styles['memory-config__title']}>Work Memory</h3>
        <div className={styles['memory-config__value']}>{formatBytes(memoryConfig.workMem)}</div>
        <p className={styles['memory-config__description']}>Por operação de ordenação/hash</p>
      </Card>

      <Card className={styles['memory-config__item']}>
        <h3 className={styles['memory-config__title']}>Maintenance Work Memory</h3>
        <div className={styles['memory-config__value']}>{formatBytes(memoryConfig.maintenanceWorkMem)}</div>
        <p className={styles['memory-config__description']}>Para operações de manutenção</p>
      </Card>

      <Card className={styles['memory-config__item']}>
        <h3 className={styles['memory-config__title']}>Effective Cache Size</h3>
        <div className={styles['memory-config__value']}>{formatBytes(memoryConfig.effectiveCacheSize)}</div>
        <p className={styles['memory-config__description']}>
          Estimativa de cache disponível no OS
        </p>
      </Card>

      <Card className={styles['memory-config__item']}>
        <h3 className={styles['memory-config__title']}>Max Connections</h3>
        <div className={styles['memory-config__value']}>{memoryConfig.maxConnections}</div>
        <p className={styles['memory-config__description']}>Conexões simultâneas máximas</p>
      </Card>

      <Card className={styles['memory-config__item']}>
        <h3 className={styles['memory-config__title']}>WAL Buffers</h3>
        <div className={styles['memory-config__value']}>{formatBytes(memoryConfig.walBuffers)}</div>
        <p className={styles['memory-config__description']}>Buffers para Write-Ahead Log</p>
      </Card>

      <Card className={cx(styles['memory-config__item'], styles['memory-config__item--highlight'])}>
        <h3 className={styles['memory-config__title']}>Memória Total Estimada</h3>
        <div className={cx(styles['memory-config__value'], styles['memory-config__value--large'])}>
          {formatBytes(memoryConfig.estimatedTotalMemory)}
        </div>
        <p className={styles['memory-config__description']}>
          Estimativa baseada nas configurações atuais
        </p>
      </Card>
    </div>
  );
}
