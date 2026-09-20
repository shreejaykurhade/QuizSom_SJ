'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  FileText,
  Search,
  MessageSquareText,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  ArrowRight,
  Radio,
  Lock,
  Unlock,
} from 'lucide-react';
import { apiFetch } from '@/lib/auth/apiFetch';

interface RoomInfo {
  roomCode: string;
  assessmentTitle: string;
  courseName?: string;
}

interface StudyMaterial {
  id: string;
  title: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  pageCount?: number;
  chunkCount?: number;
  uploadedAt: string;
  courseId?: string;
  courseName?: string;
  joinedRooms?: RoomInfo[];
  primaryRoomCode?: string;
}

export default function StudentStudyMaterialsPage() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<string[]>([]);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState('');
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/student/materials');
      const data = await res.json();
      if (res.ok) {
        setMaterials(data.materials || []);
        setJoinedRooms(data.joinedRooms || []);
      }
    } catch (e) {
      console.error('Failed to load student study materials:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleJoinRoom = (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.toUpperCase().trim();
    if (/^[A-Z0-9]{6}$/.test(cleanCode)) {
      router.push(`/exam/${cleanCode}`);
    }
  };

  const openPdf = async (document: StudyMaterial) => {
    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) pdfWindow.opener = null;
    setOpeningDocumentId(document.id);
    setPdfError('');

    try {
      const response = await apiFetch(`/api/materials/${document.id}/file`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Could not open this PDF.');
      }

      const objectUrl = URL.createObjectURL(await response.blob());
      if (pdfWindow) {
        pdfWindow.location.href = objectUrl;
      } else {
        window.location.href = objectUrl;
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      pdfWindow?.close();
      setPdfError(error instanceof Error ? error.message : 'Could not open this PDF.');
    } finally {
      setOpeningDocumentId(null);
    }
  };

  const filteredMaterials = materials.filter((m) => {
    if (selectedRoomFilter !== 'all') {
      const matchesRoom = m.joinedRooms?.some(
        (r) => r.roomCode === selectedRoomFilter
      );
      if (!matchesRoom && m.primaryRoomCode !== selectedRoomFilter) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchFile = m.fileName?.toLowerCase().includes(q);
      const matchCourse = m.courseName?.toLowerCase().includes(q);
      if (!matchTitle && !matchFile && !matchCourse) return false;
    }
    return true;
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '1.2 MB';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-7 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              {materials.length} Unlocked Document{materials.length === 1 ? '' : 's'}
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900">
            Study Materials & Lecture Notes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Course lecture slides and reference notes unlocked from the assessment rooms you have joined.
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
            href="/student/chat"
            className="btn-primary py-2 px-3.5 text-xs font-bold shadow-sm flex items-center gap-1.5"
          >
            <MessageSquareText className="w-4 h-4" />
            Open Study Chat
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Verifying room enrollments and study materials...</span>
        </div>
      ) : materials.length === 0 ? (
        /* Empty State: Student has not joined any rooms yet */
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200 shadow-sm max-w-2xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 border border-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">
              No Study Materials Unlocked Yet
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Study materials uploaded by faculty members are unlocked under the specific room codes you join. Enter your 6-character room code below to access assigned notes.
            </p>
          </div>

          {/* Inline Join Form */}
          <form
            onSubmit={handleJoinRoom}
            className="max-w-md mx-auto flex flex-col sm:flex-row gap-2 pt-2"
          >
            <input
              type="text"
              value={joinCode}
              onChange={(e) =>
                setJoinCode(
                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
                )
              }
              placeholder="ENTER ROOM CODE (e.g. 8EM2CE)"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-sm font-bold tracking-[0.18em] text-slate-900 outline-none focus:border-blue-600 focus:bg-white text-center sm:text-left"
            />
            <button
              type="submit"
              disabled={!/^[A-Z0-9]{6}$/.test(joinCode)}
              className="btn-primary py-3 px-5 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-sm"
            >
              <Unlock className="w-4 h-4" />
              Unlock Notes
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400 font-mono">
            <span>Room codes are provided by your course professor</span>
          </div>
        </div>
      ) : (
        /* Unlocked Materials View */
        <div className="space-y-6">
          {/* Filter & Search Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 w-full flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes, topics, or PDF names..."
                className="input-academic text-xs w-full"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>

            {/* Room Filters */}
            <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto font-mono text-xs font-bold flex-wrap">
              <button
                onClick={() => setSelectedRoomFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedRoomFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Joined ({materials.length})
              </button>
              {joinedRooms.map((code) => (
                <button
                  key={code}
                  onClick={() => setSelectedRoomFilter(code)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    selectedRoomFilter === code
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Radio className="w-3 h-3" />
                  Room {code}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMaterials.map((doc) => (
              <div
                key={doc.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200/70 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    {doc.joinedRooms?.[0]?.roomCode && (
                      <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Room: {doc.joinedRooms[0].roomCode}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {doc.joinedRooms?.[0]?.assessmentTitle || doc.courseName || 'Course Material'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 flex-wrap pt-1">
                    <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {doc.pageCount || 1} Page{doc.pageCount === 1 ? '' : 's'}
                    </span>
                    <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {formatFileSize(doc.fileSize)}
                    </span>
                    <span className="text-slate-400">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => void openPdf(doc)}
                    disabled={openingDocumentId === doc.id}
                    className="btn-secondary py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5 hover:text-slate-900"
                  >
                    {openingDocumentId === doc.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    {openingDocumentId === doc.id ? 'Opening…' : 'View PDF'}
                  </button>
                  <Link
                    href="/student/chat"
                    className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  >
                    <MessageSquareText className="w-3.5 h-3.5 text-emerald-300" />
                    Ask in Chat
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {pdfError && (
            <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">
              {pdfError}
            </p>
          )}

          {/* Quick Join Another Room Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/60 to-emerald-50/40 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <PlusCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Have another room code from a professor? Join to unlock additional notes.</span>
            </div>
            <Link
              href="/student"
              className="btn-secondary py-1.5 px-3 text-xs font-bold text-blue-700 shrink-0"
            >
              Join Another Room →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
