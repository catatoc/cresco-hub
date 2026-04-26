// STUB — replaced in Task 14
'use client';
import type { Ref } from 'react';
export function WikiForm({
  title,
  onTitleChange,
  titleRef,
}: {
  customerId: string;
  title: string;
  onTitleChange: (v: string) => void;
  titleRef: Ref<HTMLInputElement>;
}) {
  return (
    <input
      ref={titleRef}
      autoFocus
      placeholder="Título de la página…"
      value={title}
      onChange={(e) => onTitleChange(e.target.value)}
      className="w-full text-base outline-none bg-transparent"
    />
  );
}
