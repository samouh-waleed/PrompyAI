import { describe, it, expect } from 'vitest';
import { getMachineId } from '../../src/utils/machineId.js';

describe('getMachineId', () => {
  it('should return a 16-character hex string', () => {
    const id = getMachineId();
    expect(id).toMatch(/^[a-f0-9]{16}$/);
  });

  it('should return the same ID on repeated calls', () => {
    const id1 = getMachineId();
    const id2 = getMachineId();
    expect(id1).toBe(id2);
  });
});
