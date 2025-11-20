import { render, screen } from '@testing-library/react';
import HomePage from '../pages/index';

describe('HomePage', () => {
  it('renders welcome message', () => {
    render(<HomePage />);
    expect(screen.getByText(/Welcome to Multi-Service Web App/i)).toBeInTheDocument();
  });

  it('renders documentation link', () => {
    render(<HomePage />);
    expect(screen.getByText(/Documentation &rarr;/i)).toBeInTheDocument();
  });

  it('renders status link', () => {
    render(<HomePage />);
    expect(screen.getByText(/Status &rarr;/i)).toBeInTheDocument();
  });
});