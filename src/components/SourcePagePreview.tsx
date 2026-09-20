'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, X } from 'lucide-react';
import { apiFetch } from '@/lib/auth/apiFetch';

type Citation = {
  documentId?: string;
  documentTitle?: string;
  pageNumber?: number;
  sourceLabel?: string;
  excerpt?: string;
};

export default function SourcePagePreview({ citation }: { citation?: Citation }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const page = Math.max(1, citation?.pageNumber || 1);

  useEffect(() => {
    if (!isOpen || !citation?.documentId || !canvasRef.current) return;

    let cancelled = false;
    let loadingTask: { destroy: () => void; promise: Promise<any> } | undefined;
    let renderTask: { cancel: () => void; promise: Promise<void> } | undefined;

    const renderPage = async () => {
      setStatus('loading');
      setError('');

      try {
        const response = await apiFetch(`/api/materials/${citation.documentId}/file`);
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || 'Could not load this source page.');
        }

        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

        const file = new Uint8Array(await response.arrayBuffer());
        loadingTask = pdfjs.getDocument({ data: file });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const pdfPage = await pdf.getPage(Math.min(page, pdf.numPages));
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const availableWidth = Math.max(280, canvasRef.current?.parentElement?.clientWidth || 720);
        const viewport = pdfPage.getViewport({ scale: Math.min(2, availableWidth / baseViewport.width) });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const context = canvas.getContext('2d');
        if (!context) throw new Error('Your browser could not display this PDF page.');

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        renderTask = pdfPage.render({ canvasContext: context, viewport });
        await renderTask.promise;
        if (!cancelled) setStatus('ready');
      } catch (cause: any) {
        if (!cancelled && cause?.name !== 'RenderingCancelledException') {
          setError(cause?.message || 'Could not display this source page.');
          setStatus('error');
        }
      }
    };

    void renderPage();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      loadingTask?.destroy();
    };
  }, [citation?.documentId, isOpen, page]);

  if (!citation?.documentId) return null;

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 p-3 text-xs font-bold text-emerald-900">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="w-4 shrink-0" />
          <span className="min-w-0 break-words">
            Exact source page: {citation.sourceLabel || `Page ${page}`} · {citation.documentTitle}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
        >
          {isOpen ? 'Hide page' : 'View source page'}
        </button>
      </div>

      {citation.excerpt && <p className="break-words p-3 text-xs leading-5 text-emerald-950/70">“{citation.excerpt}”</p>}

      {isOpen && (
        <div className="border-t border-emerald-200 bg-slate-100 p-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
            <span>Showing page {page} inside QuizSom</span>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close source page" className="rounded p-1 hover:bg-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>
          {status === 'loading' && (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading source page…
            </div>
          )}
          {status === 'error' && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div className={status === 'ready' ? 'overflow-auto rounded-lg bg-white p-2' : 'hidden'}>
            <canvas ref={canvasRef} className="mx-auto block max-w-none shadow-sm" />
          </div>
        </div>
      )}
    </section>
  );
}
