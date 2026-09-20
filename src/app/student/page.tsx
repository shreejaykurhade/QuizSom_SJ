'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  History,
  MessageSquareText,
  PlusCircle,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/auth/apiFetch';

export default function StudentPortalPage() {
  const [code, setCode] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = () => {
    setLoading(true);
    apiFetch('/api/student/history')
      .then((r) => (r.ok ? r.json() : { history: [] }))
      .then((data) => setHistory(data.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));

    apiFetch('/api/student/materials')
      .then((r) => (r.ok ? r.json() : { materials: [] }))
      .then((data) => setMaterialsCount(data.materials?.length || 0))
      .catch(() => setMaterialsCount(0));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (/^[A-Z0-9]{6}$/i.test(code)) {
      router.push(`/exam/${code.toUpperCase()}`);
    }
  };

  const completed = history.filter(
    (item) => item.status === 'COMPLETED' || item.status === 'AUTO_SUBMITTED'
  );

  return (
    <main className="space-y-7">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Your Quizzes & Faculty Study Materials
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Join assessment rooms shared by faculty, read uploaded lecture notes, and study from source-grounded materials.
          </p>
        </div>
        <button
          onClick={load}
          className="btn-secondary py-2 px-3 text-xs font-bold self-start sm:self-auto"
        >
          <RefreshCw className={`mr-1 inline w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Minimal & Professional Room Access Section */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Join Assessment Room
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg">
              Enter your 6-character room code to access proctored faculty exams or student peer battle rooms.
            </p>
          </div>

          <form onSubmit={submit} className="flex items-center gap-2.5 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-60">
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
                  )
                }
                className="w-full h-11 rounded-xl border-2 border-slate-900 bg-white px-4 text-center font-mono text-base font-bold tracking-[0.25em] text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs focus:ring-2 focus:ring-slate-900/20 focus:outline-none transition-all"
                placeholder="Enter 6-char code"
              />
            </div>
            <button
              type="submit"
              disabled={!/^[A-Z0-9]{6}$/.test(code)}
              className="relative overflow-hidden h-11 px-5 rounded-xl border-2 border-slate-900 bg-white hover:bg-slate-50 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed shadow-xs group"
            >
              {/* Richer Mesh gradient background with darker presence */}
              <div
                className="absolute inset-0 pointer-events-none opacity-60 bg-cover bg-center transition-opacity group-hover:opacity-80 group-disabled:opacity-40"
                style={{ backgroundImage: 'url(/gemini-mesh-gradient.png)' }}
              />
              <span className="relative z-10 text-slate-950 font-extrabold">Join Room</span>
              <ArrowRight className="relative z-10 w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
            </button>
          </form>
        </div>
      </section>

      {/* 3-Column Action Hub */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Student Playground */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <span className="text-base">🏆</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Playground Battles</h3>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              Upload your own study PDFs, customize rule sets, create peer rooms, and compete on student leaderboards.
            </p>
          </div>

          <div className="pt-1">
            <Link
              href="/student/playground"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <span>Explore Playground</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Card 2: Study Materials */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Faculty Study Materials</h3>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              Access lecture slides, textbook modules, and syllabus documents uploaded by your faculty members.
            </p>
          </div>

          <div className="pt-1 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 font-semibold">
              {materialsCount} Document{materialsCount === 1 ? '' : 's'} available
            </span>
            <Link
              href="/student/materials"
              className="py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center gap-1 transition-all"
            >
              <span>View Materials</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Card 3: Study Chatbot */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                <MessageSquareText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Ask Assigned Notes</h3>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              Ask questions directly from your assigned syllabus and notes with verified exact textbook citations.
            </p>
          </div>

          <div className="pt-1">
            <Link
              href="/student/chat"
              className="py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 w-full transition-all"
            >
              <span>Open Study Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </div>

      {/* Past Quizzes Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-500 font-bold uppercase">YOUR PROGRESS</p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">Completed Assessments</h2>
          </div>
          <Link href="/student/history" className="text-xs font-bold text-blue-600 hover:underline">
            View all history →
          </Link>
        </div>

        {loading ? (
          <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-500 items-center">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            Loading your quiz history…
          </div>
        ) : completed.length ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {completed.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href={`/exam/${item.roomCode}/result`}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:border-blue-300 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-mono font-bold text-emerald-700 border border-emerald-200">
                    {item.score}%
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 truncate">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500 font-mono">
                    {new Date(item.startedAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center space-y-2">
            <History className="mx-auto w-6 h-6 text-slate-400" />
            <p className="text-sm font-bold text-slate-900">No completed quizzes yet</p>
            <p className="text-xs text-slate-500">Your completed assessments and grounded scores will appear here.</p>
          </div>
        )}
      </section>
    </main>
  );
}
