import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DashboardPage from './page';

describe('dashboard foundation', () => {
  it('renders unavailable data states and navigation content', () => {
    const markup = renderToStaticMarkup(<DashboardPage />);
    expect(markup).toContain('Data connection not configured');
    expect(markup).toContain('No assets in your watchlist yet');
    expect(markup).toContain('Paper Trading');
    expect(markup).toContain('Settings');
    expect(markup).toContain('Mobile navigation');
  });
});
