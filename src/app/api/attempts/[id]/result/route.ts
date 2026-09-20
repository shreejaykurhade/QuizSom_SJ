import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFirebaseUser } from '@/lib/auth/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireFirebaseUser(req);
    await db.refresh();
    const { id } = params;
    const attempt = db.getAttemptById(id);

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }
    if (attempt.studentId !== user.uid) {
      return NextResponse.json({ error: 'You cannot view another student’s result' }, { status: 403 });
    }

    const assessment = db.getAssessmentById(attempt.assessmentId);
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const course = db.getCourseById(assessment.courseId);
    const room = db.getRoomById(attempt.roomId);
    const allQuestions = db.getQuestions({ assessmentId: assessment.id });
    const questionMap = new Map(allQuestions.map((q) => [q.id, q]));

    // Construct detailed review questions
    const reviewQuestions = attempt.assignedQuestionIds.map((qId, index) => {
      const q = questionMap.get(qId);
      const studentAns = attempt.answers[qId];
      const selectedOptionId = studentAns?.selectedOptionId;
      const isCorrect = Boolean(q && selectedOptionId && selectedOptionId === q.correctOptionId);

      return {
        questionIndex: index + 1,
        questionId: qId,
        topic: q?.topic || 'General',
        difficulty: q?.difficulty || 'medium',
        questionText: q?.questionText || '',
        options: q?.options || [],
        selectedOptionId: selectedOptionId || null,
        correctOptionId: q?.correctOptionId || null,
        isAnswered: Boolean(studentAns?.isAnswered && selectedOptionId),
        isCorrect,
        explanation: q?.explanation || '',
        sourceCitation: q?.sourceCitation || {
          documentTitle: 'Course Syllabus',
          pageNumber: 1,
          sectionTitle: 'Course Material',
        },
      };
    });

    // Calculate leaderboard rank
    const leaderboard = room ? db.getLeaderboard(room.id, attempt.studentId) : [];
    const studentRank = leaderboard.find((entry) => entry.studentId === attempt.studentId)?.rank || 1;

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        studentName: attempt.studentName,
        studentRollNo: attempt.studentRollNo,
        status: attempt.status,
        score: attempt.score,
        percentageScore: attempt.percentageScore,
        totalQuestions: attempt.totalQuestions,
        correctCount: attempt.correctCount,
        incorrectCount: attempt.incorrectCount,
        unansweredCount: attempt.unansweredCount,
        completionDurationSeconds: attempt.completionDurationSeconds,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        fullscreenViolationCount: attempt.fullscreenViolationCount,
        tabSwitchCount: attempt.tabSwitchCount,
        autoSubmitReason: attempt.autoSubmitReason,
        performanceSummary: attempt.performanceSummary,
        rank: studentRank,
        totalParticipants: leaderboard.length || 1,
      },
      assessment: {
        id: assessment.id,
        title: assessment.title,
        moduleName: assessment.moduleName,
        assessmentType: assessment.assessmentType || 'FACULTY_EXAM',
        materialDocumentIds: assessment.materialDocumentIds,
        showLeaderboard: assessment.settings.showLeaderboard,
      },
      course: course ? {
        id: course.id,
        code: course.code,
        name: course.name,
      } : null,
      reviewQuestions,
    });
  } catch (err: any) {
    console.error('Result lookup error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch result' },
      { status: 500 }
    );
  }
}
