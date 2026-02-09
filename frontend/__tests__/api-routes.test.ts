import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('API route header consistency', () => {
  it('no proxy routes use x-api-key header (should all use x-access-token)', () => {
    const apiDir = path.resolve(__dirname, '../app/api');
    // Use grep to find any remaining x-api-key usage in route files
    let grepOutput = '';
    try {
      grepOutput = execSync(
        `grep -r '"x-api-key"' "${apiDir}" --include="route.ts" -l`,
        { encoding: 'utf-8' }
      );
    } catch {
      // grep exits with code 1 when no matches found — that's the success case
      grepOutput = '';
    }

    const filesWithOldHeader = grepOutput.trim().split('\n').filter(Boolean);
    expect(
      filesWithOldHeader,
      `These files still use "x-api-key" instead of "x-access-token": ${filesWithOldHeader.join(', ')}`
    ).toHaveLength(0);
  });
});
