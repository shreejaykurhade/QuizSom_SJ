import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFirebaseUser } from '@/lib/auth/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireFirebaseUser(req);
    await db.refresh();
    const { id } = params;
    const attempt = db.getAttemptById(id);
    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    if (attempt.studentId !== user.uid) return NextResponse.json({ error: 'This attempt does not belong to you' }, { status: 403 });
    const scoredAttempt = db.scoreAttempt(id);
    await db.flush();

    return NextResponse.json({
      success: true,
      attempt: scoredAttempt,
    });
  } catch (err: any) {
    if (err.message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    console.error('Submit attempt error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to submit assessment attempt' },
      { status: 500 }
    );
  }
}
