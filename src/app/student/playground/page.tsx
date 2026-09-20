'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Gamepad2,
  Sparkles,
  PlusCircle,
  Users,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  Clock,
  BookOpen,
  Plus,
  Radio,
} from 'lucide-react';
import { apiFetch } from '@/lib/auth/apiFetch';
import { LiveRoom, Assessment, ExamAttempt } from '@/lib/db/types';

interface PlaygroundRoomItem {
  room: LiveRoom;
  assessment?: Assessment;
  isCreator: boolean;
  myAttempt?: ExamAttempt;
  totalAttempts: number;
}

export default function StudentPlaygroundHubPage() {
  const [rooms, setRooms] = useState<PlaygroundRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [filter, setFilter] = useState<'all' | 'created' | 'joined'>('all');
  const router = useRouter();

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/student/playground/rooms');
      const data = await res.json();
      if (res.ok && data.rooms) {
        setRooms(data.rooms);
      }
    } catch (e) {
      console.error('Failed to load playground rooms:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    const clean = joinCode.toUpperCase().trim();
    if (/^[A-Z0-9]{6}$/.test(clean)) {
      router.push(`/exam/${clean}`);
    }
  };

  const filteredRooms = rooms.filter((item) => {
    if (filter === 'created') return item.isCreator;
    if (filter === 'joined') return !item.isCreator;
    return true;
  });

  const totalCreated = rooms.filter((r) => r.isCreator).length;
  const totalJoined = rooms.filter((r) => Boolean(r.myAttempt)).length;
  const completedAttempts = rooms
    .map((r) => r.myAttempt)
    .filter((a): a is ExamAttempt => Boolean(a && a.status === 'COMPLETED'));
  const avgScore = completedAttempts.length
    ? Math.round(
        completedAttempts.reduce((acc, a) => acc + (a.percentageScore ?? 0), 0) /
          completedAttempts.length
      )
    : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* ── Cool Minimalist Header ── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Quiz Playground
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
            Create custom peer challenge quizzes from your uploaded PDF notes or subject topics. Share instant 6-character room codes with classmates and compete on the live student leaderboard.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 relative z-10">
          <button
            type="button"
            onClick={() => void loadRooms()}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Refresh Challenges"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/student/playground/create"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-xs hover:shadow hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Create Peer Quiz</span>
          </Link>
        </div>
      </div>

      {/* ── Minimalist Metrics Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Created by You</div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">{totalCreated}</div>
          <div className="text-[11px] text-slate-500">Challenges launched</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Battles Joined</div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">{totalJoined}</div>
          <div className="text-[11px] text-slate-500">Peer rooms attempted</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Average Score</div>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono">{avgScore}%</div>
          <div className="text-[11px] text-slate-500">Across finished tests</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Active Rooms</div>
          <div className="text-2xl font-extrabold text-indigo-600 font-mono">{rooms.length}</div>
          <div className="text-[11px] text-slate-500">Available to battle</div>
        </div>
      </div>

      {/* ── Join by Room Code & Minimal Filter Bar ── */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Quick Join Input */}
        <form onSubmit={handleJoin} className="flex items-center gap-2 w-full md:w-auto">
          <div className="text-xs font-bold text-slate-700 hidden sm:inline shrink-0">
            Join Friend&apos;s Room:
          </div>
          <input
            type="text"
            value={joinCode}
            onChange={(e) =>
              setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
            }
            placeholder="CODE (e.g. PG8X2F)"
            className="w-full sm:w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-bold tracking-widest text-slate-900 outline-none focus:border-slate-900 focus:bg-white text-center sm:text-left"
          />
          <button
            type="submit"
            disabled={!/^[A-Z0-9]{6}$/.test(joinCode)}
            className="btn-primary py-2 px-3 text-xs font-bold shrink-0 disabled:opacity-30"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 font-mono text-xs font-bold shrink-0 self-end md:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({rooms.length})
          </button>
          <button
            onClick={() => setFilter('created')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === 'created'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Created ({totalCreated})
          </button>
          <button
            onClick={() => setFilter('joined')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === 'joined'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Joined ({rooms.length - totalCreated})
          </button>
        </div>
      </div>

      {/* ── Challenge Cards Grid ── */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
          <span>Loading challenge rooms...</span>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Playground Quizzes Yet</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload your study notes PDF or enter any academic topic to generate your first peer battle.
            </p>
          </div>
          <Link
            href="/student/playground/create"
            className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create First Peer Challenge
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((item) => {
            const hasAttempted = Boolean(item.myAttempt);
            const score = item.myAttempt?.percentageScore ?? null;
            const code = item.room.code;
            const title = item.assessment?.title || 'Student Peer Challenge';
            const topic = item.assessment?.moduleName || 'Peer Battle';
            const qCount =
              item.assessment?.settings?.totalQuestions ||
              item.assessment?.questionIds?.length ||
              5;
            const duration = item.assessment?.settings?.durationMinutes || 10;

            return (
              <div
                key={item.room.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-400 hover:shadow-sm transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top Bar: Room Code & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-extrabold bg-slate-900 text-white px-2.5 py-1 rounded-xl shadow-2xs">
                      <span>{code}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(code)}
                        title="Copy Room Code"
                        className="p-0.5 rounded hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedCode === code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {item.isCreator ? (
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Creator ★
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Peer Battle
                      </span>
                    )}
                  </div>

                  {/* Title & Topic */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                      {title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      Topic: <strong className="text-slate-700">{topic}</strong>
                    </p>
                  </div>

                  {/* Badges Info */}
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 flex-wrap pt-1">
                    <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {qCount} Questions
                    </span>
                    <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {duration}m Limit
                    </span>
                    <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {item.totalAttempts} Submissions
                    </span>
                  </div>

                  {/* Student Result Banner if Attempted */}
                  {hasAttempted && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between font-mono">
                      <span className="text-slate-600 font-semibold">Your Score</span>
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {score}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/student/playground/rooms/${code}`}
                    className="btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 text-slate-700 hover:text-slate-900"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    Leaderboard
                  </Link>

                  <Link
                    href={`/exam/${code}`}
                    className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <span>{hasAttempted ? 'Retake' : 'Take Battle'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
