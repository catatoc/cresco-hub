import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectTeamModule } from '../project-team-module';
import type { TeamMember } from '@/schemas/team-member';

const mk = (over: Partial<TeamMember>): TeamMember => ({
  id: 't',
  name: 'Anon',
  email: 'anon@example.com',
  role: null,
  area: null,
  customerIds: [],
  projectIds: [],
  portalSignIn: false,
  ...over,
});

describe('ProjectTeamModule', () => {
  it('shows empty state when no members and no owner', () => {
    render(<ProjectTeamModule members={[]} ownerName={null} />);
    expect(screen.getByText(/Sin equipo asignado/i)).toBeInTheDocument();
  });

  it('renders chips for each member', () => {
    render(
      <ProjectTeamModule
        members={[
          mk({ id: '1', name: 'Dani' }),
          mk({ id: '2', name: 'Mario' }),
        ]}
        ownerName="Dani"
      />,
    );
    expect(screen.getByText('Dani')).toBeInTheDocument();
    expect(screen.getByText('Mario')).toBeInTheDocument();
    expect(screen.getByText(/Owner: Dani/i)).toBeInTheDocument();
  });

  it('shows +N chip when more than 5 members', () => {
    const members = Array.from({ length: 7 }, (_, i) =>
      mk({ id: `${i}`, name: `Member ${i}` }),
    );
    render(<ProjectTeamModule members={members} ownerName={null} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
