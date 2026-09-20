'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, History, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/auth/apiFetch';

export default function StudentHistory() {
  const [history, setHistory] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); apiFetch('/api/student/history').then(response => response.ok ? response.json() : { history: [] }).then(data => setHistory(data.history || [])).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  return <section className="space-y-6"><div className="flex flex-col justify-between gap-3 border-b pb-5 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-extrabold sm:text-3xl">Past quizzes</h1><p className="mt-1 text-sm text-slate-500">Review completed assessments and their source-grounded answers.</p></div><button onClick={load} className="self-start rounded-lg border px-3 py-2 text-xs font-bold sm:self-auto"><RefreshCw className={`mr-1 inline w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div>{loading ? <div className="flex gap-2 rounded-xl border bg-white p-5 text-sm text-slate-500"><RefreshCw className="w-4 animate-spin"/>Loading quiz history…</div> : history.length ? <div className="space-y-3">{history.map(item => <Link key={item.id} href={`/exam/${item.roomCode}/result`} className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm transition hover:border-slate-300 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.status} · {new Date(item.startedAt).toLocaleDateString()}</p></div><div className="flex shrink-0 items-center gap-3"><span className="rounded bg-[#EEF5F2] px-2 py-1 text-xs font-bold text-[#3F6B5B]">{item.score}%</span><ChevronRight className="w-4 text-slate-400"/></div></Link>)}</div> : <div className="rounded-xl border border-dashed bg-white p-8 text-center"><History className="mx-auto w-6 text-slate-400"/><p className="mt-2 text-sm font-bold">No quizzes completed yet</p><p className="mt-1 text-xs text-slate-500">Your completed assessments will appear here.</p></div>}</section>;
}
