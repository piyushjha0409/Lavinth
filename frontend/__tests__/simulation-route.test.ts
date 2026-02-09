import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Simulation route', () => {
  it('/api/programs/verified route file exists', () => {
    const routePath = path.resolve(
      __dirname,
      '../app/api/programs/verified/route.ts'
    );
    expect(fs.existsSync(routePath)).toBe(true);
  });
});
