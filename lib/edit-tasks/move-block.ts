// lib/edit-tasks/move-block.ts
import type { Command } from 'prosemirror-state';

function moveBlock(direction: -1 | 1): Command {
  return (state, dispatch) => {
    const { $from } = state.selection;
    if ($from.depth < 1) return false;
    const docDepth = 0;
    const indexAtDoc = $from.index(docDepth);
    const totalBlocks = state.doc.childCount;
    const target = indexAtDoc + direction;
    if (target < 0 || target >= totalBlocks) return false;

    if (!dispatch) return true;

    const tr = state.tr;
    const blockA = state.doc.child(indexAtDoc);
    const blockB = state.doc.child(target);
    let posA = 0;
    for (let i = 0; i < indexAtDoc; i++) posA += state.doc.child(i).nodeSize;
    let posB = 0;
    for (let i = 0; i < target; i++) posB += state.doc.child(i).nodeSize;

    // Replace the larger position first to keep coordinates stable
    if (direction === -1) {
      tr.replaceWith(posA, posA + blockA.nodeSize, blockB);
      tr.replaceWith(posB, posB + blockB.nodeSize, blockA);
    } else {
      tr.replaceWith(posB, posB + blockB.nodeSize, blockA);
      tr.replaceWith(posA, posA + blockA.nodeSize, blockB);
    }
    dispatch(tr);
    return true;
  };
}

export const moveBlockUp: Command = moveBlock(-1);
export const moveBlockDown: Command = moveBlock(1);
