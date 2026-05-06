/**
 * Typed config parsing for Claude provider defaults.
 * Validates and narrows the opaque assistantConfig to typed fields.
 */
import type { ClaudeProviderDefaults } from '../types';

// Re-export so consumers can import the type from either location
export type { ClaudeProviderDefaults } from '../types';

const CLAUDE_EFFORT_LEVELS = new Set(['low', 'medium', 'high', 'max']);

/**
 * Parse raw assistantConfig into typed Claude defaults.
 * Defensive: invalid fields are silently dropped (not thrown).
 */
export function parseClaudeConfig(raw: Record<string, unknown>): ClaudeProviderDefaults {
  const result: ClaudeProviderDefaults = {};

  if (typeof raw.model === 'string') {
    result.model = raw.model;
  }

  if (typeof raw.effort === 'string' && CLAUDE_EFFORT_LEVELS.has(raw.effort)) {
    result.effort = raw.effort as ClaudeProviderDefaults['effort'];
  }

  if (Array.isArray(raw.settingSources)) {
    const valid = raw.settingSources.filter(
      (s): s is 'project' | 'user' => s === 'project' || s === 'user'
    );
    if (valid.length > 0) {
      result.settingSources = valid;
    }
  }

  if (typeof raw.claudeBinaryPath === 'string') {
    result.claudeBinaryPath = raw.claudeBinaryPath;
  }

  return result;
}
