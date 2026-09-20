import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ExamAttempt } from '@/lib/db/types';
import { requireFirebaseUser } from '@/lib/auth/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const identity = await requireFirebaseUser(req);
    await db.refresh();
    const body = await req.json();
    const studentName = identity.name;
    const studentRollNo = String(body.studentRollNo || identity.email || identity.uid);

    const room = db.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: 'Invalid room code' }, { status: 404 });
    }

    const assessment = db.getAssessmentById(room.assessmentId);
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const studentId =
      identity.uid === 'usr_faculty_default' && body.studentRollNo
        ? `usr_${body.studentRollNo.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        : identity.uid;

    // Check if attempt already exists (Attempt Lock)
    const existingAttempt = db.getAttemptByStudentAndRoom(studentId, room.id);
    if (existingAttempt) {
      return NextResponse.json({
        success: true,
        attempt: existingAttempt,
        isResumed: true,
      });
    }

    // Retrieve questions for assessment
    const allQuestions = db.getQuestions({ assessmentId: assessment.id });
    let questionPool = [...allQuestions];

    // Question pool filtering if specified
    if (
      assessment.settings.questionPoolSize &&
      assessment.settings.questionPoolSize < questionPool.length
    ) {
      // Shuffle & pick subset
      questionPool = questionPool
        .sort(() => Math.random() - 0.5)
        .slice(0, assessment.settings.questionPoolSize);
    }

    // Per-attempt question randomization
    let assignedQuestionIds = questionPool.map((q) => q.id);
    if (assessment.settings.randomizeQuestions) {
      assignedQuestionIds = assignedQuestionIds.sort(() => Math.random() - 0.5);
    }

    // Per-attempt option order randomization
    const assignedOptionOrders: Record<string, string[]> = {};
    allQuestions.forEach((q) => {
      let optIds = q.options.map((o) => o.id);
      if (assessment.settings.randomizeOptions) {
        optIds = optIds.sort(() => Math.random() - 0.5);
      }
      assignedOptionOrders[q.id] = optIds;
    });

    const now = new Date();
    const durationMinutes = assessment.settings.durationMinutes || 15;
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();

    const newAttempt: ExamAttempt = {
      id: `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      roomId: room.id,
      assessmentId: assessment.id,
      studentId,
      studentName: studentName.trim(),
      studentRollNo: studentRollNo ? studentRollNo.trim().toUpperCase() : studentId,
      status: 'IN_PROGRESS',
      startedAt: now.toISOString(),
      expiresAt,
      assignedQuestionIds,
      assignedOptionOrders,
      answers: {},
      totalQuestions: assignedQuestionIds.length,
      answeredCount: 0,
      unansweredCount: assignedQuestionIds.length,
      correctCount: 0,
      incorrectCount: 0,
      score: 0,
      percentageScore: 0,
      fullscreenViolationCount: 0,
      tabSwitchCount: 0,
      integrityEvents: [],
    };

    db.saveAttempt(newAttempt);

    // Update room participant count
    room.participantCount = (room.participantCount || 0) + 1;
    db.saveRoom(room);
    await db.flush();

    return NextResponse.json({
      success: true,
      attempt: newAttempt,
      isResumed: false,
    });
  } catch (err: any) {
    if (err.message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    console.error('Student join error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to join assessment room' },
      { status: 500 }
    );
  }
}
