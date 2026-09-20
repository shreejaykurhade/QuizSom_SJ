import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFirebaseUser } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireFirebaseUser(req);
    await db.ready();

    const roomsData = db.getPlaygroundRooms(user.uid);

    return NextResponse.json({
      success: true,
      rooms: roomsData,
      totalCount: roomsData.length,
    });
  } catch (err: any) {
    if (err.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    console.error('Playground rooms list error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch playground rooms' },
      { status: 500 }
    );
  }
}
