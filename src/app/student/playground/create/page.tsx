'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Gamepad2,
  Sparkles,
  BookOpen,
  FileText,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Trophy,
  Upload,
  FileUp,
  X,
  Plus,
} from 'lucide-react';
import { apiFetch } from '@/lib/auth/apiFetch';
import { Question } from '@/lib/db/types';

interface UnlockedMaterial {
  id: string;
  title: string;
  fileName: string;
  pageCount?: number;
  courseName?: string;
  joinedRooms?: { roomCode: string; assessmentTitle: string }[];
}

interface UploadedPdfDoc {
  id: string;
  title: string;
  fileName: string;
  pageCount?: number;
  fileSize?: number;
}

export default function CreatePlaygroundQuizPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 State: Source & Topic
  const [sourceType, setSourceType] = useState<'upload' | 'topic' | 'materials'>('upload');
  const [topic, setTopic] = useState('');
  const [materials, setMaterials] = useState<UnlockedMaterial[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  // Uploaded PDF state
  const [uploadedDocs, setUploadedDocs] = useState<UploadedPdfDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  // Step 2 State: Settings
  const [title, setTitle] = useState('');
  const [totalQuestions, setTotalQuestions] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [durationMinutes, setDurationMinutes] = useState<number>(10);
  const [negativeMarking, setNegativeMarking] = useState<number>(0.0);

  // Step 3 State: Questions Preview
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [errorText, setErrorText] = useState('');

  // Step 4 State: Published Room
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedCode, setPublishedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load unlocked materials
  useEffect(() => {
    async function fetchMaterials() {
      setMaterialsLoading(true);
      try {
        const res = await apiFetch('/api/student/materials');
        const data = await res.json();
        if (res.ok && data.materials) {
          setMaterials(data.materials);
        }
      } catch (err) {
        console.error('Failed to load materials:', err);
      } finally {
        setMaterialsLoading(false);
      }
    }
    void fetchMaterials();
  }, []);

  const popularTopics = [
    'Operating Systems — Process Scheduling & Synchronization',
    'Data Structures & Algorithms — Binary Trees & Graphs',
    'Database Management — Relational Model & SQL Normalization',
    'Computer Networks — TCP/IP Stack & Routing Protocols',
    'Machine Learning — Neural Networks & Loss Optimization',
    'Software Engineering — Design Patterns & Clean Code',
  ];

  const handleSelectTopic = (t: string) => {
    setTopic(t);
    if (!title) setTitle(`${t.split('—')[0].trim()} Challenge`);
  };

  // Handle PDF upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorText('');
    setUploadProgressText('Extracting PDF text and generating concept chunks...');

    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('files', f));

      const res = await apiFetch('/api/student/playground/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload study material');
      }

      const newDocs: UploadedPdfDoc[] = (data.documents || [data.document]).map((d: any) => ({
        id: d.id,
        title: d.title,
        fileName: d.fileName,
        pageCount: d.pageCount,
        fileSize: d.fileSize,
      }));

      setUploadedDocs((prev) => [...prev, ...newDocs]);
      setSelectedDocIds((prev) => Array.from(new Set([...prev, ...newDocs.map((d) => d.id)])));

      const firstDoc = newDocs[0];
      if (firstDoc && !title) {
        const cleanName = firstDoc.title.replace(/\.[^/.]+$/, '');
        setTitle(`${cleanName} Quiz`);
        if (!topic) setTopic(cleanName);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorText(err.message || 'Failed to upload PDF notes');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    setErrorText('');
    setStep(3);
    setGenProgress(20);

    const progressInterval = setInterval(() => {
      setGenProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 600);

    try {
      const payload: any = {
        title: title.trim() || 'Peer Challenge Quiz',
        topic: topic.trim() || 'General Engineering Concept',
        totalQuestions,
        difficulty,
      };

      if ((sourceType === 'upload' || sourceType === 'materials') && selectedDocIds.length > 0) {
        payload.documentIds = selectedDocIds;
      }

      const res = await apiFetch('/api/student/playground/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Question generation failed');
      }

      setQuestions(data.questions || []);
      setGenProgress(100);
    } catch (err: any) {
      console.error('Generation error:', err);
      setErrorText(err.message || 'Failed to synthesize questions. Please try again.');
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
    }
  };

  const handlePublishRoom = async () => {
    setIsPublishing(true);
    setErrorText('');

    try {
      const res = await apiFetch('/api/student/playground/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Student Peer Battle',
          topic: topic.trim() || 'Peer Challenge',
          materialDocumentIds: selectedDocIds,
          questions,
          settings: {
            durationMinutes,
            totalQuestions: questions.length,
            difficultyDistribution: difficulty,
            negativeMarks: negativeMarking,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish room');
      }

      setPublishedCode(data.roomCode || data.room?.code);
      setStep(4);
    } catch (err: any) {
      console.error('Publish error:', err);
      setErrorText(err.message || 'Failed to launch room. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyShare = () => {
    if (!publishedCode) return;
    navigator.clipboard.writeText(publishedCode);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-7 pb-20">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <Link
          href="/student/playground"
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Playground Hub
        </Link>
        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          Step {step} of 4
        </span>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono font-bold">
        <div className={`p-2 rounded-xl border ${step >= 1 ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
          1. Topic / Notes
        </div>
        <div className={`p-2 rounded-xl border ${step >= 2 ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
          2. Rules & Timer
        </div>
        <div className={`p-2 rounded-xl border ${step >= 3 ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
          3. AI Questions
        </div>
        <div className={`p-2 rounded-xl border ${step >= 4 ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
          4. Launch Room
        </div>
      </div>

      {errorText && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorText}</span>
        </div>
      )}

      {/* ──────────────── STEP 1: TOPIC & SOURCE ──────────────── */}
      {step === 1 && (
        <div className="space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700">
              CREATE CHALLENGE
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              Choose Quiz Source & Study Material
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Upload your own study notes PDF, prompt an academic topic, or use unlocked faculty slides.
            </p>
          </div>

          {/* 3-Option Source Selector */}
          <div className="grid sm:grid-cols-3 gap-3">
            {/* Option 1: Upload PDF */}
            <button
              type="button"
              onClick={() => setSourceType('upload')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                sourceType === 'upload'
                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-xs ring-1 ring-emerald-400'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <FileUp className="w-4 h-4 text-emerald-600" />
                <span>Upload My PDF</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Upload your lecture notes, slides, or study guide.
              </p>
            </button>

            {/* Option 2: Custom Academic Topic */}
            <button
              type="button"
              onClick={() => setSourceType('topic')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                sourceType === 'topic'
                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-xs ring-1 ring-emerald-400'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Academic Topic</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Type any subject prompt or curriculum topic.
              </p>
            </button>

            {/* Option 3: Unlocked Faculty Notes */}
            <button
              type="button"
              onClick={() => setSourceType('materials')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                sourceType === 'materials'
                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-xs ring-1 ring-emerald-400'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Room Notes</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                From faculty rooms you joined ({materials.length}).
              </p>
            </button>
          </div>

          {/* ── Subview 1: Upload Student's Own PDF ── */}
          {sourceType === 'upload' && (
            <div className="space-y-4 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.pptx,.docx,.txt,.md,.png,.jpg,.jpeg,.heic,.webp,.tiff,.bmp,image/*,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  isUploading
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-emerald-400 bg-slate-50/80 hover:bg-emerald-50/20'
                }`}
              >
                {isUploading ? (
                  <div className="space-y-2 flex flex-col items-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                    <div className="text-xs font-bold text-slate-800">Processing Study Material</div>
                    <div className="text-[11px] text-slate-500 font-mono">{uploadProgressText}</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center mx-auto shadow-2xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        Click or drag to upload your notes
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Supports PDFs, handwritten notes, photos & images (Max 50MB)
                      </div>
                    </div>
                    <span className="inline-block mt-2 font-mono text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-bold">
                      Upload Notes (PDF / Image)
                    </span>
                  </div>
                )}
              </div>

              {/* Uploaded Documents List */}
              {uploadedDocs.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold text-slate-900">
                    Uploaded Notes for Challenge ({uploadedDocs.length})
                  </div>
                  <div className="space-y-2">
                    {uploadedDocs.map((doc) => {
                      const isSelected = selectedDocIds.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          className="p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50/60 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-200/80 text-emerald-900 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                                {doc.title}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {doc.pageCount || 1} Pages Indexed · Ready for AI Quiz Generation
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-mono font-bold text-emerald-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Ready ✓
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadedDocs((prev) => prev.filter((d) => d.id !== doc.id));
                                setSelectedDocIds((prev) => prev.filter((id) => id !== doc.id));
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Subview 2: Custom Academic Topic Prompt ── */}
          {sourceType === 'topic' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1.5">
                  Academic Subject or Topic Prompt
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    if (!title) setTitle(`${e.target.value.slice(0, 30)} Battle`);
                  }}
                  placeholder="e.g., Binary Search Trees, SQL Query Optimization, TCP Congestion Control"
                  className="input-academic text-xs w-full"
                />
              </div>

              <div>
                <div className="text-[11px] font-mono text-slate-500 font-bold uppercase mb-2">
                  Popular Suggested Topics
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularTopics.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleSelectTopic(t)}
                      className={`text-xs px-3 py-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                        topic === t
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Subview 3: Unlocked Course Notes ── */}
          {sourceType === 'materials' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-900 block">
                Select Course Materials from Joined Rooms
              </label>

              {materialsLoading ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Loading unlocked notes...</span>
                </div>
              ) : materials.length === 0 ? (
                <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
                  <p className="font-bold">No room materials unlocked yet.</p>
                  <p>
                    Use <strong>Upload My PDF</strong> or <strong>Academic Topic</strong> above to create your challenge immediately!
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {materials.map((m) => {
                    const isSelected = selectedDocIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDocIds(selectedDocIds.filter((id) => id !== m.id));
                          } else {
                            setSelectedDocIds([...selectedDocIds, m.id]);
                          }
                          if (!topic) setTopic(m.title);
                          if (!title) setTitle(`${m.title} Challenge`);
                        }}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/80 shadow-2xs'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{m.title}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {m.pageCount || 1} Pages · {m.courseName || 'Course Notes'}
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${isSelected ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'}`}>
                          {isSelected ? 'Selected ✓' : 'Select'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              disabled={
                sourceType === 'upload'
                  ? selectedDocIds.length === 0
                  : sourceType === 'topic'
                  ? !topic.trim()
                  : selectedDocIds.length === 0
              }
              onClick={() => {
                if (!title) {
                  setTitle(topic ? `${topic.slice(0, 30)} Challenge` : 'Peer Quiz Battle');
                }
                setStep(2);
              }}
              className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-40"
            >
              <span>Next: Challenge Rules</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── STEP 2: CONFIGURE RULES & TIMER ──────────────── */}
      {step === 2 && (
        <div className="space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700">
              STEP 2 OF 4
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              Configure Challenge Rules
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Set quiz duration, number of questions, and difficulty for your peer battle.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-900 block mb-1.5">
                Challenge Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Midterm Fast Drill, DSA Speedrun"
                className="input-academic text-xs w-full"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1.5">
                  Number of Questions
                </label>
                <div className="grid grid-cols-4 gap-2 font-mono text-xs font-bold">
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTotalQuestions(num)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        totalQuestions === num
                          ? 'border-emerald-500 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1.5">
                  Quiz Time Limit
                </label>
                <div className="grid grid-cols-4 gap-2 font-mono text-xs font-bold">
                  {[5, 10, 15, 20].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        durationMinutes === mins
                          ? 'border-emerald-500 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1.5">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="input-academic text-xs w-full"
                >
                  <option value="mixed">Mixed (Adaptive balance)</option>
                  <option value="easy">Easy (Fundamentals)</option>
                  <option value="medium">Medium (Standard)</option>
                  <option value="hard">Hard (Advanced Challenge)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1.5">
                  Scoring & Negative Marks
                </label>
                <select
                  value={negativeMarking}
                  onChange={(e) => setNegativeMarking(Number(e.target.value))}
                  className="input-academic text-xs w-full"
                >
                  <option value={0}>Friendly (+1.0 / No negative marks)</option>
                  <option value={0.25}>Competitive (+1.0 / -0.25 penalty)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary py-2.5 px-4 text-xs font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleGenerateQuestions}
              className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate AI Questions</span>
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── STEP 3: QUESTION DRAFT REVIEW ──────────────── */}
      {step === 3 && (
        <div className="space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
          {isGenerating ? (
            <div className="py-16 text-center space-y-4 max-w-md mx-auto">
              {/* Best Minimal Reload Animation with Centered Star */}
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center mb-2">
                {/* Outer Subtle Track Ring */}
                <div className="absolute inset-1 rounded-full border-2 border-slate-100" />

                {/* Fast Outer Gradient Spinning Ring */}
                <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-emerald-600 border-r-teal-500 border-b-indigo-500 animate-spin" />

                {/* Counter-rotating Inner Precision Ring */}
                <div
                  className="absolute inset-3.5 rounded-full border-[1.5px] border-transparent border-t-teal-400 border-l-emerald-400 opacity-70"
                  style={{ animation: 'spin 2s linear infinite reverse' }}
                />

                {/* Centered Gemini Star */}
                <div className="relative z-10 w-8 h-8 flex items-center justify-center">
                  <Image
                    src="/gemini-star.png"
                    alt="Gemini AI"
                    width={28}
                    height={28}
                    className="object-contain animate-pulse select-none drop-shadow-sm"
                    unoptimized
                    priority
                  />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Synthesizing Challenge Questions</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Gemini Flash is drafting conceptual MCQs grounded in &ldquo;{topic || title}&rdquo;...
                </p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${genProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700">
                    STEP 3 OF 4 · DRAFT REVIEW
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                    Review Challenge Questions ({questions.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateQuestions}
                  className="btn-secondary py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                          #{idx + 1}
                        </span>
                        <h4 className="min-w-0 break-words [overflow-wrap:anywhere] text-sm font-bold text-slate-900 leading-snug">
                          {q.questionText}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shrink-0">
                        {q.difficulty || 'medium'}
                      </span>
                    </div>

                    {/* Options Grid */}
                    <div className="grid sm:grid-cols-2 gap-2 text-xs pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = opt.id === q.correctOptionId;
                        return (
                          <div
                            key={opt.id || optIdx}
                            className={`min-w-0 p-2.5 rounded-xl border flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between ${
                              isCorrect
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-900 font-bold'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            <span className="flex min-w-0 items-start gap-1.5">
                              <span className="shrink-0 font-mono text-[11px] font-bold text-slate-400">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{opt.text}</span>
                            </span>
                            {isCorrect && (
                              <span className="text-[9px] font-mono uppercase bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">
                                Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed font-mono">
                        <strong className="text-slate-800">Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-secondary py-2.5 px-4 text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isPublishing || questions.length === 0}
                  onClick={handlePublishRoom}
                  className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-40"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Launching Room...</span>
                    </>
                  ) : (
                    <>
                      <Gamepad2 className="w-4 h-4" />
                      <span>Launch Room Code 🚀</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── STEP 4: ROOM LAUNCHED SHARE MODAL ──────────────── */}
      {step === 4 && publishedCode && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700">
              PLAYGROUND CHALLENGE ACTIVE
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Your Challenge Room is Live!
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Share the 6-character room code with your friends and classmates to battle on the live leaderboard.
            </p>
          </div>

          {/* Big Room Code Box */}
          <div className="p-6 rounded-2xl bg-slate-900 text-white max-w-sm mx-auto shadow-lg space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              PEER ROOM CODE
            </div>
            <div className="text-4xl font-extrabold font-mono tracking-widest text-emerald-400">
              {publishedCode}
            </div>
          </div>

          {/* Share Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={handleCopyShare}
              className="w-full sm:w-auto btn-primary py-3 px-5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Code Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <Link
              href={`/student/playground/rooms/${publishedCode}`}
              className="w-full sm:w-auto btn-secondary py-3 px-5 text-xs font-bold flex items-center justify-center gap-2 text-purple-700"
            >
              <Trophy className="w-4 h-4" />
              <span>Live Leaderboard</span>
            </Link>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-semibold">
            <Link
              href={`/exam/${publishedCode}`}
              className="text-emerald-700 hover:underline flex items-center gap-1"
            >
              Take Quiz Challenge Yourself →
            </Link>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <Link
              href="/student/playground"
              className="text-slate-500 hover:text-slate-800"
            >
              Return to Playground Hub
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
