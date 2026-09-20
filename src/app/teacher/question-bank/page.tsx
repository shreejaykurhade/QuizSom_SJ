'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileQuestion,
  Search,
  PlusCircle,
  RefreshCw,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { Question } from '@/lib/db/types';

export default function TeacherQuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadQuestions() {
      try {
        const queryParams = new URLSearchParams();
        if (search) queryParams.append('search', search);
        if (topicFilter) queryParams.append('topic', topicFilter);
        if (difficultyFilter) queryParams.append('difficulty', difficultyFilter);

        const res = await fetch(`/api/questions?${queryParams.toString()}`);
        const data = await res.json();
        if (data.questions) {
          setQuestions(data.questions);
        }
      } catch (err) {
        console.error('Failed to load question bank:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadQuestions();
  }, [search, topicFilter, difficultyFilter]);

  const availableTopics = Array.from(
    new Set(questions.map((q) => q.topic).filter(Boolean))
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Question Bank
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, filter, and reuse source-grounded academic assessment items generated from your uploaded materials.
          </p>
        </div>

        <Link
          href="/teacher/create"
          className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Generate New Questions
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm grid sm:grid-cols-12 gap-3 text-xs">
        <div className="sm:col-span-6 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions or keywords..."
            className="input-academic text-xs w-full"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="input-academic text-xs w-full"
          >
            <option value="">All Topics</option>
            {availableTopics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="input-academic text-xs w-full"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>Loading question repository...</span>
        </div>
      ) : questions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <FileQuestion className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Assessment Questions Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Upload PDF or document course material in the assessment creator to automatically generate and curate items for your question bank.
            </p>
          </div>
          <Link
            href="/teacher/create"
            className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            Generate First Assessment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="break-words [overflow-wrap:anywhere] text-sm font-bold text-slate-900 leading-snug">{q.questionText}</h3>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                      <span>Topic: <strong className="text-slate-800 font-semibold">{q.topic}</strong></span>
                      <span>• Difficulty: <strong className="capitalize text-slate-800 font-semibold">{q.difficulty}</strong></span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold shrink-0">
                  Grounded ✓
                </span>
              </div>

              {/* Options display */}
              <div className="grid sm:grid-cols-2 gap-2 text-xs pt-1">
                {q.options.map((opt, optIdx) => {
                  const isCorrect = opt.id === q.correctOptionId;
                  return (
                    <div
                      key={opt.id}
                      className={`min-w-0 p-2.5 rounded-xl border flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between ${
                        isCorrect
                          ? 'border-emerald-300 bg-emerald-50/80 text-emerald-900 font-bold'
                          : 'border-slate-200 bg-slate-50/60 text-slate-800'
                      }`}
                    >
                      <span className="flex min-w-0 items-start gap-1.5">
                        <span className="shrink-0 font-mono text-[11px] font-bold text-slate-500">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        <span className="min-w-0 break-words [overflow-wrap:anywhere]">{opt.text}</span>
                      </span>
                      {isCorrect && (
                        <span className="text-[9px] font-mono uppercase bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">
                          Correct Answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation & Source Citation */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
                <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                  Source: {q.sourceCitation?.documentTitle || 'Course Material'} · Page {q.sourceCitation?.pageNumber || 1} · {q.sourceCitation?.sectionTitle || 'Section'}
                </div>
                <div className="text-emerald-700 font-bold shrink-0 text-[10px]">
                  Curated Item ✓
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
