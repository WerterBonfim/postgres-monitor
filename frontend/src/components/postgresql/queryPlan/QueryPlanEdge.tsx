import { memo } from 'react';
import { BaseEdge, type EdgeProps, getBezierPath } from 'reactflow';

export interface QueryPlanEdgeData {
  rowCount: number;
  maxRowCount?: number;
}

function calculateStrokeWidth(rowCount: number, maxRowCount: number): number {
  if (maxRowCount === 0) return 2;
  const ratio = rowCount / maxRowCount;
  // Espessura entre 1.5px e 6px baseada no volume de dados
  return 1.5 + ratio * 4.5;
}

function calculateOpacity(rowCount: number, maxRowCount: number): number {
  if (maxRowCount === 0) return 0.6;
  const ratio = rowCount / maxRowCount;
  // Opacidade entre 0.4 e 1.0 baseada no volume
  return 0.4 + ratio * 0.6;
}

function getEdgeColor(rowCount: number, maxRowCount: number): string {
  if (maxRowCount === 0) return 'hsl(var(--muted-foreground))';
  const ratio = rowCount / maxRowCount;
  
  // Gradiente de cor: azul claro (poucos dados) -> laranja (muitos dados)
  if (ratio < 0.3) {
    return 'hsl(217, 91%, 60%)'; // Azul claro
  } else if (ratio < 0.7) {
    return 'hsl(38, 92%, 50%)'; // Amarelo/laranja
  } else {
    return 'hsl(0, 84%, 60%)'; // Vermelho (muitos dados)
  }
}

export const QueryPlanEdge = memo(function QueryPlanEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<QueryPlanEdgeData>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const rowCount = data?.rowCount ?? 0;
  const maxRowCount = data?.maxRowCount ?? (rowCount || 1);
  
  const strokeWidth = calculateStrokeWidth(rowCount, maxRowCount);
  const opacity = calculateOpacity(rowCount, maxRowCount);
  const strokeColor = getEdgeColor(rowCount, maxRowCount);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth,
          stroke: strokeColor,
          opacity,
          transition: 'stroke-width 0.3s ease, opacity 0.3s ease',
        }}
      />
    </>
  );
});
