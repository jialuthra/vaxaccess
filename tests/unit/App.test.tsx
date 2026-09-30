import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../src/App.tsx';

describe('App', () => {
  it('renders the site name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'VaxAccess' })).toBeInTheDocument();
  });
});
