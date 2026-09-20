import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireFirebaseUser } from '@/lib/auth/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const user = await requireFirebaseUser(req);
    const { code } = params;
    const room = db.getRoomByCode(code);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    if (room.teacherId !== user.uid) {
      return NextResponse.json({ error: 'You can start only your own rooms.' }, { status: 403 });
    }

    room.status = 'ACTIVE';
    room.startedAt = room.startedAt || new Date().toISOString();
    db.saveRoom(room);

    return NextResponse.json({
      success: true,
      room,
    });
  } catch (err: any) {
    console.error('Start room error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to start assessment room' },
      { status: 500 }
    );
  }
}
