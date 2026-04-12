import { describe, test, expect } from 'bun:test';
import { buildRoutingRulesWithProject, buildProjectScopedPrompt } from './prompt-builder';
import type { Codebase } from '../types';

function makeCodebase(overrides?: Partial<Codebase>): Codebase {
  return {
    id: '1',
    name: 'test',
    default_cwd: '/test',
    ai_assistant_type: 'claude',
    repository_url: '',
    allow_env_keys: false,
    commands: {},
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

describe('buildProjectScopedPrompt contextContent', () => {
  test('includes context content when provided', () => {
    const codebase = makeCodebase();
    const prompt = buildProjectScopedPrompt(codebase, [codebase], [], 'I am JARVIS');
    expect(prompt).toContain('## Project Context');
    expect(prompt).toContain('I am JARVIS');
  });

  test('omits context section when no content', () => {
    const codebase = makeCodebase();
    const prompt = buildProjectScopedPrompt(codebase, [codebase], []);
    expect(prompt).not.toContain('## Project Context');
  });

  test('context appears after routing rules', () => {
    const codebase = makeCodebase();
    const prompt = buildProjectScopedPrompt(codebase, [codebase], [], 'identity context here');
    const routingIdx = prompt.indexOf('## Routing Rules');
    const contextIdx = prompt.indexOf('## Project Context');
    expect(routingIdx).toBeGreaterThan(-1);
    expect(contextIdx).toBeGreaterThan(-1);
    expect(routingIdx).toBeLessThan(contextIdx);
  });
});

describe('buildRoutingRulesWithProject', () => {
  test('routing rules instruct Claude to call invoke_workflow tool', () => {
    const rules = buildRoutingRulesWithProject();

    expect(rules).toContain('invoke_workflow');
    expect(rules).toContain('call the');
  });

  test('routing rules include task_description parameter', () => {
    const rules = buildRoutingRulesWithProject();

    expect(rules).toContain('task_description');
    expect(rules).toContain('self-contained');
  });

  test('routing rules mention invoke_workflow tool with project-scoped prompt', () => {
    const rules = buildRoutingRulesWithProject('my-project');

    expect(rules).toContain('invoke_workflow');
    expect(rules).toContain('my-project');
  });

  test('rules state task_description must have NO knowledge of conversation', () => {
    const rules = buildRoutingRulesWithProject();

    expect(rules).toContain('NO knowledge of this conversation');
  });

  test('rules do NOT instruct Claude to output /invoke-workflow as text', () => {
    const rules = buildRoutingRulesWithProject();

    // The new format tells Claude NOT to use the text command
    expect(rules).not.toContain('output the command as the VERY LAST line');
    expect(rules).toContain('Do NOT output');
  });
});
