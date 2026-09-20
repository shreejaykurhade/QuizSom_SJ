import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const courseId = url.searchParams.get('courseId') || undefined;
    const assessmentId = url.searchParams.get('assessmentId') || undefined;
    const topic = url.searchParams.get('topic') || undefined;
    const difficulty = url.searchParams.get('difficulty') || undefined;
    const search = url.searchParams.get('search') || undefined;

    const questions = db.getQuestions({
      courseId,
      assessmentId,
      topic,
      difficulty,
      search,
    });

    return NextResponse.json({
      success: true,
      questions,
      count: questions.length,
    });
  } catch (err: any) {
    console.error('Questions lookup error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
