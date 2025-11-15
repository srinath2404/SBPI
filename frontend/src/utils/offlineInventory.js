import api from './api';
import {
  saveInventoryPipes,
  getInventoryPipes,
  addPendingPipe,
  getPendingPipes,
  deletePendingPipe,
} from './indexedDB';

// Fetch inventory with offline fallback.
// Online: hits /inventory/all and caches pipes in IndexedDB.
// Offline: reads from IndexedDB and merges pending pipes.
export const fetchInventoryWithOffline = async () => {
  let pipesFromServer = [];

  if (navigator.onLine) {
    const response = await api.get('/inventory/all');
    const pipesData = Array.isArray(response.data?.pipes) ? response.data.pipes : [];

    // Cache the latest pipes snapshot
    await saveInventoryPipes(pipesData);
    pipesFromServer = pipesData;
  } else {
    // Offline: read cached pipes
    pipesFromServer = await getInventoryPipes();
  }

  // Always merge in pending offline pipes for UI visibility
  const pending = await getPendingPipes();
  const pendingAsPipes = pending.map((p) => ({
    ...p,
    _id: undefined,
    pending: true,
    synced: false,
  }));

  return {
    pipes: [...pipesFromServer, ...pendingAsPipes],
  };
};

// Add pipe with offline support.
// Online: POST /inventory/add
// Offline: store in pendingPipes for later sync.
export const addPipeWithOfflineSupport = async (pipeData) => {
  if (!navigator.onLine) {
    const tempId = await addPendingPipe(pipeData);
    return {
      offline: true,
      tempId,
    };
  }

  const response = await api.post('/inventory/add', pipeData);
  return {
    offline: false,
    status: response.status,
    response: response.data,
  };
};

// Sync any pending pipes to backend when online.
export const syncPendingPipes = async () => {
  if (!navigator.onLine) return;

  const pending = await getPendingPipes();
  if (!pending.length) return;

  for (const item of pending) {
    try {
      const { tempId, ...payload } = item;
      await api.post('/inventory/add', payload);
      await deletePendingPipe(tempId);
    } catch (err) {
      // Stop on first failure to avoid hammering the server
      // Remaining items will be retried next time.
      // eslint-disable-next-line no-console
      console.error('Sync failed for pending pipe', err);
      break;
    }
  }
};
