import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectMeetingsModule } from '../project-meetings-module';
import type { Meeting } from '@/schemas/meeting';

const mk = (over: Partial<Meeting>): Meeting => ({
  id: 'm',
  title: 'Untitled',
  createdTime: '2026-04-01T10:00:00.000Z',
  date: null,
  endDate: null,
  meetingType: null,
  summary: null,
  attendeeIds: [],
  customerId: 'c',
  projectIds: ['p'],
  teamIds: [],
  taskIds: [],
  wikiIds: [],
  url: 'https://notion.so/m',
  ...over,
});

describe('ProjectMeetingsModule', () => {
  it('renders empty state when no meetings', () => {
    render(<ProjectMeetingsModule meetings={[]} />);
    expect(screen.getByText(/Sin reuniones/i)).toBeInTheDocument();
  });

  it('renders top 3 sorted by date desc and shows action-item count', () => {
    const meetings = [
      mk({ id: 'old', title: 'Kickoff', date: '2026-01-15', taskIds: [] }),
      mk({ id: 'mid', title: 'Decisión X', date: '2026-04-18', taskIds: ['t1', 't2'] }),
      mk({ id: 'new', title: 'Sync semanal', date: '2026-04-22', taskIds: ['t3'] }),
      mk({ id: 'newest', title: 'Retro', date: '2026-04-25', taskIds: [] }),
    ];
    render(<ProjectMeetingsModule meetings={meetings} />);
    // Filter to meeting-detail links only (in case "Ver todas" is also a link)
    const meetingLinks = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href')?.startsWith('/reuniones/'));
    expect(meetingLinks).toHaveLength(3);
    expect(meetingLinks[0]).toHaveTextContent('Retro');
    expect(screen.getByText(/2 acciones/i)).toBeInTheDocument();
    expect(screen.getByText(/1 acción/i)).toBeInTheDocument();
  });

  it('links rows to /reuniones/[id]', () => {
    render(<ProjectMeetingsModule meetings={[mk({ id: 'abc', title: 'Hi' })]} />);
    expect(screen.getByRole('link', { name: /Hi/ })).toHaveAttribute('href', '/reuniones/abc');
  });
});
