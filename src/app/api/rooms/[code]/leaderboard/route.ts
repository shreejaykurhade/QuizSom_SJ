import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await db.refresh();
    const { code } = params;
    const url = new URL(req.url);
    const studentId = url.searchParams.get('studentId') || undefined;

    const room = db.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const assessment = db.getAssessmentById(room.assessmentId);
    const leaderboard = db.getLeaderboard(room.id, studentId);

    return NextResponse.json({
      success: true,
      roomCode: room.code,
      assessmentTitle: assessment?.title || 'Assessment',
      privacyMode: assessment?.settings.showLeaderboard || 'PUBLIC',
      leaderboard,
    });
  } catch (err: any) {
    console.error('Leaderboard error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
