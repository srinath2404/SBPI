import { openDB } from 'idb';

const DB_NAME = 'sbpi-db';
const DB_VERSION = 1;

export const getDb = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pipes')) {
        const store = db.createObjectStore('pipes', {
          keyPath: 'id',
        });
        store.createIndex('by_synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains('pendingPipes')) {
        const store = db.createObjectStore('pendingPipes', {
          keyPath: 'tempId',
        });
        store.createIndex('by_synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains('auth')) {
        db.createObjectStore('auth', {
          keyPath: 'email',
        });
      }

      if (!db.objectStoreNames.contains('managerDashboard')) {
        db.createObjectStore('managerDashboard', {
          keyPath: 'email',
        });
      }

      if (!db.objectStoreNames.contains('workerDashboard')) {
        db.createObjectStore('workerDashboard', {
          keyPath: 'email',
        });
      }
    },
  });

// -------- Pipes (inventory) helpers --------

export const saveInventoryPipes = async (pipes = []) => {
  const db = await getDb();
  const tx = db.transaction('pipes', 'readwrite');
  await Promise.all(
    pipes.map((pipe) =>
      tx.store.put({
        ...pipe,
        id: pipe._id || pipe.id || pipe.tempId || `tmp-${Date.now()}`,
        synced: pipe.synced !== false,
      }),
    ),
  );
  await tx.done;
};

export const getInventoryPipes = async () => {
  const db = await getDb();
  return db.getAll('pipes');
};

export const addPendingPipe = async (pipeData) => {
  const db = await getDb();
  const tempId = Date.now();
  await db.add('pendingPipes', {
    ...pipeData,
    tempId,
    synced: false,
    createdAt: new Date().toISOString(),
  });
  return tempId;
};

export const getPendingPipes = async () => {
  const db = await getDb();
  return db.getAll('pendingPipes');
};

export const deletePendingPipe = async (tempId) => {
  const db = await getDb();
  await db.delete('pendingPipes', tempId);
};

// -------- Auth helpers --------

export const saveAuthRecord = async ({ email, token, user, passwordHash }) => {
  const db = await getDb();
  await db.put('auth', {
    email,
    token,
    user,
    passwordHash: passwordHash || null,
    updatedAt: new Date().toISOString(),
  });
};

export const getAuthRecord = async (email) => {
  const db = await getDb();
  return db.get('auth', email);
};

// -------- Dashboard caching (optional) --------

export const saveManagerDashboard = async (email, data) => {
  const db = await getDb();
  await db.put('managerDashboard', {
    email,
    data,
    updatedAt: new Date().toISOString(),
  });
};

export const getManagerDashboard = async (email) => {
  const db = await getDb();
  return db.get('managerDashboard', email);
};

export const saveWorkerDashboard = async (email, data) => {
  const db = await getDb();
  await db.put('workerDashboard', {
    email,
    data,
    updatedAt: new Date().toISOString(),
  });
};

export const getWorkerDashboard = async (email) => {
  const db = await getDb();
  return db.get('workerDashboard', email);
};
