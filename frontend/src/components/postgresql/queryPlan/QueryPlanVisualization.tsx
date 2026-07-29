import { useMemo, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Position,
  type Node,
  type Edge,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import type { QueryPlanResult } from '../../../types/postgresql';
import {
  transformQueryPlanToFlow,
  calculateTotalCost,
} from '../../../lib/queryPlanTransformer';
import { QueryPlanNode } from './QueryPlanNode';
import { QueryPlanEdge } from './QueryPlanEdge';
import styles from './QueryPlanVisualization.module.scss';

const nodeTypes = {
  queryPlanNode: QueryPlanNode,
};

const edgeTypes = {
  queryPlanEdge: QueryPlanEdge,
};

const nodeWidth = 300;
const nodeHeight = 200;

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

interface QueryPlanVisualizationInnerProps {
  planResult: QueryPlanResult;
  onNodeClick?: (nodeId: string, nodeData: unknown) => void;
}

function QueryPlanVisualizationInner({
  planResult,
  onNodeClick,
}: QueryPlanVisualizationInnerProps) {
  const { fitView } = useReactFlow();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const totalCost = calculateTotalCost(planResult.plan);
    return transformQueryPlanToFlow(planResult.plan, totalCost);
  }, [planResult.plan]);

  const { nodes, edges } = useMemo(() => {
    return getLayoutedElements(initialNodes, initialEdges);
  }, [initialNodes, initialEdges]);

  useEffect(() => {
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, 100);
  }, [nodes, fitView]);

  const onNodeClickHandler = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        onNodeClick(node.id, node.data);
      }
    },
    [onNodeClick]
  );

  const maxRowCount = useMemo(() => {
    return Math.max(
      ...edges.map((edge) => (edge.data as { rowCount?: number })?.rowCount ?? 0),
      1
    );
  }, [edges]);

  const normalizedEdges = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        maxRowCount,
      },
    }));
  }, [edges, maxRowCount]);

  return (
    <div className={styles['query-plan-visualization']}>
      <ReactFlow
        nodes={nodes}
        edges={normalizedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClickHandler}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as { costPercentage?: number };
            const percentage = data?.costPercentage ?? 0;
            if (percentage > 50) return 'hsl(0, 84%, 60%)';
            if (percentage > 20) return 'hsl(38, 92%, 50%)';
            return 'hsl(217, 91%, 60%)';
          }}
          maskColor="hsl(var(--muted) / 0.5)"
        />
      </ReactFlow>
    </div>
  );
}

interface QueryPlanVisualizationProps {
  planResult: QueryPlanResult;
  onNodeClick?: (nodeId: string, nodeData: unknown) => void;
}

export function QueryPlanVisualization({
  planResult,
  onNodeClick,
}: QueryPlanVisualizationProps) {
  return (
    <ReactFlowProvider>
      <QueryPlanVisualizationInner planResult={planResult} onNodeClick={onNodeClick} />
    </ReactFlowProvider>
  );
}
