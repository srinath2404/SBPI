import bcrypt from 'bcryptjs';
import api from './api';
import { saveAuthRecord, getAuthRecord } from './indexedDB';

// Perform login against backend and cache credentials for offline use.
export const loginOnline = async ({ email, password }) => {
  const response = await api.post('/auth/login', { email, password });
  const { token, user } = response.data || {};

  let passwordHash = null;
  try {
    // Hash the password before storing for offline verification.
    passwordHash = await bcrypt.hash(password, 10);
  } catch (e) {
    // If hashing fails for some reason, fall back to no hash.
    // eslint-disable-next-line no-console
    console.error('Failed to hash password for offline login', e);
  }

  await saveAuthRecord({ email, token, user, passwordHash });

  return {
    token,
    user,
    online: true,
  };
};

// Offline login using cached credentials in IndexedDB.
export const loginOffline = async ({ email, password }) => {
  const record = await getAuthRecord(email);
  if (!record) {
    throw new Error('No offline data found for this user. Please login once while online.');
  }

  if (record.passwordHash) {
    const match = await bcrypt.compare(password, record.passwordHash);
    if (!match) {
      throw new Error('Invalid credentials (offline).');
    }
  }

  return {
    token: record.token,
    user: record.user,
    online: false,
  };
};

// Unified helper that prefers online login and falls back to offline when needed.
export const loginWithOfflineSupport = async ({ email, password }) => {
  // When online, prefer server result. Only fall back to offline login
  // if the failure looks like a network / connectivity issue (no response).
  if (navigator.onLine) {
    try {
      return await loginOnline({ email, password });
    } catch (err) {
      // If there is an HTTP response, it's likely bad credentials or similar;
      // surface that error directly instead of trying offline.
      if (err && err.response) {
        throw err;
      }

      // eslint-disable-next-line no-console
      console.warn('Online login failed without response, attempting offline login', err);
      return loginOffline({ email, password });
    }
  }

  // Fully offline: use cached credentials only.
  return loginOffline({ email, password });
};
