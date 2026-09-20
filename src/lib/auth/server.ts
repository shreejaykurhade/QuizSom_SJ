import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export type FirebaseIdentity = { uid: string; email: string; name: string };

export async function requireFirebaseUser(req: NextRequest): Promise<FirebaseIdentity> {
  // Mongo must be hydrated before any authenticated API reads or writes.
  await db.ready();

  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const idToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  // If Firebase is not configured or in local development without token, provide graceful fallback
  if (!key || key.length < 5) {
    return { uid: 'usr_faculty_default', email: 'faculty@somaiya.edu', name: 'Prof. Faculty User' };
  }

  if (!idToken) {
    if (process.env.NODE_ENV !== 'production') {
      return { uid: 'usr_faculty_default', email: 'faculty@somaiya.edu', name: 'Prof. Faculty User' };
    }
    throw new Error('AUTH_REQUIRED');
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    cache: 'no-store',
  });

  if (!response.ok) {
    if (process.env.NODE_ENV !== 'production') {
      return { uid: 'usr_faculty_default', email: 'faculty@somaiya.edu', name: 'Prof. Faculty User' };
    }
    throw new Error('AUTH_REQUIRED');
  }

  const account = (await response.json()).users?.[0];
  if (!account?.localId) {
    if (process.env.NODE_ENV !== 'production') {
      return { uid: 'usr_faculty_default', email: 'faculty@somaiya.edu', name: 'Prof. Faculty User' };
    }
    throw new Error('AUTH_REQUIRED');
  }

  return {
    uid: account.localId,
    email: account.email || '',
    name: account.displayName || account.email?.split('@')[0] || 'QuizSom user',
  };
}
