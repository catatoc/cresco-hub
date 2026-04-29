import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SlashMenu } from '../slash-menu';

type MockView = {
  state: { selection: { from: number } };
  dispatch: ReturnType<typeof vi.fn>;
  coordsAtPos: (pos: number) => { left: number; top: number; bottom: number; right: number };
};

function makeView(): MockView {
  return {
    state: { selection: { from: 5 } },
    dispatch: vi.fn(),
    coordsAtPos: () => ({ left: 100, top: 50, bottom: 70, right: 110 }),
  };
}

vi.mock('@/lib/edit-tasks/slash-menu-plugin', () => ({
  getSlashMenuState: () => ({ active: true, from: 2, query: '' }),
}));

const { inserts } = vi.hoisted(() => ({
  inserts: {
    'heading-1': vi.fn(),
    'bullet-list': vi.fn(),
  },
}));
vi.mock('@/lib/edit-tasks/slash-menu-items', () => ({
  slashMenuItems: [
    { id: 'heading-1', label: 'Heading 1', insert: inserts['heading-1'] },
    { id: 'heading-2', label: 'Heading 2', insert: vi.fn() },
    { id: 'bullet-list', label: 'Bullet list', insert: inserts['bullet-list'] },
  ],
}));

beforeEach(() => {
  inserts['heading-1'].mockClear();
  inserts['bullet-list'].mockClear();
});

describe('SlashMenu', () => {
  it('renders all items when active and query is empty', () => {
    const view = makeView() as never;
    render(<SlashMenu view={view} tick={1} />);
    expect(screen.getByText('Heading 1')).toBeInTheDocument();
    expect(screen.getByText('Heading 2')).toBeInTheDocument();
    expect(screen.getByText('Bullet list')).toBeInTheDocument();
  });

  it('clicking an item invokes its insert callback', async () => {
    const user = userEvent.setup();
    const view = makeView() as never;
    render(<SlashMenu view={view} tick={1} />);
    await user.click(screen.getByText('Heading 1'));
    expect(inserts['heading-1']).toHaveBeenCalledTimes(1);
  });
});
