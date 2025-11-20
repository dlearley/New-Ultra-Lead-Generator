import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ListsPage from '@/app/lists/page';
import * as types from '@/types/lead-lists';

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, ...props }: any) => (
    <span className={className} {...props}>{children}</span>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, ...props }: any) => (
    <input onChange={onChange} value={value} {...props} />
  ),
}));

vi.mock('@/components/lists/create-list-modal', () => ({
  CreateListModal: ({ isOpen, onClose, onSubmit }: any) => 
    isOpen ? (
      <div data-testid="create-list-modal">
        <button onClick={() => onSubmit({ name: 'Test List', description: 'Test', isPublic: false })}>
          Submit
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
}));

vi.mock('@/components/lists/list-details-drawer', () => ({
  ListDetailsDrawer: ({ list, isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="list-details-drawer">
        <h2>{list.name}</h2>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

describe('ListsPage', () => {
  it('renders lists page with title and description', async () => {
    render(<ListsPage />);
    
    expect(screen.getByText('Lead Lists')).toBeInTheDocument();
    expect(screen.getByText(/Manage and organize your prospect lists/)).toBeInTheDocument();
  });

  it('displays create list button', async () => {
    render(<ListsPage />);
    
    expect(screen.getByText('Create List')).toBeInTheDocument();
  });

  it('opens create list modal when button is clicked', async () => {
    render(<ListsPage />);
    
    const createButton = screen.getByText('Create List');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('create-list-modal')).toBeInTheDocument();
    });
  });

  it('displays search input', async () => {
    render(<ListsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search lists...');
    expect(searchInput).toBeInTheDocument();
  });

  it('filters lists based on search query', async () => {
    render(<ListsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Q4 Enterprise Targets')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search lists...');
    fireEvent.change(searchInput, { target: { value: 'Healthcare' } });

    await waitFor(() => {
      expect(screen.getByText('Healthcare Providers Midwest')).toBeInTheDocument();
      expect(screen.queryByText('Q4 Enterprise Targets')).not.toBeInTheDocument();
    });
  });

  it('opens list details drawer when view details is clicked', async () => {
    render(<ListsPage />);
    
    await waitFor(() => {
      const viewButton = screen.getAllByText('View Details')[0];
      fireEvent.click(viewButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('list-details-drawer')).toBeInTheDocument();
    });
  });

  it('shows empty state when no lists match search', async () => {
    render(<ListsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search lists...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No lists found')).toBeInTheDocument();
      expect(screen.getByText(/Try adjusting your search terms/)).toBeInTheDocument();
    });
  });

  it('displays list cards with correct information', async () => {
    render(<ListsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Q4 Enterprise Targets')).toBeInTheDocument();
      expect(screen.getByText('High-value enterprise accounts for Q4 outreach')).toBeInTheDocument();
      expect(screen.getByText('156 prospects')).toBeInTheDocument();
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
      expect(screen.getByText('Avg Score: 8.5')).toBeInTheDocument();
    });
  });

  it('shows public badge for public lists', async () => {
    render(<ListsPage />);
    
    await waitFor(() => {
      const publicBadges = screen.getAllByText('Public');
      expect(publicBadges.length).toBeGreaterThan(0);
    });
  });

  it('displays tags for lists', async () => {
    render(<ListsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('enterprise')).toBeInTheDocument();
      expect(screen.getByText('Q4')).toBeInTheDocument();
      expect(screen.getByText('high-value')).toBeInTheDocument();
    });
  });
});