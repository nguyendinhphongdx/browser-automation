import { BaseNode } from './base-node'

/**
 * Parallel Fork / Join nodes are orchestrator-level nodes.
 * Their execute() is a fallback — actual logic is handled in engine.ts
 * similar to if-else, loop, try-catch.
 */

export class ParallelForkNode extends BaseNode {
  protected async execute() {
    this.log('info', 'Parallel fork — branching')
  }
}

export class ParallelJoinNode extends BaseNode {
  protected async execute() {
    this.log('info', 'Parallel join — merging')
  }
}
