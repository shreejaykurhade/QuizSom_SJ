'use client';

import { firebaseAuth } from '@/lib/firebase/client';

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  let token: string | undefined;
  try {
    if (firebaseAuth) {
      // If user isn't immediately populated in memory, wait a brief moment for Firebase auth state to resolve
      let currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        currentUser = await new Promise((resolve) => {
          const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
          });
          setTimeout(() => {
            unsubscribe();
            resolve(null);
          }, 1500);
        });
      }

      if (currentUser) {
        token = await currentUser.getIdToken();
      }
    }
  } catch (err) {
    // Token extraction silent fallback
  }

  return fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
