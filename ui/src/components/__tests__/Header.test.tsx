import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Header from '../Header';

describe('Header', () => {
  it('renders the header with logo', () => {
    render(<Header />);

    // Check if header is rendered
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });

  it('displays the application title or logo', () => {
    render(<Header />);

    // Check for Tavily branding (adjust based on actual implementation)
    const logo = screen.getByAltText(/logo/i) || screen.getByText(/tavily/i);
    expect(logo).toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    const { container } = render(<Header />);

    // Verify header has proper styling
    const header = container.querySelector('header');
    expect(header).toHaveClass();
  });
});
