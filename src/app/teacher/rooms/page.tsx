'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Radio,
  Users,
  Copy,
  Check,
  PlusCircle,
  ExternalLink,
  BarChart2,
  RefreshCw,
  Clock,
  ArrowRight,
  Shield,
  FileText,
} from 'lucide-react';
import { apiFetch } from '@/lib/auth/apiFetch';

import { useAuth } from '@/components/AuthProvider';

export default function TeacherRoomsDirectoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/assessments');
      const body = await response.json();
      if (response.ok) {
        setItems(body.assessments || []);
      }
    } catch (e) {
      console.error('Failed to load rooms:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      void load();
    }
  }, [authLoading, user, load]);

  const copyRoom = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const allRooms = items.flatMap((asmt) =>
    (asmt.rooms || []).map((room: any) => ({
      ...room,
      assessment: asmt,
    }))
  );

  const activeRooms = allRooms.filter((r) => r.status === 'ACTIVE');
  const otherRooms = allRooms.filter((r) => r.status !== 'ACTIVE');

  return (
    <div className="space-y-7 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              {allRooms.length} Total Room{allRooms.length === 1 ? '' : 's'}
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            Live Rooms & Proctored Sessions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Launch, monitor, and manage real-time student telemetry for all your active assessments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => void load()}
            className="btn-secondary py-2 px-3 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/teacher/create"
            className="btn-primary py-2 px-3.5 text-xs font-bold shadow-sm flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            New Assessment
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>Loading faculty rooms and live telemetry...</span>
        </div>
      ) : allRooms.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Assessment Rooms Created Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Create an assessment to generate a live room code that students can join for proctored examinations.
            </p>
          </div>
          <Link
            href="/teacher/create"
            className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            Create Your First Assessment
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Live Rooms */}
          {activeRooms.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Currently Active Rooms ({activeRooms.length})
                </h2>
              </div>

              <div className="grid gap-4">
                {activeRooms.map((room) => (
                  <div
                    key={room.code}
                    className="p-5 rounded-2xl bg-white border-2 border-emerald-500/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-extrabold text-base bg-slate-900 text-white px-3 py-1 rounded-lg">
                          {room.code}
                        </span>
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          LIVE ACTIVE
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          Created {new Date(room.createdAt || room.assessment?.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 truncate">
                        {room.assessment?.title || 'Assessment'}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">
                        {room.assessment?.moduleName || room.assessment?.courseName || 'Course Assessment'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => copyRoom(room.code)}
                        className="btn-secondary py-2 px-3 text-xs font-mono font-bold"
                      >
                        {copiedCode === room.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiedCode === room.code ? 'Copied' : 'Copy Code'}
                      </button>
                      <Link
                        href={`/teacher/results/${room.assessment?.id}`}
                        className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
                        Analytics
                      </Link>
                      <Link
                        href={`/teacher/rooms/${room.code}`}
                        className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <Radio className="w-3.5 h-3.5 text-emerald-400" />
                        Open Live Monitor
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past / Inactive Rooms */}
          {otherRooms.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">
                Previous / Completed Rooms ({otherRooms.length})
              </h2>

              <div className="grid gap-3">
                {otherRooms.map((room) => (
                  <div
                    key={room.code}
                    className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                          {room.code}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {room.status || 'CLOSED'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1 truncate">
                        {room.assessment?.title || 'Assessment'}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/teacher/results/${room.assessment?.id}`}
                        className="btn-secondary py-1.5 px-3 text-xs font-semibold"
                      >
                        Results & Analytics
                      </Link>
                      <Link
                        href={`/teacher/rooms/${room.code}`}
                        className="btn-secondary py-1.5 px-3 text-xs font-semibold"
                      >
                        Inspect Room
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
