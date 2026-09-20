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
    const body = await req.json();
    const { questionId, selectedOptionId } = body;

    if (!questionId) {
      return NextResponse.json({ error: 'questionId is required' }, { status: 400 });
    }

    const attempt = db.getAttemptById(id);
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }
    if (attempt.studentId !== user.uid) {
      return NextResponse.json({ error: 'This attempt does not belong to you' }, { status: 403 });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Cannot modify answers for a submitted or expired attempt' },
        { status: 400 }
      );
    }

    attempt.answers = attempt.answers || {};
    attempt.answers[questionId] = {
      questionId,
      selectedOptionId: selectedOptionId || undefined,
      isAnswered: Boolean(selectedOptionId),
      answeredAt: new Date().toISOString(),
    };

    // Update answered count
    const answeredCount = Object.values(attempt.answers).filter(
      (a) => a.isAnswered && a.selectedOptionId
    ).length;
    attempt.answeredCount = answeredCount;
    attempt.unansweredCount = attempt.totalQuestions - answeredCount;

    db.saveAttempt(attempt);
    await db.flush();

    return NextResponse.json({
      success: true,
      answeredCount: attempt.answeredCount,
      unansweredCount: attempt.unansweredCount,
    });
  } catch (err: any) {
    if (err.message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    console.error('Save answer error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save answer' },
      { status: 500 }
    );
  }
}
