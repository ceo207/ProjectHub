import { useState, useEffect } from "react";

export type ToastType = "success" | "error";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];
let nextId = 0;

function emit() {
  listeners.forEach((fn) => fn([...toasts]));
}

export function toast(message: string, type: ToastType = "success", duration = 3000) {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, duration);
}

export function useToasts() {
  const [state, setState] = useState<Toast[]>(toasts);
  useEffect(() => {
    listeners.push(setState);
    return () => { listeners = listeners.filter((l) => l !== setState); };
  }, []);
  return state;
}
