import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Assessment, Question } from '@/lib/db/types';
import { requireFirebaseUser } from '@/lib/auth/server';
import { hasIncompleteOptionText } from '@/lib/gemini/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await requireFirebaseUser(req);
    await db.ready();

    const body = await req.json();
    const {
      title = 'Student Peer Challenge',
      topic = 'General Subject',
      materialDocumentIds = [],
      questions = [],
      settings,
      customRoomCode,
    } = body;

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'At least one question is required to launch a playground room' },
        { status: 400 }
      );
    }
    if (questions.some((question: any) => hasIncompleteOptionText(question))) {
      return NextResponse.json(
        { error: 'One or more answer options are incomplete. Regenerate or edit them before launching the room.' },
        { status: 422 }
      );
    }

    const studentName =
      user.name ||
      (user.email
        ? user.email
            .split('@')[0]
            .replace(/[._-]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Student Creator');

    const assessmentId = `pg_assess_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const courseId = `playground_${user.uid}`;

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
      teacherId: user.uid, // mapped to student creator
      title: title.trim(),
      moduleName: topic || 'Peer Challenge Battle',
      description: `Student peer challenge created by ${studentName}`,
      materialDocumentIds,
      questionIds: formattedQuestions.map((q) => q.id),
      assessmentType: 'PLAYGROUND',
      creatorRole: 'STUDENT',
      creatorStudentId: user.uid,
      creatorStudentName: studentName,
      settings: {
        durationMinutes: Number(settings?.durationMinutes || 10),
        totalQuestions: formattedQuestions.length,
        difficultyDistribution: settings?.difficultyDistribution || 'mixed',
        randomizeQuestions: settings?.randomizeQuestions !== false,
        randomizeOptions: settings?.randomizeOptions !== false,
        positiveMarks: Number(settings?.positiveMarks || 1.0),
        negativeMarks: Number(settings?.negativeMarks ?? 0.0), // default 0 for friendly peer quizzes
        allowReviewAfterSubmit: true,
        showLeaderboard: 'PUBLIC',
        requireFullscreen: false, // relaxed proctoring for friendly playground quizzes
        maxFullscreenViolations: 99,
      },
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveAssessment(assessment);

    // Create Live Room with custom code or generated code
    const liveRoom = db.createRoomForAssessment(
      assessment.id,
      user.uid,
      customRoomCode,
      {
        assessmentType: 'PLAYGROUND',
        creatorRole: 'STUDENT',
        creatorStudentId: user.uid,
        creatorStudentName: studentName,
      }
    );

    return NextResponse.json({
      success: true,
      assessment,
      room: liveRoom,
      roomCode: liveRoom.code,
      shareUrl: `/exam/${liveRoom.code}`,
      leaderboardUrl: `/student/playground/rooms/${liveRoom.code}`,
    });
  } catch (err: any) {
    if (err.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    console.error('Playground creation error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create playground quiz' },
      { status: 500 }
    );
  }
}
