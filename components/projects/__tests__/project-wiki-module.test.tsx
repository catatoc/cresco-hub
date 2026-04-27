import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectWikiModule } from '../project-wiki-module';
import type { WikiPage } from '@/schemas/wiki';

const mk = (over: Partial<WikiPage>): WikiPage => ({
  id: 'w',
  title: 'Untitled',
  icon: null,
  cover: null,
  categories: [],
  customerId: 'c',
  projectIds: ['p'],
  meetingIds: [],
  lastEditedAt: '2026-04-01T10:00:00.000Z',
  url: 'https://notion.so/w',
  ...over,
});

describe('ProjectWikiModule', () => {
  it('renders empty state when no pages', () => {
    render(<ProjectWikiModule pages={[]} />);
    expect(screen.getByText(/Sin documentación/i)).toBeInTheDocument();
  });

  it('renders top 3 with category chips, opening Notion in a new tab', () => {
    const pages = [
      mk({ id: '1', title: 'Brief', categories: ['Strategy doc'] }),
      mk({ id: '2', title: 'Decisiones', categories: ['Documentation'] }),
      mk({ id: '3', title: 'OKRs', categories: ['Planning'] }),
      mk({ id: '4', title: 'Investigación', categories: [] }),
    ];
    render(<ProjectWikiModule pages={pages} />);
    // Wiki rows are external links to Notion; "Ver todo" links to /wiki
    const externalLinks = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('target') === '_blank');
    expect(externalLinks).toHaveLength(3);
    expect(externalLinks[0]).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Strategy doc')).toBeInTheDocument();
  });
});
