import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFirebaseUser } from '@/lib/auth/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireFirebaseUser(req);
    const { id } = params;
    const assessment = db.getAssessmentById(id);
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    if (assessment.teacherId !== user.uid) return NextResponse.json({ error: 'Not allowed to view another faculty member’s analytics' }, { status: 403 });

    const course = db.getCourseById(assessment.courseId);
    const analytics = db.getAssessmentAnalytics(id);
    const rooms = db.getRoomsByAssessmentId(id);
    const attempts = db.getAttemptsByAssessment(id);

    // Build integrity student audit list
    const integrityAuditList = attempts.map((a) => ({
      attemptId: a.id,
      studentName: a.studentName,
      studentRollNo: a.studentRollNo,
      scorePercentage: a.percentageScore,
      status: a.status,
      fullscreenExits: a.fullscreenViolationCount || 0,
      tabSwitches: a.tabSwitchCount || 0,
      totalIntegrityEvents: (a.fullscreenViolationCount || 0) + (a.tabSwitchCount || 0),
      autoSubmitReason: a.autoSubmitReason,
      completionDurationSeconds: a.completionDurationSeconds,
      submittedAt: a.submittedAt,
    })).sort((a, b) => b.totalIntegrityEvents - a.totalIntegrityEvents);

    return NextResponse.json({
      success: true,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        moduleName: assessment.moduleName,
        courseName: course?.name || 'Course',
        courseCode: course?.code || 'CS',
        createdAt: assessment.createdAt,
        status: assessment.status,
        settings: assessment.settings,
      },
      rooms,
      analytics,
      integrityAuditList,
    });
  } catch (err: any) {
    if (err.message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    console.error('Analytics error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch assessment analytics' },
      { status: 500 }
    );
  }
}
