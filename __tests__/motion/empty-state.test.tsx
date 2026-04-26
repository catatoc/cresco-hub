import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/common/empty-state';

describe('EmptyState', () => {
  it('renders icon, title, description', () => {
    render(<EmptyState icon="📋" title="No tasks" description="Create one to start" />);
    expect(screen.getByText('📋')).toBeInTheDocument();
    expect(screen.getByText('No tasks')).toBeInTheDocument();
    expect(screen.getByText('Create one to start')).toBeInTheDocument();
  });

  it('renders optional action', () => {
    render(
      <EmptyState
        icon="📋"
        title="Empty"
        description="None"
        action={<button>Create</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('does not render description block when omitted', () => {
    const { container } = render(<EmptyState icon="📋" title="Empty" />);
    expect(container.querySelector('p')).toBeNull();
  });
});
