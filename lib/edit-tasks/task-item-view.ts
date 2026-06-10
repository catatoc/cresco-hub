import type { Node as PMNode } from 'prosemirror-model';
import type { EditorView, NodeView, ViewMutationRecord } from 'prosemirror-view';

export class TaskItemView implements NodeView {
  dom: HTMLLIElement;
  contentDOM: HTMLDivElement;
  private checkbox: HTMLSpanElement;
  private node: PMNode;
  private view: EditorView;
  private getPos: () => number | undefined;

  constructor(node: PMNode, view: EditorView, getPos: () => number | undefined) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;

    this.dom = document.createElement('li');
    this.dom.setAttribute('data-type', 'task_item');
    this.dom.setAttribute('data-checked', String(node.attrs.checked));

    this.checkbox = document.createElement('span');
    this.checkbox.setAttribute('data-checkbox', '');
    this.checkbox.setAttribute('contenteditable', 'false');
    this.checkbox.setAttribute('aria-hidden', 'true');
    this.checkbox.addEventListener('mousedown', this.onCheckboxMouseDown);

    this.contentDOM = document.createElement('div');
    this.contentDOM.setAttribute('data-content', '');

    this.dom.appendChild(this.checkbox);
    this.dom.appendChild(this.contentDOM);
  }

  private onCheckboxMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = this.getPos();
    if (typeof pos !== 'number') return;
    const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
      ...this.node.attrs,
      checked: !this.node.attrs.checked,
    });
    this.view.dispatch(tr);
  };

  update(node: PMNode): boolean {
    if (node.type.name !== 'task_item') return false;
    this.node = node;
    this.dom.setAttribute('data-checked', String(node.attrs.checked));
    return true;
  }

  stopEvent(event: Event): boolean {
    return event.target === this.checkbox;
  }

  ignoreMutation(mutation: ViewMutationRecord): boolean {
    if (mutation.type === 'selection') return false;
    if (mutation.type === 'attributes' && mutation.target === this.dom) return true;
    return this.checkbox.contains(mutation.target as Node);
  }

  destroy(): void {
    this.checkbox.removeEventListener('mousedown', this.onCheckboxMouseDown);
  }
}
