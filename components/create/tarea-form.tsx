// STUB — replaced in Task 13
'use client';
import type { Ref } from 'react';
export function TareaForm({
  title,
  onTitleChange,
  titleRef,
}: {
  customerId: string;
  title: string;
  onTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  titleRef: Ref<HTMLInputElement>;
}) {
  return (
    <input
      ref={titleRef}
      autoFocus
      placeholder="Título de la tarea…"
      value={title}
      onChange={(e) => onTitleChange(e.target.value)}
      className="w-full text-base outline-none bg-transparent"
    />
  );
}
