import { useQuery } from '@tanstack/react-query';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { Database, Info, CheckCircle, XCircle, BookOpen, Code, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import type { IndexTypeInfo } from '../../../types/postgresql';
import { formatBytes } from '../../../lib/utils';
import { cx } from '../../../lib/cx';
import styles from './IndexTypesGuide.module.scss';

interface IndexTypesGuideProps {
  connectionId: string;
}

export function IndexTypesGuide({ connectionId }: IndexTypesGuideProps) {
  const { data: indexTypesInfo = [], isLoading, error } = useQuery<IndexTypeInfo[]>({
    queryKey: ['index-types-info', connectionId],
    queryFn: async () => [],
    enabled: false,
  });

  if (isLoading) {
    return (
      <div className={styles['index-types-guide__loading']}>
        <RefreshCw size={24} className={styles['index-types-guide__spin']} />
        <span>Carregando informações sobre tipos de índices...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle size={16} />
        <AlertDescription>
          Erro ao carregar informações sobre tipos de índices: {error instanceof Error ? error.message : 'Erro desconhecido'}
        </AlertDescription>
      </Alert>
    );
  }

  const usedTypes = indexTypesInfo.filter((it) => (it as IndexTypeInfo & { isUsed?: boolean }).isUsed);
  const unusedTypes = indexTypesInfo.filter((it) => !(it as IndexTypeInfo & { isUsed?: boolean }).isUsed);

  return (
    <div className={styles['index-types-guide']}>
      <Card className={styles['index-types-guide__summary']}>
        <div className={styles['index-types-guide__summary-header']}>
          <Database size={20} />
          <h3 className={styles['index-types-guide__summary-title']}>Resumo de Tipos de Índices</h3>
        </div>
        <div className={styles['index-types-guide__summary-grid']}>
          <div>
            <div className={styles['index-type-card__field-text']}>Total de Tipos</div>
            <div className={styles['index-types-guide__summary-value']}>{indexTypesInfo.length}</div>
          </div>
          <div>
            <div className={styles['index-type-card__field-text']}>Tipos em Uso</div>
            <div className={cx(styles['index-types-guide__summary-value'], styles['index-types-guide__summary-value--success'])}>
              {usedTypes.length}
            </div>
          </div>
          <div>
            <div className={styles['index-type-card__field-text']}>Tipos Não Utilizados</div>
            <div className={styles['index-types-guide__summary-value']}>{unusedTypes.length}</div>
          </div>
          <div>
            <div className={styles['index-type-card__field-text']}>Total Armazenado</div>
            <div className={styles['index-types-guide__summary-value']}>
              {formatBytes(usedTypes.reduce((sum, it) => sum + ((it as IndexTypeInfo & { totalSize?: number }).totalSize || 0), 0))}
            </div>
          </div>
        </div>
      </Card>

      {usedTypes.length > 0 && (
        <div>
          <h3 className={cx(styles['index-types-guide__section-title'], styles['index-types-guide__section-title--success'])}>
            <CheckCircle size={20} />
            Tipos de Índices em Uso ({usedTypes.length})
          </h3>
          <div className={styles['index-types-guide__cards']}>
            {usedTypes.map((indexType) => (
              <IndexTypeCard key={(indexType as IndexTypeInfo & { indexType?: string }).indexType || indexType.name} indexType={indexType} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className={styles['index-types-guide__section-title']}>
          <BookOpen size={20} />
          Guia Completo de Tipos de Índices
        </h3>
        <div className={styles['index-types-guide__cards']}>
          {indexTypesInfo.map((indexType) => (
            <IndexTypeCard key={(indexType as IndexTypeInfo & { indexType?: string }).indexType || indexType.name} indexType={indexType} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface IndexTypeCardProps {
  indexType: IndexTypeInfo;
}

function IndexTypeCard({ indexType }: IndexTypeCardProps) {
  const extended = indexType as IndexTypeInfo & {
    indexTypeName?: string;
    isUsed?: boolean;
    usageCount?: number;
    totalSize?: number;
    whenToUse?: string;
    example?: string;
  };

  return (
    <Card className={styles['index-type-card']}>
      <div className={styles['index-type-card__header']}>
        <div className={styles['index-type-card__title-row']}>
          <div className={styles['index-type-card__icon-wrap']}>
            <Database size={20} />
          </div>
          <div>
            <h4 className={styles['index-type-card__title']}>
              {extended.indexTypeName || indexType.name}
              {extended.isUsed ? (
                <Badge variant="success">
                  <CheckCircle size={12} />
                  Em Uso ({extended.usageCount || 0})
                </Badge>
              ) : (
                <Badge variant="outline">
                  <XCircle size={12} />
                  Não Utilizado
                </Badge>
              )}
            </h4>
            {extended.isUsed && (
              <div className={styles['index-type-card__meta']}>
                Tamanho total: {formatBytes(extended.totalSize || 0)} • {extended.usageCount || 0} índice(s)
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles['index-type-card__body']}>
        <div>
          <div className={styles['index-type-card__field-header']}>
            <Info size={16} />
            <span>Descrição</span>
          </div>
          <p className={styles['index-type-card__field-text']}>{indexType.description}</p>
        </div>

        <div>
          <div className={styles['index-type-card__field-header']}>
            <TrendingUp size={16} />
            <span>Quando Usar</span>
          </div>
          <p className={styles['index-type-card__field-text']}>
            {extended.whenToUse || indexType.useCases?.join(', ') || 'N/A'}
          </p>
        </div>

        <div className={styles['index-type-card__pros-cons']}>
          <div className={styles['index-type-card__pros']}>
            <div className={styles['index-type-card__pros-title']}>
              <CheckCircle size={16} />
              <span>Vantagens</span>
            </div>
            <p className={styles['index-type-card__pros-text']}>
              {Array.isArray(indexType.advantages) ? indexType.advantages.join(', ') : indexType.advantages || 'N/A'}
            </p>
          </div>
          <div className={styles['index-type-card__cons']}>
            <div className={styles['index-type-card__cons-title']}>
              <AlertTriangle size={16} />
              <span>Limitações</span>
            </div>
            <p className={styles['index-type-card__cons-text']}>
              {Array.isArray(indexType.disadvantages) ? indexType.disadvantages.join(', ') : indexType.disadvantages || 'N/A'}
            </p>
          </div>
        </div>

        <div>
          <div className={styles['index-type-card__field-header']}>
            <Code size={16} />
            <span>Exemplo de Uso</span>
          </div>
          <div className={styles['index-type-card__example']}>
            <code>{extended.example || 'N/A'}</code>
          </div>
        </div>
      </div>
    </Card>
  );
}
