// Transient password-recovery state.
//
// Lives ONLY in memory for the current tab. Never persisted to
// localStorage/sessionStorage. Set when Supabase emits PASSWORD_RECOVERY;
// cleared on SIGNED_OUT or after a successful password update.
//
// Consumed by route guards (_authenticated, admin shell) to keep the
// recovery session from leaking into authenticated areas.
import { useSyncExternalStore } from "react";

type Listener = () => void;

let recovering = false;
const listeners = new Set<Listener>();

export function isInRecovery(): boolean {
  return recovering;
}

export function setRecovering(next: boolean) {
  if (recovering === next) return;
  recovering = next;
  console.info("[recovery-state] change", { isRecovering: next });
  for (const l of listeners) l();
}

function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot() {
  return recovering;
}

function getServerSnapshot() {
  return false;
}

export function useRecoveryState(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
