import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, act } from '@testing-library/react';
import { TaskEditor, type TaskEditorHandle } from '../task-editor';

const initialDoc = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
  ],
};

describe('TaskEditor', () => {
  it('renders a contenteditable element', () => {
    const { container } = render(<TaskEditor initialDoc={initialDoc} onChange={() => {}} />);
    const editable = container.querySelector('[contenteditable="true"]');
    expect(editable).not.toBeNull();
  });

  it('renders the initial doc text into the contenteditable', () => {
    const { container } = render(<TaskEditor initialDoc={initialDoc} onChange={() => {}} />);
    const editable = container.querySelector('[contenteditable="true"]');
    expect(editable?.textContent).toContain('Hello');
  });

  it('exposes getDoc returning the current doc JSON', () => {
    const ref = createRef<TaskEditorHandle>();
    render(<TaskEditor ref={ref} initialDoc={initialDoc} onChange={() => {}} />);
    expect(ref.current).not.toBeNull();
    const doc = ref.current!.getDoc();
    expect(doc.type).toBe('doc');
    expect(doc.content?.[0]?.type).toBe('paragraph');
  });

  it('hasChanges returns false right after mount', () => {
    const ref = createRef<TaskEditorHandle>();
    render(<TaskEditor ref={ref} initialDoc={initialDoc} onChange={() => {}} />);
    expect(ref.current!.hasChanges()).toBe(false);
  });

  it('calls onChange when a transaction is dispatched and hasChanges flips true', () => {
    const onChange = vi.fn();
    const ref = createRef<TaskEditorHandle>();
    render(<TaskEditor ref={ref} initialDoc={initialDoc} onChange={onChange} />);

    act(() => {
      ref.current!.replaceContent({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Modified' }] },
        ],
      });
    });

    expect(onChange).toHaveBeenCalled();
    expect(ref.current!.hasChanges()).toBe(true);
    expect(ref.current!.getDoc().content?.[0]?.content?.[0]?.text).toBe('Modified');
  });

  it('cleans up the EditorView on unmount', () => {
    const { unmount, container } = render(
      <TaskEditor initialDoc={initialDoc} onChange={() => {}} />,
    );
    expect(container.querySelector('[contenteditable="true"]')).not.toBeNull();
    unmount();
    expect(container.querySelector('[contenteditable="true"]')).toBeNull();
  });
});
