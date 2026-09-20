import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { geminiEngine } from '@/lib/gemini/client';
import { DocumentMaterial } from '@/lib/db/types';
import { requireFirebaseUser } from '@/lib/auth/server';
import { hasIncompleteOptionText } from '@/lib/gemini/client';

export const dynamic = 'force-dynamic';

async function generateQuestionsFromTopicPrompt(
  topic: string,
  totalQuestions: number = 5,
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed' = 'mixed'
) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = `You are an expert university professor creating a competitive peer-challenge quiz for engineering/college students.
Create exactly ${totalQuestions} high-quality, conceptual, and applied multiple-choice questions on the topic: "${topic}".
Difficulty level: ${difficulty}.

Requirements:
1. Each question must test genuine conceptual mastery, problem-solving, or system behavior.
2. Provide exactly 4 plausible, clear options (A, B, C, D) for each question with IDs "opt_1", "opt_2", "opt_3", "opt_4".
3. Exactly ONE option must be correct. Specify "correctOptionId" as "opt_1", "opt_2", "opt_3", or "opt_4".
4. Provide a clear, educational step-by-step explanation.
5. Provide a realistic academic subtopic name for each item.
6. Every option must be complete. Never shorten text and never end an option with "..." or "…".

Return valid JSON adhering strictly to this schema:
{
  "questions": [
    {
      "id": "q_1",
      "topic": "${topic}",
      "difficulty": "medium",
      "questionText": "What is the primary operational advantage of...",
      "options": [
        { "id": "opt_1", "text": "Option A explanation" },
        { "id": "opt_2", "text": "Option B explanation" },
        { "id": "opt_3", "text": "Option C explanation" },
        { "id": "opt_4", "text": "Option D explanation" }
      ],
      "correctOptionId": "opt_1",
      "explanation": "Detailed explanation of why opt_1 is correct.",
      "sourceCitation": {
        "documentTitle": "${topic} Reference",
        "pageNumber": 1,
        "sectionTitle": "${topic} Fundamentals"
      }
    }
  ]
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      }),
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) {
    throw new Error('Empty response from Gemini API');
  }

  const parsed = JSON.parse(jsonText);
  return (parsed.questions || []).filter((question: any) => !hasIncompleteOptionText(question));
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireFirebaseUser(req);
    await db.ready();

    const body = await req.json();
    const {
      documentIds = [],
      topic = '',
      totalQuestions = 5,
      difficulty = 'mixed',
      title = 'Student Peer Challenge',
    } = body;

    const count = Math.min(Math.max(Number(totalQuestions) || 5, 3), 20);

    // If specific uploaded course materials are selected
    if (Array.isArray(documentIds) && documentIds.length > 0) {
      const documents = documentIds
        .map((id: string) => db.getDocumentById(id))
        .filter(Boolean) as DocumentMaterial[];

      if (documents.length > 0) {
        const generated = await geminiEngine.generateQuestions({
          documents,
          courseId: `playground_${user.uid}`,
          assessmentTitle: title,
          totalQuestions: count,
          difficulty,
          topicFocus: topic || undefined,
        });

        return NextResponse.json({
          success: true,
          questions: generated,
          count: generated.length,
          sourceType: 'DOCUMENTS',
        });
      }
    }

    // Otherwise generate from academic topic prompt
    const cleanTopic = String(topic || title || 'Computer Science & Engineering').trim();
    const questions = await generateQuestionsFromTopicPrompt(cleanTopic, count, difficulty);

    return NextResponse.json({
      success: true,
      questions,
      count: questions.length,
      sourceType: 'TOPIC_PROMPT',
    });
  } catch (err: any) {
    if (err.message === 'AUTH_REQUIRED') {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    console.error('Playground generation error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate playground questions' },
      { status: 500 }
    );
  }
}
