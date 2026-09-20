'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Lock,
  Copy,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  Sliders,
  Check,
  Zap,
  Folder,
  FolderPlus,
  FolderCheck,
  Files,
  CheckSquare,
  Square,
  X,
  Plus,
} from 'lucide-react';
import { Question, DocumentMaterial } from '@/lib/db/types';
import SourcePagePreview from '@/components/SourcePagePreview';
import { apiFetch } from '@/lib/auth/apiFetch';
import { useAuth } from '@/components/AuthProvider';

export default function CreateAssessmentWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1 State: Multi-Document & Folder Selection
  const [materials, setMaterials] = useState<DocumentMaterial[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [activeFolderTab, setActiveFolderTab] = useState<'all' | 'custom'>('all');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Step 2 State: Configuration
  const [title, setTitle] = useState('Course Internal Assessment 01');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [totalQuestions, setTotalQuestions] = useState<number>(15);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [durationMinutes, setDurationMinutes] = useState<number | string>(15);
  const [negativeMarking, setNegativeMarking] = useState<number>(0.25);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState<'PUBLIC' | 'ANONYMOUS' | 'DISABLED'>('PUBLIC');
  const [requireFullscreen, setRequireFullscreen] = useState(true);

  // Step 3 State: Generation Progress & Visualization
  const [generationStage, setGenerationStage] = useState<number>(0);
  const [generationProgress, setGenerationProgress] = useState<number>(15);
  const [generationStages] = useState([
    'Extracting & cleaning syllabus text across selected document(s)...',
    'Filtering slide artefacts, headers, and building RAG knowledge graph...',
    'Analyzing curriculum concept hierarchy & cross-module principles...',
    'Synthesizing source-grounded questions with balanced chapter distribution...',
    'Verifying answer uniqueness, option stability & exact page citations...',
  ]);

  // Step 4 State: Questions Review & QA
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [regenerateModalQ, setRegenerateModalQ] = useState<Question | null>(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Step 5 State: Published Room
  const [publishedAssessmentId, setPublishedAssessmentId] = useState<string>('');
  const [generatedRoomCode, setGeneratedRoomCode] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    async function fetchMaterials() {
      try {
        const res = await apiFetch('/api/materials');
        const data = await res.json();
        if (data.documents && data.documents.length > 0) {
          setMaterials(data.documents);
        }
      } catch (err) {
        console.error('Failed to load materials:', err);
      }
    }
    fetchMaterials();
  }, []);

  // Multi-Document Toggle
  const toggleDocSelection = (id: string) => {
    setSelectedDocIds((prev) => {
      let updated: string[];
      if (prev.includes(id)) {
        updated = prev.filter((dId) => dId !== id);
      } else {
        updated = [...prev, id];
      }

      // Auto-update assessment title based on selected document if user hasn't customized it
      const selected = materials.filter((m) => updated.includes(m.id));
      if (selected.length === 1) {
        setTitle(`${selected[0].title} — Assessment`);
      } else if (selected.length > 1) {
        setTitle(`Comprehensive Assessment (${selected.length} Materials)`);
      }

      return updated;
    });
  };

  const handleSelectAll = () => {
    setSelectedDocIds(materials.map((m) => m.id));
    if (materials.length > 0) {
      setTitle(`Comprehensive Assessment (${materials.length} Materials)`);
    }
  };

  const handleDeselectAll = () => {
    setSelectedDocIds([]);
  };

  // Folder batch select
  const handleSelectFolder = (docIds: string[]) => {
    const allSelected = docIds.length > 0 && docIds.every((id) => selectedDocIds.includes(id));
    if (allSelected) {
      // Deselect folder docs
      setSelectedDocIds((prev) => prev.filter((id) => !docIds.includes(id)));
    } else {
      // Add all folder docs
      setSelectedDocIds((prev) => Array.from(new Set([...prev, ...docIds])));
    }
  };

  // Handle Multi-File or Folder Upload
  const handleFilesUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setIsUploading(true);
    setUploadStatusText(`Uploading and indexing ${files.length} document(s)...`);

    const formData = new FormData();
    formData.append('courseId', 'course_personal');
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const res = await apiFetch('/api/materials/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      const newDocs: DocumentMaterial[] = data.documents || (data.document ? [data.document] : []);

      if (newDocs.length > 0) {
        setMaterials((prev) => {
          const existingIds = new Set(prev.map((d) => d.id));
          const filtered = newDocs.filter((d) => !existingIds.has(d.id));
          return [...filtered, ...prev];
        });

        // Auto-select all newly uploaded documents
        const newIds = newDocs.map((d) => d.id);
        setSelectedDocIds((prev) => Array.from(new Set([...newIds, ...prev])));

        if (newDocs.length === 1) {
          setTitle(`${newDocs[0].title} — Assessment`);
        } else {
          setTitle(`Comprehensive Multi-Document Assessment (${newDocs.length} Materials)`);
        }
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please check file format and try again.');
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  // Drag & Drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const selectedMaterials = materials.filter((m) => selectedDocIds.includes(m.id));
  const totalSelectedPages = selectedMaterials.reduce((acc, m) => acc + (m.pageCount || 1), 0);
  const totalSelectedChunks = selectedMaterials.reduce((acc, m) => acc + (m.chunks?.length || 4), 0);

  const allDocIds = materials.map((m) => m.id);

  const runGeneration = async () => {
    setStep(3);
    setGenerationStage(0);
    setGenerationProgress(15);

    const startTime = Date.now();
    const minDuration = 5500; // Minimum 5.5s for authentic multi-document RAG pipeline visualization

    setTimeout(() => {
      setGenerationStage(1);
      setGenerationProgress(35);
    }, 1100);

    setTimeout(() => {
      setGenerationStage(2);
      setGenerationProgress(60);
    }, 2300);

    setTimeout(() => {
      setGenerationStage(3);
      setGenerationProgress(80);
    }, 3600);

    setTimeout(() => {
      setGenerationStage(4);
      setGenerationProgress(95);
    }, 4800);

    try {
      const res = await apiFetch('/api/assessments/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: selectedDocIds,
          documentId: selectedDocIds[0] || (materials[0]?.id || ''),
          courseId: materials.find((m) => selectedDocIds.includes(m.id))?.courseId || 'course_default',
          assessmentTitle: title,
          totalQuestions,
          difficulty,
          moduleName,
        }),
      });

      const data = await res.json();
      const elapsed = Date.now() - startTime;
      const remainingWait = Math.max(0, minDuration - elapsed);

      setTimeout(() => {
        setGenerationStage(5);
        setGenerationProgress(100);

        setTimeout(() => {
          if (res.ok && data.questions && data.questions.length > 0) {
            setQuestions(data.questions);
            setStep(4);
          } else {
            setError(data.error || 'Could not generate questions from the selected notes. Please check the notes and try again.');
            setStep(2);
          }
        }, 500);
      }, remainingWait);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err?.message || 'Failed to connect to assessment generator.');
      setStep(2);
    }
  };

  const handleRegenerateQuestion = async () => {
    if (!regenerateModalQ) return;
    setIsRegenerating(true);

    try {
      const res = await apiFetch('/api/assessments/regenerate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: regenerateModalQ,
          documentId: selectedDocIds[0] || (materials[0]?.id || ''),
          customInstruction: regeneratePrompt,
        }),
      });
      const data = await res.json();
      if (data.question) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === regenerateModalQ.id ? data.question : q))
        );
        setRegenerateModalQ(null);
        setRegeneratePrompt('');
      }
    } catch (err) {
      console.error('Regenerate error:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleSaveEdit = (updatedQ: Question) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updatedQ.id ? updatedQ : q))
    );
    setEditingQuestion(null);
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await apiFetch('/api/assessments/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedMaterials[0]?.courseId || 'course_general',
          teacherId: user?.uid || 'faculty_member',
          title,
          moduleName,
          materialDocumentIds: selectedDocIds,
          questions,
          settings: {
            durationMinutes: Number(durationMinutes) || 15,
            totalQuestions: questions.length,
            difficultyDistribution: difficulty,
            randomizeQuestions,
            randomizeOptions,
            positiveMarks: 1.0,
            negativeMarks: negativeMarking,
            allowReviewAfterSubmit: true,
            showLeaderboard,
            requireFullscreen,
            maxFullscreenViolations: 2,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPublishedAssessmentId(data.assessment.id);
        setGeneratedRoomCode(data.room.code);
        setStep(5);
      }
    } catch (err) {
      console.error('Publish error:', err);
      alert('Failed to publish assessment.');
    } finally {
      setIsPublishing(false);
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(generatedRoomCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const steps = [
    { num: 1, label: 'Material' },
    { num: 2, label: 'Configure' },
    { num: 3, label: 'Generate' },
    { num: 4, label: 'Review' },
    { num: 5, label: 'Publish' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Step Progress Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Create Internal Assessment
            </h1>
          </div>

          {/* Stepper Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-2xs">
            {steps.map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  step === s.num
                    ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900'
                    : step > s.num
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span>0{s.num}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STEP 1: MULTI-MATERIAL & FOLDER SELECTION */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>01. Upload or Select Course Materials & Folders</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Select single or multiple syllabus modules, notes, textbooks, or entire folders. Gemini Flash will synthesize questions grounded across all selected sources.
                </p>
              </div>

              {/* Quick Batch Select Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select All</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop Upload Zone with Multi-File & Folder Buttons */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-slate-300 hover:border-blue-600 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all bg-slate-50/50 hover:bg-blue-50/20 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 group-hover:text-blue-600 group-hover:scale-105 transition-all mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-slate-900">
                {isUploading ? (uploadStatusText || 'Extracting & chunking documents with RAG...') : 'Drop files / folders here, or use the buttons below'}
              </span>
              <span className="text-xs text-slate-500 mt-1 mb-4">
                Supported formats: PDF, DOCX, TXT, PNG, JPG, HEIC · Handwritten notes & images supported
              </span>

              {/* Dual Upload Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="btn-primary py-2 px-4 text-xs font-bold shadow-sm cursor-pointer inline-flex items-center gap-2">
                  <Files className="w-3.5 h-3.5" />
                  <span>Browse Multiple Files</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.pptx,.docx,.txt,.md,.png,.jpg,.jpeg,.heic,.webp,.tiff,.bmp,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    onChange={(e) => handleFilesUpload(e.target.files)}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>

                <label className="btn-secondary py-2 px-4 text-xs font-bold shadow-sm cursor-pointer inline-flex items-center gap-2">
                  <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Upload Entire Folder</span>
                  <input
                    ref={folderInputRef}
                    type="file"
                    // @ts-ignore
                    webkitdirectory=""
                    // @ts-ignore
                    directory=""
                    multiple
                    onChange={(e) => handleFilesUpload(e.target.files)}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Folder Tabs & Categorized Materials */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-500 uppercase font-mono">
                  Curriculum Folders & Materials
                </div>
                <div className="text-xs font-semibold text-slate-600">
                  <span className="text-blue-600 font-bold">{selectedDocIds.length}</span> of {materials.length} selected
                </div>
              </div>

              {/* Material Quick-Select Actions */}
              <div className="flex items-center gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    if (allDocIds.every((id) => selectedDocIds.includes(id))) {
                      setSelectedDocIds([]);
                    } else {
                      setSelectedDocIds(allDocIds);
                    }
                  }}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between gap-3 text-xs font-semibold cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2">
                    <FolderCheck className="w-4 h-4 text-blue-600" />
                    <span>{allDocIds.every((id) => selectedDocIds.includes(id)) ? 'Deselect All Materials' : 'Select All Materials'}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {materials.length} Documents
                  </span>
                </button>
              </div>

              {/* Individual Documents Multi-Select List */}
              <div className="space-y-2.5">
                {materials.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleDocSelection(doc.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isSelected ? <CheckSquare className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{doc.title}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {doc.fileName} · {doc.pageCount} Pages · {doc.chunks?.length || 4} Chunks Indexed · Grounded ✓
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <span className="text-xs font-bold text-blue-700 flex items-center gap-1 font-mono bg-white px-2.5 py-1 rounded-md border border-blue-200 shadow-sm">
                            <Check className="w-3.5 h-3.5" /> Selected
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 font-mono px-2 py-1">
                            Click to add
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Materials Metrics Summary Bar */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">
                    {selectedDocIds.length} Source Document{selectedDocIds.length > 1 ? 's' : ''} Ready for Gemini Synthesis
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {totalSelectedPages} Total Pages · {totalSelectedChunks} Knowledge Chunks Context Window
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={selectedDocIds.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <span>Continue to Configuration</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: ASSESSMENT CONFIGURATION */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-card space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                02. Assessment Parameters & Exam Rules
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Configure timing, question volume, difficulty distribution, and proctoring safeguards across the {selectedDocIds.length} selected material(s).
              </p>
            </div>

            {/* Selected Sources Preview Badge */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                Active Sources for this Quiz ({selectedDocIds.length}):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedMaterials.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs font-mono"
                  >
                    <FileText className="w-3 h-3 text-blue-600" />
                    <span>{m.title}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1">
                  Assessment Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-academic text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1">
                  Module / Topics Focus
                </label>
                <input
                  type="text"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  className="input-academic text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1">
                  Questions Count
                </label>
                <select
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  className="input-academic text-xs font-mono"
                >
                  <option value={5}>5 Questions (Quick Check)</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions (Standard IA)</option>
                  <option value={20}>20 Questions</option>
                  <option value={25}>25 Questions</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1">
                  Difficulty Blend
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="input-academic text-xs font-mono"
                >
                  <option value="mixed">Mixed (Curriculum Standard)</option>
                  <option value="easy">Foundational (Easy)</option>
                  <option value="medium">Standard (Medium)</option>
                  <option value="hard">Rigorous (Hard)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={durationMinutes}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setDurationMinutes('');
                    } else {
                      const parsed = parseInt(val, 10);
                      setDurationMinutes(isNaN(parsed) ? '' : parsed);
                    }
                  }}
                  onBlur={() => {
                    if (durationMinutes === '' || Number(durationMinutes) <= 0) {
                      setDurationMinutes(15);
                    } else {
                      setDurationMinutes(Math.min(180, Math.max(1, Number(durationMinutes))));
                    }
                  }}
                  placeholder="15"
                  className="input-academic text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1">
                  Negative Mark / Q
                </label>
                <select
                  value={negativeMarking}
                  onChange={(e) => setNegativeMarking(Number(e.target.value))}
                  className="input-academic text-xs font-mono"
                >
                  <option value={0}>0.00 (No penalty)</option>
                  <option value={0.25}>-0.25 (Standard 25%)</option>
                  <option value={0.33}>-0.33 (Strict 33%)</option>
                  <option value={0.5}>-0.50 (High penalty 50%)</option>
                </select>
              </div>
            </div>

            {/* Proctoring & Security Safeguards */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Supervision & Anti-Cheat Parameters</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireFullscreen}
                    onChange={(e) => setRequireFullscreen(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900"
                  />
                  <span>Enforce Full-Screen with 2-Strike Violation Limit</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900"
                  />
                  <span>Randomize Question Order per Examinee</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={randomizeOptions}
                    onChange={(e) => setRandomizeOptions(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900"
                  />
                  <span>Shuffle Answer Options (A/B/C/D)</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono">Leaderboard:</span>
                  <select
                    value={showLeaderboard}
                    onChange={(e) => setShowLeaderboard(e.target.value as any)}
                    className="px-2 py-1 text-xs border rounded-lg bg-white"
                  >
                    <option value="PUBLIC">Public Ranks</option>
                    <option value="ANONYMOUS">Anonymous (Roll No Only)</option>
                    <option value="DISABLED">Faculty Only</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="btn-secondary py-3 px-5 text-sm font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Materials
            </button>
            <button
              onClick={runGeneration}
              className="btn-primary py-3 px-6 text-sm font-semibold shadow-sm flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Generate Questions with Gemini Flash</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: LIVE GENERATION STAGES */}
      {step === 3 && (
        <div className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-200 shadow-card text-center space-y-8 max-w-2xl mx-auto">
          {/* Best Minimal Reload Animation with Centered Star */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            {/* Outer Subtle Track Ring */}
            <div className="absolute inset-1 rounded-full border-2 border-slate-100" />

            {/* Fast Outer Gradient Spinning Ring */}
            <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-blue-600 border-r-indigo-500 border-b-emerald-500 animate-spin" />

            {/* Counter-rotating Inner Precision Ring */}
            <div
              className="absolute inset-3.5 rounded-full border-[1.5px] border-transparent border-t-indigo-400 border-l-blue-400 opacity-70"
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

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-mono font-bold uppercase tracking-wider border border-blue-200">
              <span>RAG SYNTHESIS ENGINE</span>
              <span>·</span>
              <span>{generationProgress}% COMPLETE</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Generating Grounded Questions from {selectedDocIds.length} Material(s)
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Extracting key concepts across chapters, verifying candidate propositions, and constructing deterministic distractors.
            </p>
          </div>

          {/* Animated Gradient Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200">
            <div
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${generationProgress}%` }}
            />
          </div>

          {/* Progress Steps Indicator */}
          <div className="space-y-2.5 text-left">
            {generationStages.map((stageText, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                  generationStage > idx
                    ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950 font-medium'
                    : generationStage === idx
                    ? 'border-blue-500 bg-blue-50/70 text-blue-950 font-bold shadow-2xs'
                    : 'border-slate-100 bg-slate-50/40 text-slate-400 opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono shrink-0 ${
                    generationStage > idx
                      ? 'bg-emerald-600 text-white'
                      : generationStage === idx
                      ? 'bg-blue-600 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {generationStage > idx ? '✓' : idx + 1}
                </div>
                <span className="text-xs">{stageText}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & EDIT QUESTIONS */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                04. Review & Validate Generated Questions ({questions.length})
              </h2>
              <p className="text-xs text-slate-500">
                Source citations attached to every question. Edit text, regenerate specific items, or adjust answer keys.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(2)}
                className="btn-secondary py-2 px-3 text-xs font-semibold"
              >
                Re-Configure
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing || questions.length === 0}
                className="btn-primary py-2 px-4 text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <span>{isPublishing ? 'Publishing Room...' : 'Publish Assessment & Open Room'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {q.topic}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                        q.difficulty === 'easy'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : q.difficulty === 'hard'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingQuestion(q)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Edit question text and options"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setRegenerateModalQ(q)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Regenerate this specific question with custom instruction"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="break-words [overflow-wrap:anywhere] text-sm font-semibold text-slate-900 leading-snug">
                  {q.questionText}
                </div>

                {/* Options Grid */}
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                        q.correctOptionId === opt.id
                          ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 font-semibold'
                          : 'border-slate-200 bg-slate-50/50 text-slate-700'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{opt.text}</span>
                      {q.correctOptionId === opt.id && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Source Citation & Explanation */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-blue-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Grounding Source: {q.sourceCitation.documentTitle} (Page {q.sourceCitation.pageNumber})</span>
                  </div>
                  <p className="text-slate-600 text-[11px] italic">
                    &quot;{q.sourceCitation.excerpt}&quot;
                  </p>
                  <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                    <strong className="text-slate-700">Explanation:</strong> {q.explanation}
                  </div>
                </div>
                <SourcePagePreview citation={q.sourceCitation} />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep(2)}
              className="btn-secondary py-3 px-5 text-sm font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Adjust Parameters
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing || questions.length === 0}
              className="btn-primary py-3 px-8 text-sm font-bold shadow-md flex items-center gap-2"
            >
              <span>{isPublishing ? 'Opening Room...' : 'Publish Assessment & Launch Live Room'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: ASSESSMENT PUBLISHED & LIVE ROOM CODE */}
      {step === 5 && (
        <div className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-200 shadow-card text-center space-y-8 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-lg">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              ROOM IS LIVE & ACCEPTING EXAMINEES
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Assessment Successfully Created
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Share this 6-character room code with your students to begin the proctored exam session.
            </p>
          </div>

          {/* Large Room Code Box */}
          <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-3 shadow-xl">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Student Join Room Code
            </div>
            <div className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-amber-300">
              {generatedRoomCode}
            </div>
            <button
              onClick={copyRoomCode}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{isCopied ? 'Code Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100">
            <Link
              href={`/teacher/rooms/${generatedRoomCode}`}
              className="w-full sm:w-auto btn-primary py-3 px-6 text-xs font-bold shadow-sm flex items-center justify-center gap-2"
            >
              <span>Open Live Room Console</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
            <Link
              href="/teacher/dashboard"
              className="w-full sm:w-auto btn-secondary py-3 px-6 text-xs font-semibold"
            >
              Return to Overview
            </Link>
          </div>
        </div>
      )}

      {/* Question Edit Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Edit Question Details</h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Question Text</label>
              <textarea
                value={editingQuestion.questionText}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, questionText: e.target.value })
                }
                rows={2}
                className="input-academic text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Answer Options & Correct Key</label>
              {editingQuestion.options.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500 w-6">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => {
                      const newOpts = [...editingQuestion.options];
                      newOpts[i] = { ...opt, text: e.target.value };
                      setEditingQuestion({ ...editingQuestion, options: newOpts });
                    }}
                    className="input-academic text-xs flex-1"
                  />
                  <input
                    type="radio"
                    name="correctOpt"
                    checked={editingQuestion.correctOptionId === opt.id}
                    onChange={() =>
                      setEditingQuestion({ ...editingQuestion, correctOptionId: opt.id })
                    }
                    className="text-slate-900"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Explanation</label>
              <textarea
                value={editingQuestion.explanation}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                }
                rows={2}
                className="input-academic text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingQuestion(null)}
                className="btn-secondary py-2 px-3 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(editingQuestion)}
                className="btn-primary py-2 px-4 text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
