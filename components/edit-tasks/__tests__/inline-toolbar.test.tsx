import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineToolbar } from '../inline-toolbar';
import { editTasksSchema } from '@/lib/edit-tasks/schema';
import { EditorState, TextSelection } from 'prosemirror-state';

function buildView(text: string, selectFromTo?: [number, number]) {
  const para = editTasksSchema.node('paragraph', null, [editTasksSchema.text(text)]);
  const doc = editTasksSchema.node('doc', null, [para]);
  let state = EditorState.create({ doc });
  if (selectFromTo) {
    const [from, to] = selectFromTo;
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)));
  }
  const dispatch = vi.fn((tr) => {
    state = state.apply(tr);
  });
  return {
    get state() {
      return state;
    },
    dispatch,
    coordsAtPos: () => ({ left: 100, top: 50, bottom: 70, right: 110 }),
    focus: vi.fn(),
  };
}

const onLinkRequest = vi.fn();

beforeEach(() => onLinkRequest.mockReset());

describe('InlineToolbar', () => {
  it('returns null when selection is empty', () => {
    const view = buildView('Hello') as never;
    const { container } = render(
      <InlineToolbar view={view} tick={1} onLinkRequest={onLinkRequest} />,
    );
    expect(container.querySelector('[role="toolbar"]')).toBeNull();
  });

  it('renders 5 buttons when there is a non-empty selection', () => {
    const view = buildView('Hello', [1, 6]) as never;
    render(<InlineToolbar view={view} tick={1} onLinkRequest={onLinkRequest} />);
    expect(screen.getByRole('button', { name: /negrita/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cursiva/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tachado/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^código$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enlace/i })).toBeInTheDocument();
  });

  it('clicking the link button calls onLinkRequest', async () => {
    const user = userEvent.setup();
    const view = buildView('Hello', [1, 6]) as never;
    render(<InlineToolbar view={view} tick={1} onLinkRequest={onLinkRequest} />);
    await user.click(screen.getByRole('button', { name: /enlace/i }));
    expect(onLinkRequest).toHaveBeenCalledTimes(1);
  });
});
