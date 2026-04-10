/**
 * Supervised-autonomous approval queue for Slack "go" trigger.
 *
 * Heartbeat classifies GitHub issues and POSTs proposals here via
 * /api/proposals. When Moo replies "go" (or "go #N") in Slack, the
 * go-handler pulls the pending entries for that channel and dispatches
 * each approved workflow directly via dispatchApprovedWorkflow().
 *
 * Trust model: one "go" = one dispatch. Re-sending "go" returns a status
 * confirmation; it never double-dispatches. Proposals expire after TTL_MS
 * and are pruned lazily on every read.
 */

export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface WorkflowProposal {
  /** Stable UUID — used as idempotency key. */
  id: string;
  /** Slack DM channel ID (e.g. "D1234567"). Key for pending lookups. */
  channelId: string;
  /** Archon workflow name (e.g. "archon-fix-github-issue-dag"). */
  workflowName: string;
  /** Registered codebase name (e.g. "moo-second-brain"). */
  codebaseName: string;
  /** GitHub issue number, if the proposal originated from an issue. */
  issueNumber?: number;
  /** Free-form message forwarded to the workflow as user input. */
  userMessage: string;
  /** Optional branch hint for isolation resolution. */
  branchName?: string;
  createdAt: Date;
  expiresAt: Date;
  /** True once the workflow has been dispatched — prevents double-dispatch. */
  dispatched: boolean;
}

export class ProposalQueue {
  private readonly proposals = new Map<string, WorkflowProposal>();
  private readonly ttlMs: number;

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /** Add a proposal. Returns the stored entry (with generated id/timestamps). */
  enqueue(
    opts: Omit<WorkflowProposal, 'id' | 'createdAt' | 'expiresAt' | 'dispatched'>
  ): WorkflowProposal {
    const now = new Date();
    const proposal: WorkflowProposal = {
      ...opts,
      id: crypto.randomUUID(),
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.ttlMs),
      dispatched: false,
    };
    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  /**
   * Return all non-dispatched, non-expired proposals for the given channel.
   * Prunes expired entries as a side-effect.
   */
  getPending(channelId: string): WorkflowProposal[] {
    this.prune();
    return Array.from(this.proposals.values()).filter(
      p => p.channelId === channelId && !p.dispatched
    );
  }

  /**
   * Return all proposals for the channel (including dispatched ones),
   * used for idempotency status messages.
   */
  getAll(channelId: string): WorkflowProposal[] {
    this.prune();
    return Array.from(this.proposals.values()).filter(p => p.channelId === channelId);
  }

  /** Mark proposals as dispatched by id. Silently ignores unknown ids. */
  markDispatched(ids: string[]): void {
    for (const id of ids) {
      const p = this.proposals.get(id);
      if (p) p.dispatched = true;
    }
  }

  /** Remove proposals whose TTL has elapsed. */
  prune(): void {
    const now = new Date();
    for (const [id, p] of this.proposals) {
      if (p.expiresAt <= now) this.proposals.delete(id);
    }
  }

  /** Total number of stored proposals (including dispatched/expired — pre-prune). */
  get size(): number {
    return this.proposals.size;
  }
}

/** Module-level singleton shared between the API endpoint and the go-handler. */
export const proposalQueue = new ProposalQueue();
