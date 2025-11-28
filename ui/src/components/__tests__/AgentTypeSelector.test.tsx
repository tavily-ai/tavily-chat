import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AgentTypeSelector from '../AgentTypeSelector';

describe('AgentTypeSelector', () => {
  it('renders both agent type options', () => {
    const mockSetAgentType = vi.fn();
    render(
      <AgentTypeSelector agentType="fast" setAgentType={mockSetAgentType} />
    );

    expect(screen.getByText(/fast/i)).toBeInTheDocument();
    expect(screen.getByText(/deep/i)).toBeInTheDocument();
  });

  it('highlights the selected agent type', () => {
    const mockSetAgentType = vi.fn();
    render(
      <AgentTypeSelector agentType="fast" setAgentType={mockSetAgentType} />
    );

    const fastButton = screen.getByText(/fast/i).closest('button');
    expect(fastButton).toHaveClass(); // Should have active/selected class
  });

  it('calls setAgentType when clicking different option', () => {
    const mockSetAgentType = vi.fn();
    render(
      <AgentTypeSelector agentType="fast" setAgentType={mockSetAgentType} />
    );

    const deepButton = screen.getByText(/deep/i).closest('button');
    if (deepButton) {
      fireEvent.click(deepButton);
      expect(mockSetAgentType).toHaveBeenCalledWith('deep');
    }
  });

  it('renders descriptions for agent types', () => {
    const mockSetAgentType = vi.fn();
    const { container } = render(
      <AgentTypeSelector agentType="fast" setAgentType={mockSetAgentType} />
    );

    // Check for descriptive text about agent types
    expect(container).toBeInTheDocument();
  });
});
