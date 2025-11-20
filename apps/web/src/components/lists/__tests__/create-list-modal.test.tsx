import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateListModal } from '@/components/lists/create-list-modal';

// Mock the UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, ...props }: any) => (
    <input onChange={onChange} value={value} {...props} />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

describe('CreateListModal', () => {
  const mockOnSubmit = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(
      <CreateListModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create New List')).toBeInTheDocument();
    expect(screen.getByText('Create a new list to organize your prospects for targeted outreach campaigns.')).toBeInTheDocument();
  });

  it('does not render modal when closed', () => {
    render(
      <CreateListModal
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders form fields', () => {
    render(
      <CreateListModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByLabelText('List Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Make this list visible to all team members')).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    render(
      <CreateListModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const nameInput = screen.getByLabelText('List Name *');
    const descriptionInput = screen.getByLabelText('Description');
    const submitButton = screen.getByText('Create List');

    fireEvent.change(nameInput, { target: { value: 'Test List' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test List',
        description: 'Test Description',
        isPublic: false,
        tags: []
      });
    });
  });

  it('does not submit with empty name', async () => {
    render(
      <CreateListModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByText('Create List');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  it('closes modal when cancel is clicked', () => {
    render(
      <CreateListModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles checkbox for public list', async () => {
    render(
      <CreateListModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const nameInput = screen.getByLabelText('List Name *');
    const publicCheckbox = screen.getByLabelText('Make this list visible to all team members');
    const submitButton = screen.getByText('Create List');

    fireEvent.change(nameInput, { target: { value: 'Public List' } });
    fireEvent.click(publicCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Public List',
        description: '',
        isPublic: true,
        tags: []
      });
    });
  });

  it('adds and removes tags', async () => {
    render(
      <CreateListModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const tagInput = screen.getByPlaceholderText('Add tags to categorize this list');
    const addButton = screen.getByRole('button', { name: '' }); // Plus button

    // Add tag
    fireEvent.change(tagInput, { target: { value: 'test-tag' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('test-tag')).toBeInTheDocument();
      expect(tagInput).toHaveValue('');
    });

    // Remove tag
    const removeButton = screen.getByRole('button'); // X button on tag
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('test-tag')).not.toBeInTheDocument();
    });
  });

  it('adds tag on Enter key press', async () => {
    render(
      <CreateListModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const tagInput = screen.getByPlaceholderText('Add tags to categorize this list');

    fireEvent.change(tagInput, { target: { value: 'enter-tag' } });
    fireEvent.keyPress(tagInput, { key: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('enter-tag')).toBeInTheDocument();
    });
  });

  it('does not add duplicate tags', async () => {
    render(
      <CreateListModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const tagInput = screen.getByPlaceholderText('Add tags to categorize this list');
    const addButton = screen.getByRole('button', { name: '' });

    // Add first tag
    fireEvent.change(tagInput, { target: { value: 'duplicate' } });
    fireEvent.click(addButton);

    // Try to add same tag again
    fireEvent.change(tagInput, { target: { value: 'duplicate' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      const tags = screen.getAllByText('duplicate');
      expect(tags).toHaveLength(1);
    });
  });

  it('submits form with tags', async () => {
    render(
      <CreateListModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const nameInput = screen.getByLabelText('List Name *');
    const tagInput = screen.getByPlaceholderText('Add tags to categorize this list');
    const addButton = screen.getByRole('button', { name: '' });
    const submitButton = screen.getByText('Create List');

    fireEvent.change(nameInput, { target: { value: 'Tagged List' } });
    fireEvent.change(tagInput, { target: { value: 'tag1' } });
    fireEvent.click(addButton);

    fireEvent.change(tagInput, { target: { value: 'tag2' } });
    fireEvent.click(addButton);

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Tagged List',
        description: '',
        isPublic: false,
        tags: ['tag1', 'tag2']
      });
    });
  });
});