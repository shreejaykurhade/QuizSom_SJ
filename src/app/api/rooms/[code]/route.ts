import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFirebaseUser } from '@/lib/auth/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await db.refresh();
    const { code } = params;
    const room = db.getRoomByCode(code);

    if (!room) {
      return NextResponse.json({ error: 'Invalid room code' }, { status: 404 });
    }

    const assessment = db.getAssessmentById(room.assessmentId);
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const course = db.getCourseById(assessment.courseId);

    // Sanitize question list — STRICTLY STRIP OUT correctOptionId and explanation!
    const questions = db.getQuestions({ assessmentId: assessment.id });
    const sanitizedQuestions = questions.map((q) => ({
      id: q.id,
      topic: q.topic,
      difficulty: q.difficulty,
      questionText: q.questionText,
      options: q.options, // Contains id and text only
    }));

    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        code: room.code,
        status: room.status,
        startedAt: room.startedAt,
        participantCount: room.participantCount,
      },
      assessment: {
        id: assessment.id,
        title: assessment.title,
        moduleName: assessment.moduleName,
        description: assessment.description,
        settings: assessment.settings,
        totalQuestions: sanitizedQuestions.length,
      },
      course: course ? {
        id: course.id,
        code: course.code,
        name: course.name,
        department: course.department,
      } : null,
      questions: sanitizedQuestions,
    });
  } catch (err: any) {
    console.error('Room lookup error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch room' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const user = await requireFirebaseUser(req);
    await db.refresh();
    const room = db.getRoomByCode(params.code);
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (room.teacherId !== user.uid) return NextResponse.json({ error: 'You can edit only your own rooms.' }, { status: 403 });
    const body = await req.json();
    if (body.status && !['WAITING', 'ACTIVE', 'COMPLETED', 'EXPIRED'].includes(body.status)) return NextResponse.json({ error: 'Invalid room status' }, { status: 400 });
    if (body.code) {
      const code = String(body.code).trim().toUpperCase();
      if (!/^[A-Z0-9]{4,10}$/.test(code)) return NextResponse.json({ error: 'Room code must be 4–10 letters or numbers.' }, { status: 400 });
      const duplicate = db.getRoomByCode(code);
      if (duplicate && duplicate.id !== room.id) return NextResponse.json({ error: 'That room code is already in use.' }, { status: 409 });
      room.code = code;
    }
    if (body.status) {
      room.status = body.status;
      if (body.status === 'ACTIVE') room.startedAt = room.startedAt || new Date().toISOString();
      if (body.status === 'COMPLETED') room.endedAt = new Date().toISOString();
    }
    db.saveRoom(room);
    await db.flush();
    return NextResponse.json({ success: true, room });
  } catch (err: any) {
    return NextResponse.json({ error: err.message === 'AUTH_REQUIRED' ? 'Sign in required' : 'Could not update room' }, { status: err.message === 'AUTH_REQUIRED' ? 401 : 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const user = await requireFirebaseUser(req);
    await db.refresh();
    const room = db.getRoomByCode(params.code);
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (room.teacherId !== user.uid) return NextResponse.json({ error: 'You can delete only your own rooms.' }, { status: 403 });
    if (db.getAttemptsByRoom(room.id).length > 0) return NextResponse.json({ error: 'This room has student attempts. End it instead so results remain available.' }, { status: 409 });
    db.deleteRoom(room.id);
    await db.flush();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message === 'AUTH_REQUIRED' ? 'Sign in required' : 'Could not delete room' }, { status: err.message === 'AUTH_REQUIRED' ? 401 : 500 });
  }
}
