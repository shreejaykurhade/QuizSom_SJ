import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await db.refresh();
    const { code } = params;
    const room = db.getRoomByCode(code);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const attempts = db.getAttemptsByRoom(room.id);
    const assessment = db.getAssessmentById(room.assessmentId);

    const participants = attempts.map((a) => ({
      id: a.id,
      studentName: a.studentName,
      studentRollNo: a.studentRollNo,
      status: a.status,
      answeredCount: a.answeredCount,
      totalQuestions: a.totalQuestions,
      fullscreenViolations: a.fullscreenViolationCount || 0,
      tabSwitches: a.tabSwitchCount || 0,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
    }));

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        code: room.code,
        status: room.status,
        startedAt: room.startedAt,
        participantCount: participants.length,
      },
      assessment: assessment ? {
        id: assessment.id,
        title: assessment.title,
        moduleName: assessment.moduleName,
        durationMinutes: assessment.settings.durationMinutes,
        totalQuestions: assessment.settings.totalQuestions,
      } : null,
      participants,
    });
  } catch (err: any) {
    console.error('Live room error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch live room state' },
      { status: 500 }
    );
  }
}
