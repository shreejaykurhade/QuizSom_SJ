import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Assessment, Question } from '@/lib/db/types';
import { requireFirebaseUser } from '@/lib/auth/server';
import { hasIncompleteOptionText } from '@/lib/gemini/client';

export async function POST(req: NextRequest) {
  try {
    const user = await requireFirebaseUser(req);
    const body = await req.json();
    const {
      courseId = `course_${user.uid}`,
      title,
      moduleName,
      description,
      materialDocumentIds = [],
      questions = [],
      settings,
      customRoomCode,
    } = body;
    const teacherId = user.uid;

    if (materialDocumentIds.some((id: string) => db.getDocumentById(id)?.ownerId !== teacherId)) {
      return NextResponse.json({ error: 'You can only publish assessments from your own uploaded material' }, { status: 403 });
    }

    if (!title || questions.length === 0) {
      return NextResponse.json(
        { error: 'Title and at least one question are required' },
        { status: 400 }
      );
    }
    if (questions.some((question: any) => hasIncompleteOptionText(question))) {
      return NextResponse.json(
        { error: 'One or more answer options are incomplete. Regenerate or edit options ending in an ellipsis before publishing.' },
        { status: 422 }
      );
    }

    const assessmentId = `assess_${Date.now()}`;

    // Format & save questions
    const formattedQuestions: Question[] = questions.map((q: any, idx: number) => ({
      ...q,
      id: q.id || `q_${assessmentId}_${idx + 1}`,
      assessmentId,
      courseId,
    }));

    db.saveQuestionsBatch(formattedQuestions);

    const assessment: Assessment = {
      id: assessmentId,
      courseId,
      teacherId,
      title,
      moduleName: moduleName || 'Course Assessment',
      description: description || '',
      materialDocumentIds,
      questionIds: formattedQuestions.map((q) => q.id),
      settings: {
        durationMinutes: Number(settings?.durationMinutes || 15),
        totalQuestions: formattedQuestions.length,
        difficultyDistribution: settings?.difficultyDistribution || 'mixed',
        randomizeQuestions: settings?.randomizeQuestions !== false,
        randomizeOptions: settings?.randomizeOptions !== false,
        positiveMarks: Number(settings?.positiveMarks || 1.0),
        negativeMarks: Number(settings?.negativeMarks ?? 0.25),
        allowReviewAfterSubmit: settings?.allowReviewAfterSubmit !== false,
        showLeaderboard: settings?.showLeaderboard || 'PUBLIC',
        requireFullscreen: settings?.requireFullscreen !== false,
        maxFullscreenViolations: Number(settings?.maxFullscreenViolations || 2),
      },
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveAssessment(assessment);

    // Create live room
    const liveRoom = db.createRoomForAssessment(assessment.id, teacherId, customRoomCode);

    return NextResponse.json({
      success: true,
      assessment,
      room: liveRoom,
    });
  } catch (err: any) {
    if (err.message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    console.error('Publish assessment error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to publish assessment' },
      { status: 500 }
    );
  }
}
