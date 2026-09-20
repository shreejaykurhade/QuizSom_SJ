import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFirebaseUser } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireFirebaseUser(req);
    const assessments = db.getAssessments().filter(assessment => assessment.teacherId === user.uid);
    const ownedRooms = assessments
      .flatMap(assessment => db.getRoomsByAssessmentId(assessment.id))
      .filter(room => room.teacherId === user.uid);
    const courses = db.getCourses();
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const enrichedAssessments = assessments.map((a) => {
      const course = courseMap.get(a.courseId);
      const attempts = db.getAttemptsByAssessment(a.id);
      const rooms = ownedRooms.filter(room => room.assessmentId === a.id);
      const activeRoom = rooms.find((r) => r.status === 'ACTIVE') || rooms[0];

      let avgScore = 0;
      if (attempts.length > 0) {
        const sum = attempts.reduce((acc, curr) => acc + curr.percentageScore, 0);
        avgScore = Math.round(sum / attempts.length);
      }

      return {
        id: a.id,
        title: a.title,
        moduleName: a.moduleName,
        courseName: course?.name || 'Computer Science',
        courseCode: course?.code || 'CS',
        totalQuestions: a.questionIds.length,
        durationMinutes: a.settings.durationMinutes,
        status: a.status,
        participants: attempts.length,
        averageScore: avgScore,
        roomCode: activeRoom?.code || null,
        rooms: rooms.map((room) => ({
          id: room.id,
          code: room.code,
          status: room.status,
          startedAt: room.startedAt,
          participantCount: db.getAttemptsByRoom(room.id).length,
        })),
        createdAt: a.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      account: { uid: user.uid, email: user.email },
      assessments: enrichedAssessments,
    });
  } catch (err: any) {
    if (err.message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    console.error('Assessments fetch error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}
