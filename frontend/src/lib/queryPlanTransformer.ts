import type { Node, Edge } from 'reactflow';
import type { QueryPlanNode } from '../types/postgresql';

export interface QueryPlanNodeData {
  nodeType: string;
  relationName?: string;
  alias?: string;
  cost: { startup: number; total: number };
  actualTime?: { first: number; total: number };
  rows: { estimated: number; actual?: number };
  width?: number;
  buffers?: { sharedHit: number; sharedRead: number };
  costPercentage: number;
  totalCost: number;
}

export function calculateTotalCost(node: QueryPlanNode): number {
  let total = node.cost.total;
  for (const child of node.children) {
    total = Math.max(total, calculateTotalCost(child));
  }
  return total;
}

export function transformQueryPlanToFlow(
  plan: QueryPlanNode,
  totalCost: number
): { nodes: Node<QueryPlanNodeData>[]; edges: Edge[] } {
  const nodes: Node<QueryPlanNodeData>[] = [];
  const edges: Edge[] = [];
  let nodeIdCounter = 0;

  function traverseNode(
    node: QueryPlanNode,
    parentId: string | null = null,
    depth: number = 0
  ): string {
    const nodeId = `node-${nodeIdCounter++}`;
    const nodeCost = node.cost.total;
    const costPercentage = totalCost > 0 ? (nodeCost / totalCost) * 100 : 0;

    const nodeData: QueryPlanNodeData = {
      nodeType: node.nodeType,
      relationName: node.relationName,
      alias: node.alias,
      cost: node.cost,
      actualTime: node.actualTime,
      rows: node.rows,
      width: node.width,
      buffers: node.buffers,
      costPercentage,
      totalCost: nodeCost,
    };

    nodes.push({
      id: nodeId,
      type: 'queryPlanNode',
      data: nodeData,
      position: { x: 0, y: 0 }, // Será calculado pelo Dagre
    });

    // Criar edge do pai para este nó
    if (parentId !== null) {
      const rowCount = node.rows.actual ?? node.rows.estimated;
      edges.push({
        id: `edge-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: 'queryPlanEdge',
        data: {
          rowCount,
        },
      });
    }

    // Processar filhos recursivamente
    for (const child of node.children) {
      traverseNode(child, nodeId, depth + 1);
    }

    return nodeId;
  }

  traverseNode(plan);

  return { nodes, edges };
}
