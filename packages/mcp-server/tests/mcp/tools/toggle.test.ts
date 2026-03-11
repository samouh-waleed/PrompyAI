import { describe, it, expect } from 'vitest';
import { handleToggle, isAutoEvalEnabled, TOGGLE_TOOL } from '../../../src/mcp/tools/toggle.js';

describe('prompyai_toggle', () => {
  it('should start with auto-evaluation enabled', () => {
    // Reset to enabled state
    handleToggle({ enabled: true });
    expect(isAutoEvalEnabled()).toBe(true);
  });

  it('should disable auto-evaluation', () => {
    const result = JSON.parse(handleToggle({ enabled: false }));
    expect(result.status).toBe('disabled');
    expect(isAutoEvalEnabled()).toBe(false);
  });

  it('should re-enable auto-evaluation', () => {
    handleToggle({ enabled: false });
    const result = JSON.parse(handleToggle({ enabled: true }));
    expect(result.status).toBe('enabled');
    expect(isAutoEvalEnabled()).toBe(true);
  });

  it('should have correct tool schema', () => {
    expect(TOGGLE_TOOL.name).toBe('prompyai_toggle');
    expect(TOGGLE_TOOL.inputSchema.required).toContain('enabled');
  });
});
