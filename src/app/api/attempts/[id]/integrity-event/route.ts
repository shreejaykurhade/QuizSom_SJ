import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { IntegrityEventType } from '@/lib/db/types';
import { requireFirebaseUser } from '@/lib/auth/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireFirebaseUser(req);
    await db.refresh();
    const { id } = params;
    const body = await req.json();
    const { eventType, questionIndex, timeRemainingSeconds, metadata } = body;

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 });
    }

    const existingAttempt = db.getAttemptById(id);
    if (!existingAttempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    if (existingAttempt.studentId !== user.uid) return NextResponse.json({ error: 'This attempt does not belong to you' }, { status: 403 });

    const { attempt, shouldAutoSubmit, violationCount } = db.recordIntegrityEvent(
      id,
      eventType as IntegrityEventType,
      {
        questionIndex,
        timeRemainingSeconds,
        ...metadata,
      }
    );

    // If second fullscreen exit triggered auto-submit, calculate score immediately
    if (shouldAutoSubmit) {
      db.scoreAttempt(id);
    }
    await db.flush();

    return NextResponse.json({
      success: true,
      attempt,
      shouldAutoSubmit,
      violationCount,
      tabSwitchCount: attempt.tabSwitchCount,
      status: attempt.status,
      autoSubmitReason: attempt.autoSubmitReason,
    });
  } catch (err: any) {
    if (err.message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    console.error('Record integrity event error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to record integrity event' },
      { status: 500 }
    );
  }
}
