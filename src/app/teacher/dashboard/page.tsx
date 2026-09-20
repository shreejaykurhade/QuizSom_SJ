'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Pencil,
  PlusCircle,
  Radio,
  RefreshCw,
  Trash2,
  Users,
  BarChart2,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { apiFetch } from '@/lib/auth/apiFetch';
import { useAuth } from '@/components/AuthProvider';
import { AuthDialog } from '@/components/AuthModal';

const statusStyle: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  WAITING: 'bg-amber-100 text-amber-800 border-amber-200',
  COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
  EXPIRED: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function TeacherDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [account, setAccount] = useState<any>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await apiFetch('/api/assessments');
      const body = await response.json();
      if (!response.ok) {
        if (body.error === 'Sign in required') {
          if (authLoading) return;
          setError('Sign in required');
          return;
        }
        throw new Error(body.error || 'Could not load rooms.');
      }
      setItems(body.assessments || []);
      setAccount(body.account || null);
    } catch (cause: any) {
      if (cause.message === 'Sign in required' && authLoading) return;
      setError(cause.message || 'Could not load rooms.');
    } finally {
      setLoading(false);
    }
  }, [authLoading]);

  useEffect(() => {
    if (!authLoading) {
      void load();
    }
  }, [authLoading, user, load]);

  const editRoom = async (code: string) => {
    const newCode = window.prompt('New room code (4–10 letters/numbers):', code);
    if (!newCode || newCode.trim().toUpperCase() === code) return;
    const response = await apiFetch(`/api/rooms/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: newCode }),
    });
    const body = await response.json();
    if (!response.ok) return setError(body.error || 'Could not update room.');
    void load();
  };

  const changeStatus = async (code: string, status: string) => {
    const response = await apiFetch(`/api/rooms/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const body = await response.json();
    if (!response.ok) return setError(body.error || 'Could not update room.');
    void load();
  };

  const deleteRoom = async (code: string) => {
    if (!window.confirm(`Delete room ${code}? Rooms with student attempts cannot be deleted.`)) return;
    const response = await apiFetch(`/api/rooms/${code}`, { method: 'DELETE' });
    const body = await response.json();
    if (!response.ok) return setError(body.error || 'Could not delete room.');
    void load();
  };

  const rooms = items.flatMap((item) =>
    (item.rooms || []).map((room: any) => ({ ...room, assessment: item }))
  );
  const liveRooms = rooms.filter((room: any) => room.status === 'ACTIVE');

  return (
    <main className="space-y-7">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Assessments & Institutional Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor real-time participant integrity, student accuracy distributions, and live exam rooms.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            href="/teacher/create"
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Assessment</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          {error.toLowerCase().includes('sign in') && (
            <AuthDialog
              initialRole="faculty"
              open={authOpen}
              onOpenChange={setAuthOpen}
              trigger={
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                >
                  Sign in
                </button>
              }
            />
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-10">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>Loading faculty workspace & analytics...</span>
        </div>
      ) : (
        <>
          {/* Live Rooms Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <Radio className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-slate-900">
                  Live Rooms Active Now ({liveRooms.length})
                </h2>
              </div>
            </div>

            {liveRooms.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {liveRooms.map((room: any) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    edit={editRoom}
                    update={changeStatus}
                    remove={deleteRoom}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 text-center">
                No live rooms currently active. Start a waiting room when ready for students to join.
              </div>
            )}
          </section>

          {/* All Rooms & Analytics Section */}
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">
                All Assessments & Historical Rooms ({rooms.length})
              </h2>
            </div>

            {rooms.length ? (
              <div className="grid gap-4">
                {rooms.map((room: any) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    edit={editRoom}
                    update={changeStatus}
                    remove={deleteRoom}
                  />
                ))}
              </div>
            ) : (
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <FileText className="mx-auto w-10 h-10 text-slate-400" />
                <h2 className="mt-3 font-bold text-slate-900 text-base">No assessments yet</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upload syllabus materials, synthesize source-grounded questions, and publish a live room.
                </p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  <Link
                    href="/teacher/create"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Create First Assessment</span>
                  </Link>
                  <Link
                    href="/teacher/materials"
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
                  >
                    <span>Open materials</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </section>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function RoomCard({ room, edit, update, remove }: any) {
  const assessment = room.assessment;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase ${
                statusStyle[room.status] || statusStyle.WAITING
              }`}
            >
              {room.status}
            </span>
            <span className="font-mono text-sm font-extrabold tracking-wider text-slate-900">
              CODE: {room.code}
            </span>
          </div>

          <h3 className="text-base font-extrabold text-slate-900">
            {assessment?.title || 'Assessment'}
          </h3>

          <p className="text-xs text-slate-500">
            {assessment?.moduleName ? `${assessment.moduleName} · ` : ''}
            {assessment?.totalQuestions || 15} questions · {assessment?.durationMinutes || 15} min duration
          </p>

          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 pt-1">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {room.participantCount || 0} student{room.participantCount === 1 ? '' : 's'} participated
            </span>
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/teacher/rooms/${room.code}`}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-bold text-white transition-colors shadow-2xs"
            >
              Open room
            </Link>

            {assessment?.id && (
              <Link
                href={`/teacher/results/${assessment.id}`}
                className="rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 px-3.5 py-2 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            {room.status === 'WAITING' && (
              <button
                type="button"
                onClick={() => update(room.code, 'ACTIVE')}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition-colors"
              >
                Start live
              </button>
            )}

            {room.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => update(room.code, 'COMPLETED')}
                className="rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 transition-colors"
              >
                End room
              </button>
            )}

            <button
              type="button"
              onClick={() => edit(room.code)}
              className="rounded-lg border border-slate-200 p-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              title="Edit room code"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => remove(room.code)}
              className="rounded-lg border border-rose-200 p-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete empty room"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
