import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFirebaseUser } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const user = await requireFirebaseUser(req);
    await db.refresh();

    const roomCode = params.code?.toUpperCase()?.trim();
    if (!roomCode) {
      return NextResponse.json({ error: 'Room code required' }, { status: 400 });
    }

    const data = db.getPlaygroundLeaderboard(roomCode);
    if (!data.room) {
      return NextResponse.json({ error: 'Playground room not found' }, { status: 404 });
    }

    const myAttempt = data.leaderboard.find((p) => p.studentId === user.uid);

    return NextResponse.json({
      success: true,
      room: data.room,
      assessment: data.assessment,
      leaderboard: data.leaderboard,
      myRank: myAttempt?.rank,
      myScore: myAttempt?.percentageScore,
      hasParticipated: Boolean(myAttempt),
      totalParticipants: data.leaderboard.length,
    });
  } catch (err: any) {
    if (err.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    console.error('Playground leaderboard error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
