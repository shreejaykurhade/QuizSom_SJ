'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import {
  BookOpenCheck,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { apiFetch } from '@/lib/auth/apiFetch';
import SourcePagePreview from '@/components/SourcePagePreview';

export default function StudentChatPage() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const samplePrompts = [
    'What are the core concepts and definitions covered in my notes?',
    'Explain the key differences between the main algorithms discussed in the slides.',
    'What are the step-by-step procedures outlined in the course material?',
  ];

  const ask = async (e: FormEvent, queryText?: string) => {
    if (e) e.preventDefault();
    const query = queryText || question;
    if (!query.trim() || busy) return;

    setBusy(true);
    setError('');
    try {
      const res = await apiFetch('/api/student/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to query course notes');
      setAnswer(body);
    } catch (cause: any) {
      setError(cause.message || 'Could not find an answer in assigned notes.');
    } finally {
      setBusy(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setQuestion(prompt);
    void ask(undefined as any, prompt);
  };

  const answerPoints = answer
    ? Array.isArray(answer.answer)
      ? answer.answer
      : [answer.answer]
    : [];

  return (
    <div className="min-w-0 space-y-6 max-w-5xl mx-auto pb-20">
      {/* ── Top Header ── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Ask Your Course Notes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
            Ask questions directly from syllabus lecture slides and notes assigned to your joined rooms. Every answer is strictly grounded with original PDF page citations as proof.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 relative z-10">
          <Link
            href="/student/materials"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>View Notes</span>
          </Link>
        </div>
      </div>

      {/* ── Query Input Box ── */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
        <form onSubmit={ask} className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full flex items-center">
            <MessageSquareText className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none z-10" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything from your notes (e.g., Explain the two-phase commit protocol)..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 py-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:bg-white transition-all font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={busy || !question.trim()}
            className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow disabled:opacity-40 cursor-pointer shrink-0"
          >
            {busy ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Searching Notes...</span>
              </>
            ) : (
              <>
                <span>Ask Notes</span>
                <Send className="w-3.5 h-3.5 text-slate-300" />
              </>
            )}
          </button>
        </form>

        {/* Suggested Prompts */}
        {!answer && (
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
            <span className="font-mono text-[10px] text-slate-400 uppercase font-bold shrink-0">
              Try asking:
            </span>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePromptClick(p)}
                  className="max-w-full text-left text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all cursor-pointer whitespace-normal break-words sm:max-w-md"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Error Notification ── */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Grounded Answer & Source Citations ── */}
      {answer && (
        <div className="space-y-6">
          {/* Answer Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider">
                  Grounded Answer from Notes
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                Strict Proof ✓
              </span>
            </div>

            <ol className="space-y-3 pt-1">
              {answerPoints.map((point: string, index: number) => (
                <li key={index} className="flex items-start gap-3 text-xs sm:text-sm leading-relaxed text-slate-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-mono font-bold text-white mt-0.5">
                    {index + 1}
                  </span>
                  <span className="min-w-0 break-words [overflow-wrap:anywhere] font-normal">{point}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Source Citations & PDF Page Proof */}
          {answer.citations && answer.citations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
                  Exact Source Page Citations ({answer.citations.length})
                </h3>
              </div>

              <div className="space-y-3">
                {answer.citations.map((citation: any, index: number) => (
                  <article
                    key={`${citation.documentId}-${citation.pageNumber}-${index}`}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                          <h4 className="text-xs font-bold text-slate-900">{citation.documentTitle}</h4>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Page {citation.pageNumber} · {citation.sectionTitle || citation.sourceLabel || 'Document Section'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-bold shrink-0">
                        Citation #{index + 1}
                      </span>
                    </div>

                    <SourcePagePreview citation={citation} />
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
