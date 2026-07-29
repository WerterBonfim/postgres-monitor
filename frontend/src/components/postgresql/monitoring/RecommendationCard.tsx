import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Copy, Lightbulb, Trash2, Database } from 'lucide-react';
import { toast } from '../../ui/toaster';
import type { IndexRecommendation } from '../../../types/postgresql';
import styles from './RecommendationCard.module.scss';

interface RecommendationCardProps {
  recommendation: IndexRecommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const getIcon = () => {
    switch (recommendation.recommendationType) {
      case 'create_index':
        return Database;
      case 'remove_index':
        return Trash2;
      case 'analyze_table':
        return Lightbulb;
      default:
        return Lightbulb;
    }
  };

  const getImpactVariant = (): 'destructive' | 'default' | 'secondary' => {
    switch (recommendation.expectedImpact) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(recommendation.sqlScript);
    toast({
      title: 'SQL Copiado',
      description: 'O script SQL foi copiado para a área de transferência',
      variant: 'success',
    });
  };

  const Icon = getIcon();

  return (
    <Card className={styles['recommendation-card']}>
      <div className={styles['recommendation-card__header']}>
        <div className={styles['recommendation-card__title-row']}>
          <Icon size={20} className={styles['recommendation-card__icon']} />
          <div>
            <h4 className={styles['recommendation-card__title']}>
              {recommendation.schemaName}.{recommendation.tableName}
              {recommendation.columnName && (
                <span className={styles['recommendation-card__column']}>
                  .{recommendation.columnName}
                </span>
              )}
            </h4>
            <p className={styles['recommendation-card__reason']}>{recommendation.reason}</p>
          </div>
        </div>
        <Badge variant={getImpactVariant()}>
          Impacto {recommendation.expectedImpact === 'high' ? 'Alto' : recommendation.expectedImpact === 'medium' ? 'Médio' : 'Baixo'}
        </Badge>
      </div>

      <div className={styles['recommendation-card__sql-block']}>
        <div className={styles['recommendation-card__sql-header']}>
          <span className={styles['recommendation-card__sql-label']}>SQL Sugerido:</span>
          <Button variant="ghost" size="sm" onClick={handleCopySQL}>
            <Copy size={12} />
            Copiar
          </Button>
        </div>
        <pre className={styles['recommendation-card__sql-code']}>
          {recommendation.sqlScript}
        </pre>
      </div>
    </Card>
  );
}
