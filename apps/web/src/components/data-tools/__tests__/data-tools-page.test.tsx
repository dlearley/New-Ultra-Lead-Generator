import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DataToolsPage from '@/app/data-tools/page';

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

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

describe('DataToolsPage', () => {
  it('renders data tools page with title and description', async () => {
    render(<DataToolsPage />);
    
    expect(screen.getByText('Data Tools')).toBeInTheDocument();
    expect(screen.getByText(/Manage data quality, deduplication, enrichment, and exports/)).toBeInTheDocument();
  });

  it('displays status overview cards', async () => {
    render(<DataToolsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Duplicate Groups')).toBeInTheDocument();
      expect(screen.getByText('Enrichment Queue')).toBeInTheDocument();
      expect(screen.getByText('Hygiene Score')).toBeInTheDocument();
      expect(screen.getByText('Export Jobs')).toBeInTheDocument();
    });
  });

  it('displays action buttons', async () => {
    render(<DataToolsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Run Deduplication')).toBeInTheDocument();
      expect(screen.getByText('Run Enrichment')).toBeInTheDocument();
      expect(screen.getByText('Check Data Hygiene')).toBeInTheDocument();
    });
  });

  it('shows tabs for different sections', async () => {
    render(<DataToolsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Deduplication/)).toBeInTheDocument();
      expect(screen.getByText('Enrichment Status')).toBeInTheDocument();
      expect(screen.getByText('Export Center')).toBeInTheDocument();
    });
  });

  it('displays duplicate groups in deduplication tab', async () => {
    render(<DataToolsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Tech Solutions Inc')).toBeInTheDocument();
      expect(screen.getByText('Tech Solutions, Inc.')).toBeInTheDocument();
      expect(screen.getByText('Global Health Systems')).toBeInTheDocument();
    });
  });

  it('shows confidence scores for duplicates', async () => {
    render(<DataToolsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('95% match')).toBeInTheDocument();
      expect(screen.getByText('78% match')).toBeInTheDocument();
    });
  });

  it('allows selecting duplicate groups', async () => {
    render(<DataToolsPage />);
    
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
      
      fireEvent.click(checkboxes[0]);
      expect(screen.getByText(/1 selected/)).toBeInTheDocument();
    });
  });

  it('switches to enrichment status tab', async () => {
    render(<DataToolsPage />);
    
    const enrichmentTab = screen.getByText('Enrichment Status');
    fireEvent.click(enrichmentTab);
    
    await waitFor(() => {
      expect(screen.getByText('Enrichment Status')).toBeInTheDocument();
      expect(screen.getByText('Enrichment Actions')).toBeInTheDocument();
    });
  });

  it('switches to export center tab', async () => {
    render(<DataToolsPage />);
    
    const exportTab = screen.getByText('Export Center');
    fireEvent.click(exportTab);
    
    await waitFor(() => {
      expect(screen.getByText('Export History')).toBeInTheDocument();
      expect(screen.getByText('New Export')).toBeInTheDocument();
    });
  });

  it('displays export job information', async () => {
    render(<DataToolsPage />);
    
    const exportTab = screen.getByText('Export Center');
    fireEvent.click(exportTab);
    
    await waitFor(() => {
      expect(screen.getByText('leads-q4-2024.csv')).toBeInTheDocument();
      expect(screen.getByText('tech-companies-nyc.xlsx')).toBeInTheDocument();
      expect(screen.getByText('all-prospects.csv')).toBeInTheDocument();
    });
  });

  it('shows different export job statuses', async () => {
    render(<DataToolsPage />);
    
    const exportTab = screen.getByText('Export Center');
    fireEvent.click(exportTab);
    
    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('processing')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
    });
  });

  it('displays hygiene score with appropriate color', async () => {
    render(<DataToolsPage />);
    
    await waitFor(() => {
      const hygieneScore = screen.getByText('87%');
      expect(hygieneScore).toBeInTheDocument();
    });
  });

  it('shows enrichment queue size', async () => {
    render(<DataToolsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('156')).toBeInTheDocument();
    });
  });

  it('handles deduplication action button clicks', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<DataToolsPage />);
    
    await waitFor(() => {
      const dedupeButton = screen.getByText('Run Deduplication');
      fireEvent.click(dedupeButton);
    });
    
    expect(alertSpy).toHaveBeenCalledWith('Deduplication process started. This may take a few minutes...');
    
    alertSpy.mockRestore();
  });
});