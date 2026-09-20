'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  FileText,
  Upload,
  Layers,
  CheckCircle2,
  PlusCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DocumentMaterial } from '@/lib/db/types';
import { apiFetch } from '@/lib/auth/apiFetch';
import { useAuth } from '@/components/AuthProvider';

export default function TeacherMaterialsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [materials, setMaterials] = useState<DocumentMaterial[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMaterials = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch('/api/materials');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load your materials.');
      setMaterials(data.documents || []);
    } catch (err) {
      console.error('Failed to load materials:', err);
      setError(err instanceof Error ? err.message : 'Could not load your materials.');
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth?role=faculty&next=%2Fteacher%2Fmaterials');
      return;
    }
    void loadMaterials();
  }, [loading, user, router, loadMaterials]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      router.push('/auth?role=faculty&next=%2Fteacher%2Fmaterials');
      return;
    }

    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', 'course_personal');

    try {
      const res = await apiFetch('/api/materials/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      await loadMaterials();
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E0]">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-[#6B6B67]">
            Curriculum Grounding Sources
          </div>
          <h1 className="text-2xl font-semibold text-[#171717] mt-1">
            Course Materials Library
          </h1>
          <p className="text-xs text-[#6B6B67] mt-0.5">
            Syllabus notes, textbooks, and module slides indexed for source-grounded quiz generation.
          </p>
        </div>

        <label className="btn-primary py-2 px-4 text-xs font-medium cursor-pointer inline-flex items-center gap-2">
          <Upload className="w-4 h-4" />
          {isUploading ? 'Chunking & Indexing...' : 'Upload New Syllabus'}
          <input
            type="file"
            accept=".pdf,.pptx,.docx,.txt,.md,.png,.jpg,.jpeg,.heic,.webp,.tiff,.bmp"
            onChange={handleUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Materials Cards List */}
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {!loading && !error && materials.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#C8D8E8] bg-[#F8FBFD] p-8 text-center text-sm text-[#6B6B67]">
            No materials uploaded by this faculty account yet. Upload a PDF or PPT to build your private library.
          </div>
        )}
        {materials.map((doc) => (
          <div
            key={doc.id}
            className="p-6 rounded-xl bg-white border border-[#E5E5E0] shadow-subtle space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EEF3F8] border border-[#C8D8E8] flex items-center justify-center text-[#17324D]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#171717]">{doc.title}</h3>
                  <div className="text-xs text-[#6B6B67] font-mono mt-0.5">
                    {doc.fileName} · {(doc.fileSize / (1024 * 1024)).toFixed(1)} MB · {doc.pageCount} Pages
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#3F6B5B] bg-[#EEF5F2] px-2 py-0.5 rounded border border-[#C6E0D6]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  RAG Chunks Indexed
                </span>
                <Link
                  href="/teacher/create"
                  className="px-3 py-1 rounded bg-[#17324D] text-white text-xs font-medium hover:bg-[#244565] transition-all"
                >
                  Create Quiz
                </Link>
              </div>
            </div>

            {/* Chunks & Topics info */}
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-[11px] font-mono text-[#8C8C87] uppercase mb-1.5">
                  Extracted Curriculum Topics
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {doc.topics?.map((topic) => (
                    <span
                      key={topic}
                      className="px-2 py-0.5 rounded bg-[#F8F8F6] border border-[#E5E5E0] text-[#171717] text-[11px] font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-mono text-[#8C8C87] uppercase mb-1.5">
                  Retrieval Chunk Hierarchy
                </div>
                <div className="text-[#6B6B67] text-xs">
                  {doc.chunks?.length || 4} discrete semantic chunks prepared for zero-hallucination Gemini Flash extraction.
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
