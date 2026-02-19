// Automation Dependency Graph - Task 44
// Map which automations depend on others to prevent loops

export interface AutomationNode {
  id: string;
  name: string;
  type: "workflow" | "rule" | "trigger" | "action";
  dependencies: string[]; // IDs of automations this depends on
  dependents: string[]; // IDs of automations that depend on this
  metadata?: Record<string, any>;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: "triggers" | "depends_on" | "chains_to";
  condition?: string; // Optional condition for the dependency
}

export interface DependencyGraph {
  nodes: Map<string, AutomationNode>;
  edges: DependencyEdge[];
  cycles: string[][]; // Detected cycles
  topologicalOrder: string[]; // Valid execution order
}

/**
 * Automation Dependency Graph Manager
 */
export class AutomationDependencyGraph {
  private graph: DependencyGraph = {
    nodes: new Map(),
    edges: [],
    cycles: [],
    topologicalOrder: [],
  };

  /**
   * Add automation node
   */
  addNode(node: AutomationNode): void {
    this.graph.nodes.set(node.id, node);
    this.recalculateGraph();
  }

  /**
   * Remove automation node
   */
  removeNode(nodeId: string): void {
    this.graph.nodes.delete(nodeId);
    // Remove edges involving this node
    this.graph.edges = this.graph.edges.filter(
      e => e.from !== nodeId && e.to !== nodeId
    );
    this.recalculateGraph();
  }

  /**
   * Add dependency edge
   */
  addEdge(edge: DependencyEdge): boolean {
    // Check for immediate circular dependency
    if (edge.from === edge.to) {
      console.warn(`[Dependency Graph] Self-dependency detected: ${edge.from}`);
      return false;
    }

    // Check if edge already exists
    const exists = this.graph.edges.some(
      e => e.from === edge.from && e.to === edge.to && e.type === edge.type
    );
    if (exists) {
      return false;
    }

    this.graph.edges.push(edge);
    
    // Update node dependencies
    const fromNode = this.graph.nodes.get(edge.from);
    const toNode = this.graph.nodes.get(edge.to);
    
    if (fromNode && !fromNode.dependents.includes(edge.to)) {
      fromNode.dependents.push(edge.to);
    }
    if (toNode && !toNode.dependencies.includes(edge.from)) {
      toNode.dependencies.push(edge.from);
    }

    this.recalculateGraph();
    return true;
  }

  /**
   * Remove dependency edge
   */
  removeEdge(from: string, to: string, type?: string): void {
    this.graph.edges = this.graph.edges.filter(
      e => !(e.from === from && e.to === to && (type === undefined || e.type === type))
    );
    
    // Update node dependencies
    const fromNode = this.graph.nodes.get(from);
    const toNode = this.graph.nodes.get(to);
    
    if (fromNode) {
      fromNode.dependents = fromNode.dependents.filter(id => id !== to);
    }
    if (toNode) {
      toNode.dependencies = toNode.dependencies.filter(id => id !== from);
    }

    this.recalculateGraph();
  }

  /**
   * Detect cycles in the dependency graph
   */
  detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        // Cycle detected
        const cycleStart = path.indexOf(nodeId);
        cycles.push([...path.slice(cycleStart), nodeId]);
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = this.graph.nodes.get(nodeId);
      if (node) {
        for (const dependentId of node.dependents) {
          dfs(dependentId, [...path, nodeId]);
        }
      }

      recursionStack.delete(nodeId);
    };

    for (const nodeId of Array.from(this.graph.nodes.keys())) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    this.graph.cycles = cycles;
    return cycles;
  }

  /**
   * Calculate topological order (valid execution order)
   */
  calculateTopologicalOrder(): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const order: string[] = [];

    // Initialize in-degree
    for (const nodeId of Array.from(this.graph.nodes.keys())) {
      inDegree.set(nodeId, 0);
    }

    // Calculate in-degrees
    for (const edge of this.graph.edges) {
      const current = inDegree.get(edge.to) || 0;
      inDegree.set(edge.to, current + 1);
    }

    // Find nodes with no dependencies
    for (const [nodeId, degree] of Array.from(inDegree.entries())) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Process nodes
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      order.push(nodeId);

      const node = this.graph.nodes.get(nodeId);
      if (node) {
        for (const dependentId of node.dependents) {
          const current = inDegree.get(dependentId) || 0;
          inDegree.set(dependentId, current - 1);
          
          if (inDegree.get(dependentId) === 0) {
            queue.push(dependentId);
          }
        }
      }
    }

    // If order length doesn't match nodes, there's a cycle
    if (order.length !== this.graph.nodes.size) {
      // Detect cycles to report
      this.detectCycles();
      return [];
    }

    this.graph.topologicalOrder = order;
    return order;
  }

  /**
   * Recalculate graph (cycles and topological order)
   */
  private recalculateGraph(): void {
    this.detectCycles();
    this.calculateTopologicalOrder();
  }

  /**
   * Get execution order for a set of automations
   */
  getExecutionOrder(automationIds: string[]): string[] | null {
    const order = this.calculateTopologicalOrder();
    if (order.length === 0) {
      return null; // Cycle detected
    }

    // Filter to only requested automations and maintain order
    const filtered = order.filter(id => automationIds.includes(id));
    return filtered;
  }

  /**
   * Check if adding an edge would create a cycle
   */
  wouldCreateCycle(from: string, to: string): boolean {
    // Temporarily add edge
    const tempEdge: DependencyEdge = { from, to, type: "depends_on" };
    this.graph.edges.push(tempEdge);

    // Check for cycles
    const cycles = this.detectCycles();
    const hasCycle = cycles.length > 0;

    // Remove temporary edge
    this.graph.edges.pop();
    this.recalculateGraph();

    return hasCycle;
  }

  /**
   * Get all dependencies for an automation
   */
  getDependencies(automationId: string, recursive: boolean = false): string[] {
    const node = this.graph.nodes.get(automationId);
    if (!node) return [];

    if (!recursive) {
      return [...node.dependencies];
    }

    // Recursive: get all transitive dependencies
    const dependencies = new Set<string>();
    const visited = new Set<string>();

    const collectDeps = (id: string): void => {
      if (visited.has(id)) return;
      visited.add(id);

      const n = this.graph.nodes.get(id);
      if (n) {
        for (const depId of n.dependencies) {
          dependencies.add(depId);
          collectDeps(depId);
        }
      }
    };

    collectDeps(automationId);
    return Array.from(dependencies);
  }

  /**
   * Get all dependents for an automation
   */
  getDependents(automationId: string, recursive: boolean = false): string[] {
    const node = this.graph.nodes.get(automationId);
    if (!node) return [];

    if (!recursive) {
      return [...node.dependents];
    }

    // Recursive: get all transitive dependents
    const dependents = new Set<string>();
    const visited = new Set<string>();

    const collectDeps = (id: string): void => {
      if (visited.has(id)) return;
      visited.add(id);

      const n = this.graph.nodes.get(id);
      if (n) {
        for (const depId of n.dependents) {
          dependents.add(depId);
          collectDeps(depId);
        }
      }
    };

    collectDeps(automationId);
    return Array.from(dependents);
  }

  /**
   * Get graph summary
   */
  getGraphSummary(): {
    nodeCount: number;
    edgeCount: number;
    cycleCount: number;
    hasValidOrder: boolean;
    cycles: string[][];
  } {
    return {
      nodeCount: this.graph.nodes.size,
      edgeCount: this.graph.edges.length,
      cycleCount: this.graph.cycles.length,
      hasValidOrder: this.graph.topologicalOrder.length === this.graph.nodes.size,
      cycles: this.graph.cycles,
    };
  }

  /**
   * Get full graph
   */
  getGraph(): DependencyGraph {
    return {
      nodes: new Map(this.graph.nodes),
      edges: [...this.graph.edges],
      cycles: [...this.graph.cycles],
      topologicalOrder: [...this.graph.topologicalOrder],
    };
  }
}

// Global instance
export const automationDependencyGraph = new AutomationDependencyGraph();
