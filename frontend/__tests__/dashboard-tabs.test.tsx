import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Dashboard tabs', () => {
  const sidebarPath = path.resolve(__dirname, '../components/dashboard/sidebar.tsx');
  const dashboardPath = path.resolve(__dirname, '../app/dashboard/page.tsx');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');

  it('sidebar does not render ML Analytics tab', () => {
    // The navigation array should not contain ml-analytics
    expect(sidebarContent).not.toContain('"ml-analytics"');
    expect(sidebarContent).not.toContain("'ml-analytics'");
  });

  it('dashboard page does not render ml-analytics tab content', () => {
    expect(dashboardContent).not.toContain('"ml-analytics"');
    expect(dashboardContent).not.toContain("'ml-analytics'");
    expect(dashboardContent).not.toContain('MLAnalyticsTab');
  });

  it('sidebar renders all other expected tabs', () => {
    const expectedTabs = [
      'overview',
      'wallet-security',
      'simulation',
      'recovery',
      'freeze-requests',
      'settings-api',
    ];
    for (const tab of expectedTabs) {
      expect(sidebarContent).toContain(tab);
    }
  });
});
