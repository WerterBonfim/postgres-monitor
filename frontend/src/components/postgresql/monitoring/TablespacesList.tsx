import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { Tablespace } from '../../../types/postgresql';
import { formatBytes } from '../../../lib/utils';
import styles from './TablespacesList.module.scss';

interface TablespacesListProps {
  tablespaces: Tablespace[];
}

export function TablespacesList({ tablespaces }: TablespacesListProps) {
  if (tablespaces.length === 0) {
    return (
      <Card padded className={styles['tablespaces-list__empty']}>
        Nenhum tablespace customizado encontrado (apenas pg_default e pg_global).
      </Card>
    );
  }

  return (
    <Card className={styles['tablespaces-list']}>
      <h3 className={styles['tablespaces-list__title']}>Tablespaces</h3>
      <div className={styles['tablespaces-list__items']}>
        {tablespaces.map((tablespace, idx) => (
          <div key={idx} className={styles['tablespaces-list__item']}>
            <div className={styles['tablespaces-list__item-header']}>
              <span className={styles['tablespaces-list__name']}>{tablespace.name}</span>
              <Badge variant="outline">{formatBytes(tablespace.size)}</Badge>
            </div>
            {tablespace.location && (
              <div className={styles['tablespaces-list__location']}>
                <code>{tablespace.location}</code>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
