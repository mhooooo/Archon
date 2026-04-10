/**
 * Unit tests for ProposalQueue — supervised-autonomous approval queue.
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { ProposalQueue } from './proposals';

describe('ProposalQueue', () => {
  let queue: ProposalQueue;

  beforeEach(() => {
    queue = new ProposalQueue(1000); // 1-second TTL for testing
  });

  test('enqueue returns a proposal with generated id and timestamps', () => {
    const p = queue.enqueue({
      channelId: 'D111',
      workflowName: 'archon-fix-github-issue-dag',
      codebaseName: 'moo-second-brain',
      userMessage: 'Fix issue #1',
      issueNumber: 1,
    });

    expect(p.id).toBeString();
    expect(p.id.length).toBeGreaterThan(0);
    expect(p.channelId).toBe('D111');
    expect(p.workflowName).toBe('archon-fix-github-issue-dag');
    expect(p.codebaseName).toBe('moo-second-brain');
    expect(p.userMessage).toBe('Fix issue #1');
    expect(p.issueNumber).toBe(1);
    expect(p.dispatched).toBe(false);
    expect(p.createdAt).toBeInstanceOf(Date);
    expect(p.expiresAt).toBeInstanceOf(Date);
    expect(p.expiresAt.getTime()).toBeGreaterThan(p.createdAt.getTime());
  });

  test('getPending returns non-dispatched proposals for the channel', () => {
    queue.enqueue({
      channelId: 'D111',
      workflowName: 'wf1',
      codebaseName: 'cb1',
      userMessage: 'msg1',
    });
    queue.enqueue({
      channelId: 'D111',
      workflowName: 'wf2',
      codebaseName: 'cb1',
      userMessage: 'msg2',
    });
    queue.enqueue({
      channelId: 'D999',
      workflowName: 'wf3',
      codebaseName: 'cb1',
      userMessage: 'msg3',
    });

    const pending = queue.getPending('D111');
    expect(pending).toHaveLength(2);
    expect(pending.every(p => p.channelId === 'D111')).toBe(true);
  });

  test('getPending excludes dispatched proposals', () => {
    const p1 = queue.enqueue({
      channelId: 'D111',
      workflowName: 'wf1',
      codebaseName: 'cb',
      userMessage: 'm1',
    });
    queue.enqueue({
      channelId: 'D111',
      workflowName: 'wf2',
      codebaseName: 'cb',
      userMessage: 'm2',
    });

    queue.markDispatched([p1.id]);

    const pending = queue.getPending('D111');
    expect(pending).toHaveLength(1);
    expect(pending[0].workflowName).toBe('wf2');
  });

  test('markDispatched sets dispatched=true on matching proposals', () => {
    const p1 = queue.enqueue({
      channelId: 'D111',
      workflowName: 'wf1',
      codebaseName: 'cb',
      userMessage: 'm1',
    });
    const p2 = queue.enqueue({
      channelId: 'D111',
      workflowName: 'wf2',
      codebaseName: 'cb',
      userMessage: 'm2',
    });

    queue.markDispatched([p1.id]);

    const all = queue.getAll('D111');
    const dispatched = all.find(p => p.id === p1.id);
    const notDispatched = all.find(p => p.id === p2.id);
    expect(dispatched?.dispatched).toBe(true);
    expect(notDispatched?.dispatched).toBe(false);
  });

  test('markDispatched silently ignores unknown ids', () => {
    queue.enqueue({
      channelId: 'D111',
      workflowName: 'wf1',
      codebaseName: 'cb',
      userMessage: 'm1',
    });
    expect(() => queue.markDispatched(['nonexistent-id'])).not.toThrow();
  });

  test('getAll returns dispatched proposals too', () => {
    const p1 = queue.enqueue({
      channelId: 'D111',
      workflowName: 'wf1',
      codebaseName: 'cb',
      userMessage: 'm1',
    });
    queue.markDispatched([p1.id]);

    const all = queue.getAll('D111');
    expect(all).toHaveLength(1);
    expect(all[0].dispatched).toBe(true);
  });

  test('prune removes expired proposals', async () => {
    const shortQueue = new ProposalQueue(50); // 50ms TTL
    shortQueue.enqueue({
      channelId: 'D111',
      workflowName: 'wf1',
      codebaseName: 'cb',
      userMessage: 'm1',
    });

    expect(shortQueue.size).toBe(1);

    // Wait for TTL to expire
    await new Promise(r => setTimeout(r, 100));

    shortQueue.prune();
    expect(shortQueue.size).toBe(0);
  });

  test('getPending implicitly prunes expired entries', async () => {
    const shortQueue = new ProposalQueue(50);
    shortQueue.enqueue({
      channelId: 'D111',
      workflowName: 'wf1',
      codebaseName: 'cb',
      userMessage: 'm1',
    });

    await new Promise(r => setTimeout(r, 100));

    const pending = shortQueue.getPending('D111');
    expect(pending).toHaveLength(0);
    expect(shortQueue.size).toBe(0); // pruned
  });

  test('idempotency: re-enqueue same issue is a new proposal, not deduplicated', () => {
    // ProposalQueue does NOT deduplicate — that's caller's responsibility.
    // Two separate heartbeat cycles can enqueue the same issue.
    queue.enqueue({
      channelId: 'D111',
      workflowName: 'wf1',
      codebaseName: 'cb',
      userMessage: 'msg',
      issueNumber: 42,
    });
    queue.enqueue({
      channelId: 'D111',
      workflowName: 'wf1',
      codebaseName: 'cb',
      userMessage: 'msg',
      issueNumber: 42,
    });

    expect(queue.getPending('D111')).toHaveLength(2);
  });

  test('optional branchName is preserved', () => {
    const p = queue.enqueue({
      channelId: 'D111',
      workflowName: 'wf1',
      codebaseName: 'cb',
      userMessage: 'msg',
      branchName: 'fix/issue-42',
    });
    expect(p.branchName).toBe('fix/issue-42');
  });
});
