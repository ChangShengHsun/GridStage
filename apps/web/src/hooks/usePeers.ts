import { useSyncExternalStore } from 'react';
import { peersStore } from '../collab/collab';
import type { RemotePeer } from '../collab/collab';

/** Re-renders when collaboration presence (peers/cursors) changes. */
export function usePeers(): RemotePeer[] {
  useSyncExternalStore(peersStore.subscribe, peersStore.getSnapshot);
  return peersStore.getPeers();
}
