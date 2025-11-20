import { render, screen } from '@testing-library/react';
import AdminHomePage from '../pages/index';

describe('AdminHomePage', () => {
  it('renders admin panel title', () => {
    render(<AdminHomePage />);
    expect(screen.getByText(/Admin Panel/i)).toBeInTheDocument();
  });

  it('renders user management card', () => {
    render(<AdminHomePage />);
    expect(screen.getByText(/User Management &rarr;/i)).toBeInTheDocument();
  });

  it('renders system monitoring card', () => {
    render(<AdminHomePage />);
    expect(screen.getByText(/System Monitoring &rarr;/i)).toBeInTheDocument();
  });

  it('renders configuration card', () => {
    render(<AdminHomePage />);
    expect(screen.getByText(/Configuration &rarr;/i)).toBeInTheDocument();
  });
});