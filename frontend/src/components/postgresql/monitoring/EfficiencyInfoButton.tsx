import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { cx } from '../../../lib/cx';
import styles from './EfficiencyInfoButton.module.scss';

interface EfficiencyInfoButtonProps {
  type: 'cache-hit' | 'commit-rollback' | 'temp-files';
  value?: number;
  status?: 'good' | 'warning' | 'critical';
}

export function EfficiencyInfoButton({ type, value, status }: EfficiencyInfoButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getInfo = (): {
    title: string;
    description: string;
    impact: string;
    interpretation: {
      good: string;
      warning: string;
      critical: string;
    };
    actions: string[];
    tips: string[];
    reasons?: string[];
  } => {
    switch (type) {
      case 'cache-hit':
        return {
          title: 'Cache Hit Ratio Global',
          description: 'O Cache Hit Ratio mede a porcentagem de leituras que são atendidas diretamente do cache (shared_buffers) em vez do disco.',
          impact: 'Um cache hit ratio alto (>95%) indica que a maioria das leituras está sendo servida da memória, resultando em melhor performance. Valores baixos indicam muitas leituras do disco, o que é significativamente mais lento.',
          interpretation: {
            good: 'Excelente! O banco está usando eficientemente o cache em memória.',
            warning: 'Atenção: Algumas leituras estão indo para o disco. Considere aumentar shared_buffers.',
            critical: 'Crítico: Muitas leituras do disco. Performance pode estar comprometida.',
          },
          actions: [
            'Aumentar shared_buffers no postgresql.conf (recomendado: 25% da RAM total)',
            'Verificar se há queries fazendo full table scans desnecessários',
            'Analisar índices faltantes que possam estar causando leituras sequenciais',
            'Considerar aumentar effective_cache_size para ajudar o planejador de queries',
            'Monitorar pg_stat_statements para identificar queries com muitos buffer reads',
          ],
          tips: [
            'Valores acima de 95% são considerados excelentes',
            'Valores entre 90-95% são aceitáveis mas podem ser melhorados',
            'Valores abaixo de 90% indicam necessidade de otimização',
          ],
        };
      case 'commit-rollback':
        return {
          title: 'Ratio Commits/Rollbacks',
          description: 'Este ratio mede a proporção entre transações commitadas e transações que foram revertidas (rollback). Um valor alto indica muitas transações sendo revertidas.',
          impact: 'Muitos rollbacks podem indicar problemas de concorrência, deadlocks, erros na aplicação, ou transações muito longas que estão sendo canceladas. Isso pode impactar negativamente a performance e a integridade dos dados.',
          interpretation: {
            good: 'Excelente! A maioria das transações está sendo commitada com sucesso.',
            warning: 'Atenção: Há um número significativo de rollbacks. Investigar a causa.',
            critical: 'Crítico: Muitas transações estão sendo revertidas. Isso pode indicar problemas sérios.',
          },
          actions: [
            'Verificar logs do PostgreSQL para identificar padrões de rollback',
            'Analisar deadlocks e locks de longa duração usando pg_locks',
            'Revisar código da aplicação para identificar transações problemáticas',
            'Verificar se há timeouts de transação muito curtos',
            'Analisar pg_stat_database para ver estatísticas detalhadas de commits/rollbacks',
            'Considerar usar transações mais curtas e específicas',
            'Implementar retry logic na aplicação para transações que falham',
            'Verificar se há problemas de concorrência que causam deadlocks',
          ],
          tips: [
            'Um ratio acima de 95% (poucos rollbacks) é considerado excelente',
            'Valores entre 90-95% são aceitáveis mas devem ser monitorados',
            'Valores abaixo de 90% indicam necessidade de investigação imediata',
            'Rollbacks frequentes podem indicar problemas de design da aplicação',
            'Deadlocks são uma causa comum de rollbacks - verifique pg_stat_database.deadlocks',
          ],
          reasons: [
            'Deadlocks: Múltiplas transações tentando acessar os mesmos recursos em ordem diferente',
            'Timeouts: Transações que excedem o tempo máximo permitido',
            'Erros de validação: Aplicação detectando dados inválidos e revertendo',
            'Concorrência: Muitas transações simultâneas causando conflitos',
            'Transações muito longas: Operações que demoram muito e são canceladas',
            'Problemas de rede: Conexões perdidas durante transações',
          ],
        };
      case 'temp-files':
        return {
          title: 'Arquivos Temporários',
          description: 'Arquivos temporários são criados quando operações (como ordenações ou joins grandes) não cabem na memória (work_mem) e precisam usar o disco.',
          impact: 'Muitos arquivos temporários indicam que operações estão usando disco em vez de memória, o que é significativamente mais lento. Isso pode degradar a performance de queries complexas.',
          interpretation: {
            good: 'Excelente! Poucas ou nenhuma operação precisa usar arquivos temporários.',
            warning: 'Atenção: Algumas operações estão usando arquivos temporários. Considere aumentar work_mem.',
            critical: 'Crítico: Muitas operações estão usando arquivos temporários. Performance pode estar comprometida.',
          },
          actions: [
            'Aumentar work_mem no postgresql.conf (cuidado: é alocado por operação)',
            'Otimizar queries que estão gerando muitos arquivos temporários',
            'Adicionar índices apropriados para evitar ordenações grandes',
            'Considerar aumentar maintenance_work_mem para operações de manutenção',
            'Analisar queries específicas usando EXPLAIN ANALYZE para identificar operações problemáticas',
            'Verificar se há joins ou ordenações desnecessárias nas queries',
          ],
          tips: [
            'work_mem é alocado por operação, então aumentar muito pode consumir muita memória',
            'Valores típicos: 4MB a 64MB dependendo da carga e memória disponível',
            'Queries com ORDER BY ou GROUP BY grandes são as principais causas',
            'Índices podem eliminar a necessidade de ordenações em disco',
            'Monitorar pg_stat_statements para identificar queries problemáticas',
          ],
        };
    }
  };

  const info = getInfo();
  const statusText = status ? info.interpretation[status] : '';

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={styles['info-button__trigger']}
        onClick={() => setIsOpen(true)}
        title={`Informações sobre ${info.title}`}
      >
        <Info size={16} />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent size="xl">
          <Button
            variant="ghost"
            size="icon"
            className={styles['info-button__close']}
            onClick={() => setIsOpen(false)}
          >
            <X size={16} />
          </Button>
          <DialogHeader>
            <DialogTitle className={styles['info-button__title']}>
              <Info size={20} />
              {info.title}
            </DialogTitle>
            <DialogDescription>{info.description}</DialogDescription>
          </DialogHeader>

          <div className={styles['info-button__body']}>
            {value !== undefined && (
              <Alert
                variant={
                  status === 'good'
                    ? 'default'
                    : status === 'warning'
                    ? 'default'
                    : 'destructive'
                }
                className={cx(status && styles[`info-button__alert--${status}`])}
              >
                <AlertTitle className={styles['info-button__alert-title']}>
                  <span>Valor Atual</span>
                  <span className={styles['info-button__alert-value']}>
                    {type === 'temp-files' ? value.toLocaleString() : `${value.toFixed(2)}%`}
                  </span>
                </AlertTitle>
                {statusText && (
                  <AlertDescription>
                    <strong>Interpretação:</strong> {statusText}
                  </AlertDescription>
                )}
              </Alert>
            )}

            <div>
              <h4 className={styles['info-button__section-title']}>
                <span>📊</span> Impacto na Performance
              </h4>
              <p className={styles['info-button__section-text']}>{info.impact}</p>
            </div>

            {type === 'commit-rollback' && info.reasons && (
              <div>
                <h4 className={styles['info-button__section-title']}>
                  <span>🔍</span> Possíveis Motivos
                </h4>
                <ul className={styles['info-button__list']}>
                  {info.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className={styles['info-button__section-title']}>
                <span>💡</span> Dicas e Valores de Referência
              </h4>
              <ul className={styles['info-button__list']}>
                {info.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className={styles['info-button__section-title']}>
                <span>⚙️</span> Ações Recomendadas
              </h4>
              <ul className={styles['info-button__list']}>
                {info.actions.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
