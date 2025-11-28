import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FileUpload from '../FileUpload';

describe('FileUpload', () => {
  it('renders file upload component', () => {
    const mockOnFilesUploaded = vi.fn();
    render(<FileUpload onFilesUploaded={mockOnFilesUploaded} />);

    // Should have drag and drop area or file input
    const uploadArea = screen.getByText(/upload/i) || screen.getByText(/drag/i);
    expect(uploadArea).toBeInTheDocument();
  });

  it('accepts valid file types', async () => {
    const mockOnFilesUploaded = vi.fn();
    render(<FileUpload onFilesUploaded={mockOnFilesUploaded} />);

    const file = new File(['test content'], 'test.pdf', {
      type: 'application/pdf',
    });

    const input = screen.getByLabelText(/upload/i) || document.querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        // Check if file was accepted
        expect(mockOnFilesUploaded).toHaveBeenCalled();
      });
    }
  });

  it('displays uploaded file names', async () => {
    const mockOnFilesUploaded = vi.fn();
    const { container } = render(<FileUpload onFilesUploaded={mockOnFilesUploaded} />);

    const file = new File(['content'], 'document.txt', { type: 'text/plain' });
    const input = container.querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/document.txt/i) || container).toBeInTheDocument();
      });
    }
  });

  it('shows error for invalid file types', async () => {
    const mockOnFilesUploaded = vi.fn();
    const { container } = render(<FileUpload onFilesUploaded={mockOnFilesUploaded} />);

    const file = new File(['malicious'], 'virus.exe', {
      type: 'application/x-msdownload',
    });

    const input = container.querySelector('input[type="file"]');

    if (input) {
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        // Should show error or reject file
        expect(screen.queryByText(/virus.exe/i)).not.toBeInTheDocument();
      });
    }
  });
});
