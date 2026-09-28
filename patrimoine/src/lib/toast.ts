// Bandeau d'information en bas d'écran (avec « Annuler » éventuel).

export interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(message: string, undo?: () => void) {
  current = { id: Date.now(), message, undo };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, 6000);
  emit();
}

export function dismissToast() {
  current = null;
  if (timer) clearTimeout(timer);
  emit();
}


export function subscribeToast(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function currentToast(): Toast | null {
  return current;
}
