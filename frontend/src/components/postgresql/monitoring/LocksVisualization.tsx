import { useState } from 'react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { AlertTriangle, Lock, Unlock, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';
import type { LockDetail, BlockingLock } from '../../../types/postgresql';
import styles from './LocksVisualization.module.scss';

interface LocksVisualizationProps {
  lockDetails: LockDetail[];
  blockingLocks: BlockingLock[];
}

export function LocksVisualization({ lockDetails, blockingLocks }: LocksVisualizationProps) {
  const [showLockInfo, setShowLockInfo] = useState(false);
  const waitingLocks = lockDetails.filter((l) => !l.granted);
  const grantedLocks = lockDetails.filter((l) => l.granted);

  const lockTypeInfo: Record<string, { description: string; impact: string }> = {
    relation: {
      description: 'Lock em tabelas, índices ou outras relações',
      impact: 'Bloqueia acesso a estruturas de dados específicas',
    },
    extend: {
      description: 'Lock de extensão de arquivo (quando uma tabela está crescendo)',
      impact: 'Normal durante operações de INSERT, geralmente não causa bloqueios',
    },
    page: {
      description: 'Lock em páginas individuais de uma tabela',
      impact: 'Raro, usado em operações de baixo nível',
    },
    tuple: {
      description: 'Lock em linhas individuais (row-level lock)',
      impact: 'Bloqueia apenas linhas específicas, permite concorrência',
    },
    transactionid: {
      description: 'Lock de transação (usado para controle de concorrência)',
      impact: 'Pode causar deadlocks se não gerenciado corretamente',
    },
    virtualxid: {
      description: 'Lock de ID de transação virtual',
      impact: 'Uso interno do PostgreSQL, geralmente não causa problemas',
    },
    object: {
      description: 'Lock em objetos do banco (schemas, databases, etc)',
      impact: 'Pode bloquear operações DDL em objetos específicos',
    },
    userlock: {
      description: 'Lock definido pelo usuário (advisory locks)',
      impact: 'Usado para sincronização customizada entre aplicações',
    },
    advisory: {
      description: 'Lock consultivo (advisory lock)',
      impact: 'Usado para sincronização entre processos de aplicação',
    },
  };

  const lockModeInfo: Record<string, { description: string; compatibility: string }> = {
    AccessShareLock: {
      description: 'Lock compartilhado para leitura (SELECT)',
      compatibility: 'Compatível com todos os outros locks, exceto AccessExclusiveLock',
    },
    RowShareLock: {
      description: 'Lock compartilhado em nível de linha (SELECT FOR UPDATE)',
      compatibility: 'Compatível com AccessShareLock e RowShareLock',
    },
    RowExclusiveLock: {
      description: 'Lock exclusivo em nível de linha (INSERT, UPDATE, DELETE)',
      compatibility: 'Compatível com AccessShareLock, mas não com outros RowExclusiveLock',
    },
    ShareUpdateExclusiveLock: {
      description: 'Lock para operações VACUUM, CREATE INDEX CONCURRENTLY',
      compatibility: 'Compatível apenas com AccessShareLock',
    },
    ShareLock: {
      description: 'Lock compartilhado (CREATE INDEX sem CONCURRENTLY)',
      compatibility: 'Compatível apenas com AccessShareLock',
    },
    ShareRowExclusiveLock: {
      description: 'Lock compartilhado exclusivo (CREATE UNIQUE INDEX)',
      compatibility: 'Compatível apenas com AccessShareLock',
    },
    ExclusiveLock: {
      description: 'Lock exclusivo (ALTER TABLE, algumas operações DDL)',
      compatibility: 'Compatível apenas com AccessShareLock',
    },
    AccessExclusiveLock: {
      description: 'Lock exclusivo de acesso (DROP TABLE, TRUNCATE, ALTER TABLE)',
      compatibility: 'Não compatível com nenhum outro lock',
    },
  };

  const getLockTypeDescription = (lockType: string): string =>
    lockTypeInfo[lockType.toLowerCase()]?.description || 'Tipo de lock desconhecido';

  const getLockTypeImpact = (lockType: string): string =>
    lockTypeInfo[lockType.toLowerCase()]?.impact || '';

  const getLockModeDescription = (mode: string): string =>
    lockModeInfo[mode]?.description || 'Modo de lock padrão';

  const locksByTypeDetailed = lockDetails.reduce(
    (acc, lock) => {
      if (!acc[lock.lockType]) {
        acc[lock.lockType] = {
          count: 0,
          granted: 0,
          waiting: 0,
          modes: new Set<string>(),
        };
      }
      acc[lock.lockType].count++;
      if (lock.granted) {
        acc[lock.lockType].granted++;
      } else {
        acc[lock.lockType].waiting++;
      }
      acc[lock.lockType].modes.add(lock.mode);
      return acc;
    },
    {} as Record<string, { count: number; granted: number; waiting: number; modes: Set<string> }>
  );

  return (
    <div className={styles['locks-visualization']}>
      <Card className={styles['locks-visualization__info-panel']}>
        <div className={styles['locks-visualization__info-row']}>
          <Info size={20} />
          <div className={styles['locks-visualization__info-content']}>
            <h4>Sobre Locks do PostgreSQL</h4>
            <p>
              <strong>Locks</strong> são mecanismos de controle de concorrência que garantem a consistência dos dados.
              O PostgreSQL usa diferentes tipos e modos de locks para gerenciar o acesso simultâneo aos dados.
            </p>
            <p>
              <strong>Tipos de Locks:</strong> Definem o que está sendo bloqueado (tabela, linha, transação, etc.)
            </p>
            <p>
              <strong>Modos de Locks:</strong> Definem o nível de acesso permitido (leitura, escrita, exclusivo, etc.)
            </p>
            <Button variant="outline" size="sm" onClick={() => setShowLockInfo(true)}>
              <Info size={16} />
              Ver detalhes sobre tipos e modos de locks
            </Button>
            <Dialog open={showLockInfo} onOpenChange={setShowLockInfo}>
              <DialogContent size="xl">
                <DialogHeader>
                  <DialogTitle>Tipos e Modos de Locks do PostgreSQL</DialogTitle>
                  <DialogDescription>
                    Informações detalhadas sobre os locks do PostgreSQL
                  </DialogDescription>
                </DialogHeader>
                <div className={styles['locks-visualization__dialog-list']}>
                  <div>
                    <h3 className={styles['locks-visualization__dialog-section-title']}>Tipos de Locks</h3>
                    <div className={styles['locks-visualization__dialog-items']}>
                      {Object.entries(lockTypeInfo).map(([type, info]) => (
                        <div key={type} className={styles['locks-visualization__dialog-item']}>
                          <div className={styles['locks-visualization__dialog-item-title']}>{type}</div>
                          <div className={styles['locks-visualization__dialog-item-text']}>{info.description}</div>
                          <div className={styles['locks-visualization__dialog-item-text']}>
                            <strong>Impacto:</strong> {info.impact}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className={styles['locks-visualization__dialog-section-title']}>Modos de Locks</h3>
                    <div className={styles['locks-visualization__dialog-items']}>
                      {Object.entries(lockModeInfo).map(([mode, info]) => (
                        <div key={mode} className={styles['locks-visualization__dialog-item']}>
                          <div className={styles['locks-visualization__dialog-item-title']}>{mode}</div>
                          <div className={styles['locks-visualization__dialog-item-text']}>{info.description}</div>
                          <div className={styles['locks-visualization__dialog-item-text']}>
                            <strong>Compatibilidade:</strong> {info.compatibility}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>

      {blockingLocks.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle size={16} />
          <AlertDescription>
            <strong>{blockingLocks.length} bloqueio(s) detectado(s)</strong> - Algumas queries estão
            esperando por locks.
          </AlertDescription>
        </Alert>
      )}

      <div className={styles['locks-visualization__grid']}>
        <Card className={styles['locks-visualization__panel']}>
          <h3 className={styles['locks-visualization__panel-title']}>
            <Lock size={16} />
            Locks Esperando ({waitingLocks.length})
          </h3>
          {waitingLocks.length === 0 ? (
            <p className={styles['locks-visualization__empty-text']}>Nenhum lock esperando</p>
          ) : (
            <div className={styles['locks-visualization__lock-list']}>
              {waitingLocks.slice(0, 10).map((lock, idx) => (
                <div key={idx} className={styles['locks-visualization__lock-item']}>
                  <div className={styles['locks-visualization__lock-header']}>
                    <span>PID {lock.pid}</span>
                    <Badge variant="destructive">Esperando</Badge>
                  </div>
                  <div className={styles['locks-visualization__lock-meta']}>
                    <div className={styles['locks-visualization__lock-meta-row']}>
                      <span>Tipo:</span>
                      <Badge variant="outline">{lock.lockType}</Badge>
                    </div>
                    {lock.relation && <div>Tabela: {lock.relation}</div>}
                    <div>
                      Modo: {lock.mode}
                      <div>{getLockModeDescription(lock.mode)}</div>
                    </div>
                    {lock.waitStart && (
                      <div>
                        Esperando desde: {new Date(lock.waitStart).toLocaleString('pt-BR')}
                      </div>
                    )}
                    {lock.query && (
                      <div>
                        <div>Query:</div>
                        <div className={styles['locks-visualization__lock-query']}>
                          {lock.query.substring(0, 100)}
                          {lock.query.length > 100 && '...'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={styles['locks-visualization__panel']}>
          <h3 className={styles['locks-visualization__panel-title']}>
            <Unlock size={16} />
            Locks Concedidos ({grantedLocks.length})
          </h3>
          <div className={styles['locks-visualization__lock-list']}>
            {Object.entries(locksByTypeDetailed).map(([type, details]) => (
              <div key={type} className={styles['locks-visualization__lock-item']}>
                <div className={styles['locks-visualization__lock-header']}>
                  <span>{type}</span>
                  <Badge variant="secondary">{details.count} total</Badge>
                </div>
                <div className={styles['locks-visualization__lock-meta']}>
                  <div className={styles['locks-visualization__lock-meta-row']}>
                    <Badge variant="outline">{details.granted} concedidos</Badge>
                    {details.waiting > 0 && (
                      <Badge variant="destructive">{details.waiting} esperando</Badge>
                    )}
                  </div>
                  <div className={styles['locks-visualization__type-summary']}>
                    <div>Descrição: {getLockTypeDescription(type)}</div>
                    {getLockTypeImpact(type) && <div>Impacto: {getLockTypeImpact(type)}</div>}
                  </div>
                  {details.modes.size > 0 && (
                    <div>
                      <div>Modos utilizados:</div>
                      <div className={styles['locks-visualization__modes']}>
                        {Array.from(details.modes).map((mode) => (
                          <Badge key={mode} variant="outline">
                            {mode}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {blockingLocks.length > 0 && (
        <Card className={styles['locks-visualization__blocking-card']}>
          <h3 className={styles['locks-visualization__panel-title']}>Relação de Bloqueios</h3>
          <div className={styles['locks-visualization__lock-list']}>
            {blockingLocks.map((block, idx) => (
              <div key={idx} className={styles['locks-visualization__blocking-item']}>
                <div className={styles['locks-visualization__blocking-header']}>
                  <AlertTriangle size={16} />
                  <span>Bloqueio Detectado</span>
                </div>
                <div className={styles['locks-visualization__blocking-grid']}>
                  <div>
                    <div className={styles['locks-visualization__blocked-label']}>
                      Bloqueado (PID {block.blockedPid})
                    </div>
                    <div className={styles['locks-visualization__blocking-meta']}>
                      <div>Usuário: {block.blockedUser}</div>
                      {block.blockedQuery && (
                        <div>
                          Query: {block.blockedQuery.substring(0, 80)}...
                        </div>
                      )}
                      {block.blockedDuration && <div>Esperando há: {block.blockedDuration}</div>}
                    </div>
                  </div>
                  <div>
                    <div className={styles['locks-visualization__blocking-label']}>
                      Bloqueador (PID {block.blockingPid})
                    </div>
                    <div className={styles['locks-visualization__blocking-meta']}>
                      <div>Usuário: {block.blockingUser}</div>
                      {block.blockingQuery && (
                        <div>
                          Query: {block.blockingQuery.substring(0, 80)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {block.relation && (
                  <div className={styles['locks-visualization__blocking-meta']}>
                    Tabela: {block.relation} | Modo bloqueado: {block.blockedMode} | Modo
                    bloqueador: {block.blockingMode}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
