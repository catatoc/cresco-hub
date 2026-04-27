'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { CreateModal } from './create-modal';

export type CreateType = 'task' | 'wiki';

type CreateContextValue = {
  isOpen: boolean;
  type: CreateType;
  open: (type?: CreateType) => void;
  close: () => void;
  setType: (type: CreateType) => void;
};

const CreateContext = createContext<CreateContextValue | null>(null);

export function useCreateContext(): CreateContextValue {
  const v = useContext(CreateContext);
  if (!v) throw new Error('useCreateContext must be used inside <CreateProvider>');
  return v;
}

const STORAGE_KEY = 'create:last-type';

function readInitialType(): CreateType {
  if (typeof window === 'undefined') return 'task';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'wiki' ? 'wiki' : 'task';
}

function isEditableTarget(target: EventTarget | null): boolean {
  // Check both the event target and the currently focused element (document.activeElement),
  // because when the event fires on `window`, the target may not reflect the focused input.
  const candidates = [target, document.activeElement];
  for (const el of candidates) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  }
  return false;
}

function isAnotherDialogOpen(): boolean {
  return document.querySelector('[role="dialog"][data-state="open"]') !== null;
}

export type CreateMember = { id: string; name: string };
export type CreateSprintDefault = { id: string; name: string };

export function CreateProvider({
  customerId,
  currentMember,
  currentSprint,
  children,
}: {
  customerId: string;
  currentMember?: CreateMember;
  currentSprint?: CreateSprintDefault | null;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setTypeState] = useState<CreateType>('task');

  // Restore last type once on mount.
  useEffect(() => {
    setTypeState(readInitialType());
  }, []);

  const open = useCallback((t?: CreateType) => {
    if (t) {
      setTypeState(t);
      window.localStorage.setItem(STORAGE_KEY, t);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const setType = useCallback((t: CreateType) => {
    setTypeState(t);
    window.localStorage.setItem(STORAGE_KEY, t);
  }, []);

  // Global C hotkey with guards.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'c') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      if (isAnotherDialogOpen()) return;
      e.preventDefault();
      // Override contextual: if URL is /wiki/..., open as wiki.
      if (window.location.pathname.startsWith('/wiki/')) {
        setTypeState('wiki');
      }
      setIsOpen(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <CreateContext.Provider value={{ isOpen, type, open, close, setType }}>
      {children}
      {isOpen && (
        <CreateModal
          customerId={customerId}
          currentMember={currentMember}
          currentSprint={currentSprint ?? null}
        />
      )}
    </CreateContext.Provider>
  );
}
