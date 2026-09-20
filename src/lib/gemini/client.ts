import { GoogleGenerativeAI } from '@google/generative-ai';
import { Question, DocumentMaterial, QuestionDifficulty, DocumentChunk } from '../db/types';
import { cleanPdfText } from '../rag/documentProcessor';

export interface GenerateQuizRequest {
  document?: DocumentMaterial;
  documents?: DocumentMaterial[];
  courseId: string;
  assessmentTitle: string;
  totalQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  topicFocus?: string;
  moduleName?: string;
}

export interface GeneratedQuestionItem {
  id: string;
  topic: string;
  difficulty: QuestionDifficulty;
  questionText: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  sourceCitation: {
    documentTitle: string;
    pageNumber: number;
    sectionTitle?: string;
    excerpt?: string;
  };
}

const INCOMPLETE_ENDING = /(?:\.{3}|…|\b(?:etc|and so on))\s*$/i;

export function hasIncompleteOptionText(question: Pick<GeneratedQuestionItem, 'options'>): boolean {
  return !Array.isArray(question.options) || question.options.length !== 4 || question.options.some((option) => {
    const text = String(option?.text || '').trim();
    return text.length < 2 || INCOMPLETE_ENDING.test(text);
  });
}

// ─── Concept types for multi-pattern extraction ───
type ConceptType = 'DEFINITION' | 'PROPERTY' | 'COMPARISON' | 'PROCESS' | 'EXAMPLE' | 'FEATURE' | 'FACT';

interface ExtractedConcept {
  type: ConceptType;
  subject: string;
  predicate: string;
  fullSentence: string;
  docTitle: string;
  pageNumber: number;
  sectionTitle: string;
  quality: number; // 0-100 informativeness score
}

// ─── Stopwords & invalid single-word subjects ───
const SKIP_SUBJECTS = new Set([
  'this', 'that', 'it', 'they', 'the', 'a', 'an', 'for', 'in', 'on', 'at', 'to', 'of',
  'with', 'by', 'from', 'as', 'but', 'or', 'and', 'not', 'if', 'so', 'do', 'be',
  'easy', 'difficult', 'hard', 'simple', 'new', 'old', 'also', 'each', 'these', 'those',
  'some', 'many', 'more', 'most', 'such', 'very', 'all', 'any', 'both', 'other', 'same',
  'however', 'therefore', 'thus', 'hence', 'since', 'because', 'although', 'while',
  'above', 'below', 'here', 'there', 'where', 'when', 'how', 'what', 'which', 'who',
  'following', 'example', 'figure', 'table', 'note', 'important', 'reason', 'the reason',
  'provides', 'uses', 'allows', 'consists', 'means', 'type', 'types', 'way', 'ways',
  'fact', 'facts', 'problem', 'benefit', 'benefits', 'feature', 'features', 'scenario',
  'eventually', 'moreover', 'furthermore', 'additionally', 'consequently',
]);

export class GeminiAssessmentEngine {
  private apiKeyStatus: 'UNTESTED' | 'VALID' | 'INVALID' = 'UNTESTED';

  private getApiKey(): string | null {
    const key = process.env.GEMINI_API_KEY || null;
    return key && key.trim().length > 5 ? key.trim() : null;
  }

  private getGenAI(): GoogleGenerativeAI | null {
    if (this.apiKeyStatus === 'INVALID') return null;
    const apiKey = this.getApiKey();
    if (apiKey) return new GoogleGenerativeAI(apiKey);
    return null;
  }

  isLiveGeminiEnabled(): boolean {
    return Boolean(this.getApiKey()) && this.apiKeyStatus !== 'INVALID';
  }

  async generateQuestions(req: GenerateQuizRequest): Promise<Question[]> {
    const genAI = this.getGenAI();
    if (genAI) {
      try {
        console.log('[QuizSom] Attempting Gemini API generation...');
        const modelNames = [
          'gemini-3.6-flash',
          'gemini-3.5-flash',
          'gemini-3.7-flash',
          'gemini-flash-latest',
        ];
        for (const modelName of modelNames) {
          try {
            const liveQuestions = await this.callLiveGemini(genAI, modelName, req);
            if (liveQuestions && liveQuestions.length > 0) {
              const completeQuestions = liveQuestions.filter((question) => !hasIncompleteOptionText(question));
              if (!completeQuestions.length) throw new Error('Gemini returned only incomplete answer options');
              console.log(`[QuizSom] ✓ Generated ${liveQuestions.length} questions via ${modelName}`);
              this.apiKeyStatus = 'VALID';
              return this.validateAndFormatQuestions(completeQuestions, req.courseId);
            }
          } catch (modelErr: any) {
            const errMsg = modelErr?.message || '';
            console.warn(`[QuizSom] Model ${modelName} attempt:`, errMsg.slice(0, 120));
          }
        }
      } catch (err: any) {
        console.warn('[QuizSom] Gemini API error:', err?.message?.slice(0, 120));
      }
    } else {
      console.log('[QuizSom] No valid Gemini API key. Using local RAG generator.');
    }

    return this.generateLocalRAGQuestions(req);
  }

  private async callLiveGemini(
    genAI: GoogleGenerativeAI,
    modelName: string,
    req: GenerateQuizRequest
  ): Promise<GeneratedQuestionItem[]> {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json', temperature: 0.15 },
    });

    const docs = (req.documents && req.documents.length > 0)
      ? req.documents
      : req.document ? [req.document] : [];

    const totalTarget = Math.max(1, req.totalQuestions);
    const questionsPerDoc = Math.max(1, Math.ceil(totalTarget / Math.max(1, docs.length)));

    // Large PDFs can contain hundreds of pages. Sample page-aware chunks evenly
    // across every document instead of silently taking only the first 25k chars.
    const contextBudget = 24000;
    const perDocumentBudget = Math.max(2500, Math.floor(contextBudget / Math.max(1, docs.length)));
    const contextText = docs.map((d, idx) => {
      const chunks = d.chunks?.length ? d.chunks : [{ pageNumber: 1, sectionTitle: 'Course Notes', content: d.rawText || 'Core curriculum content.' } as DocumentChunk];
      const desired = Math.min(chunks.length, Math.max(questionsPerDoc * 3, 8));
      const selected = Array.from({ length: desired }, (_, sampleIndex) =>
        chunks[Math.min(chunks.length - 1, Math.floor(sampleIndex * chunks.length / desired))]
      );
      let used = 0;
      const blocks: string[] = [];
      for (const chunk of selected) {
        const block = `[DOCUMENT: ${d.title} | PAGE: ${chunk.pageNumber} | SECTION: ${chunk.sectionTitle || 'Course material'}]\n${chunk.content}`;
        if (blocks.length && used + block.length > perDocumentBudget) break;
        blocks.push(block.slice(0, Math.max(0, perDocumentBudget - used)));
        used += block.length;
      }
      return `DOCUMENT #${idx + 1}: "${d.title}" (${d.pageCount || 1} pages)\n${blocks.join('\n\n')}`;
    }).join('\n\n');

    const prompt = `You are creating a university-level multiple-choice quiz from the provided course material.

MATERIAL:
${contextText}

${req.topicFocus ? `REMEDIATION FOCUS:\nGenerate questions specifically about "${req.topicFocus}". Use only source blocks that directly support this topic. Vary the concepts and avoid merely repeating one fact.` : ''}

RULES:
1. Generate exactly ${totalTarget} questions.
2. Every question and its correct option MUST be explicitly stated in ONE supplied [DOCUMENT | PAGE | SECTION] block. Do NOT use external knowledge or infer an answer.
3. ${req.topicFocus ? `Keep every question focused on ${req.topicFocus}, while covering different supporting concepts from the material.` : 'Distribute questions across ALL chapters/sections in the material evenly.'}
4. Write clear, natural academic questions. Do NOT include author names, dates, slide numbers, or URLs in questions.
5. Each question has exactly 4 options (opt_1 through opt_4). One correct, three plausible distractors from the same text.
6. Every option must be a complete sentence or phrase. Never truncate an option and never end it with "..." or "…".
7. Difficulty: ${req.difficulty === 'mixed' ? 'mix of easy, medium, and hard' : req.difficulty}.
8. The sourceCitation page number must be the PAGE printed above the source block. Its excerpt must be a verbatim sentence from that SAME block and must contain the complete correct answer (or the exact factual words which make it correct). If you cannot meet this, do not generate the question.

Return JSON:
{
  "questions": [
    {
      "id": "q1",
      "topic": "Chapter/Section Name",
      "difficulty": "medium",
      "questionText": "Natural academic question?",
      "options": [
        { "id": "opt_1", "text": "Answer A" },
        { "id": "opt_2", "text": "Answer B" },
        { "id": "opt_3", "text": "Answer C" },
        { "id": "opt_4", "text": "Answer D" }
      ],
      "correctOptionId": "opt_2",
      "explanation": "Explanation citing the text.",
      "sourceCitation": {
        "documentTitle": "Document Title",
        "pageNumber": 3,
        "sectionTitle": "Section Name",
        "excerpt": "Verbatim quote from text."
      }
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
    throw new Error('Malformed JSON output from Gemini');
  }

  async regenerateSingleQuestion(
    currentQuestion: Question,
    document: DocumentMaterial,
    customInstruction?: string
  ): Promise<Question> {
    const genAI = this.getGenAI();
    if (genAI) {
      try {
        const modelNames = [
          'gemini-3.6-flash',
          'gemini-3.5-flash',
          'gemini-3.7-flash',
          'gemini-flash-latest',
        ];
        for (const modelName of modelNames) {
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
            });
            const cleaned = cleanPdfText(document.rawText);
            const prompt = `Regenerate one multiple-choice question from this course material.
Document: ${document.title}
Text:
${cleaned.slice(0, 15000)}
Original topic: ${currentQuestion.topic}
Instruction: ${customInstruction || 'Create a fresh question on this topic from the text.'}
Return JSON:
{
  "question": {
    "topic": "${currentQuestion.topic}",
    "difficulty": "${currentQuestion.difficulty}",
    "questionText": "...",
    "options": [
      { "id": "opt_1", "text": "..." }, { "id": "opt_2", "text": "..." },
      { "id": "opt_3", "text": "..." }, { "id": "opt_4", "text": "..." }
    ],
    "correctOptionId": "opt_1",
    "explanation": "...",
    "sourceCitation": { "documentTitle": "${document.title}", "pageNumber": 1, "sectionTitle": "...", "excerpt": "..." }
  }
}`;
            const result = await model.generateContent(prompt);
            const parsed = JSON.parse(result.response.text());
            if (parsed?.question) {
              return {
                ...currentQuestion,
                questionText: parsed.question.questionText,
                options: parsed.question.options,
                correctOptionId: parsed.question.correctOptionId,
                explanation: parsed.question.explanation,
                sourceCitation: { ...currentQuestion.sourceCitation, ...parsed.question.sourceCitation },
                isValidated: true,
                isCustomEdited: true,
              };
            }
          } catch (modelErr: any) {
            if (modelErr?.message?.includes('API_KEY_INVALID')) break;
          }
        }
      } catch (err) { /* fallthrough */ }
    }

    // Fallback regeneration using enhanced local extractor
    const fallbackQuestions = this.generateLocalRAGQuestions({
      document,
      courseId: currentQuestion.courseId,
      assessmentTitle: 'Regeneration',
      totalQuestions: 5,
      difficulty: currentQuestion.difficulty,
    });

    const matching = fallbackQuestions.find((q) => q.topic === currentQuestion.topic) || fallbackQuestions[0];
    if (matching) {
      return {
        ...currentQuestion,
        questionText: matching.questionText,
        options: matching.options,
        correctOptionId: matching.correctOptionId,
        explanation: matching.explanation,
        sourceCitation: matching.sourceCitation,
        isValidated: true,
        isCustomEdited: true,
      };
    }

    return currentQuestion;
  }

  validateAndFormatQuestions(rawItems: GeneratedQuestionItem[], courseId: string): Question[] {
    const questions: Question[] = [];
    const seenTexts = new Set<string>();

    rawItems.forEach((item, idx) => {
      if (hasIncompleteOptionText(item)) return;
      const normalizedText = (item.questionText || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!normalizedText || seenTexts.has(normalizedText)) return;
      seenTexts.add(normalizedText);

      let options = item.options || [];
      if (options.length < 4) {
        options = [{ id: 'opt_1', text: 'Option A' }, { id: 'opt_2', text: 'Option B' },
                   { id: 'opt_3', text: 'Option C' }, { id: 'opt_4', text: 'Option D' }];
      }
      let correctOptionId = item.correctOptionId;
      if (!options.some((o) => o.id === correctOptionId)) correctOptionId = options[0].id;

      questions.push({
        id: `q_gen_${Date.now()}_${idx + 1}`,
        courseId,
        topic: item.topic || 'General Concepts',
        difficulty: (['easy', 'medium', 'hard'].includes(item.difficulty) ? item.difficulty : 'medium') as QuestionDifficulty,
        questionText: item.questionText,
        options,
        correctOptionId,
        explanation: item.explanation || 'Verified from course material.',
        sourceCitation: {
          documentTitle: item.sourceCitation?.documentTitle || 'Course Material',
          pageNumber: item.sourceCitation?.pageNumber || 1,
          sectionTitle: item.sourceCitation?.sectionTitle || 'Core Concepts',
          excerpt: item.sourceCitation?.excerpt || '',
        },
        isValidated: true,
        createdAt: new Date().toISOString(),
      });
    });
    return questions;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ADVANCED LOCAL RAG QUESTION ENGINE
  // Multi-pattern NLP concept extractor with Anaphora Resolution & Semantic Distractors
  // ═══════════════════════════════════════════════════════════════════════════════
  private generateLocalRAGQuestions(req: GenerateQuizRequest): Question[] {
    const docs = req.documents && req.documents.length > 0
      ? req.documents
      : req.document ? [req.document] : [];

    if (docs.length === 0) return [];

    const totalToGenerate = Math.min(30, Math.max(1, req.totalQuestions));

    // ── STEP 1: Extract concepts with Anaphora Resolution ──
    const concepts: ExtractedConcept[] = [];

    docs.forEach((doc) => {
      // Prefer stored page-aware chunks over a guessed split of the full text.
      // The page attached to a concept is then the page we can actually show.
      const sections = doc.chunks?.length
        ? doc.chunks.map((chunk) => ({
            title: chunk.sectionTitle || 'Course Material',
            text: cleanPdfText(chunk.content),
            pageNumber: chunk.pageNumber,
          }))
        : this.splitIntoSections(cleanPdfText(doc.rawText), doc.pageCount);

      sections.forEach((section) => {
        const extracted = this.extractConceptsFromSection(section.text, section.title, section.pageNumber, doc.title);
        concepts.push(...extracted);
      });
    });

    // Clean and normalize all subjects
    concepts.forEach((c) => {
      // Strip leading prepositions, articles, pronouns
      c.subject = c.subject.replace(/^(?:In|For|On|At|With|From|By|As|The|An?|This|That|These|Those|Its?|Here|There)\s+/i, '');
      // Strip trailing punctuation & conjunctions
      c.subject = c.subject.replace(/[\s:,;\-–—]+$/, '').trim();
      c.subject = c.subject.replace(/\s+(?:is|are|was|were|has|have|can|will|may|the|a|an)$/i, '').trim();
      // Capitalize first letter
      if (c.subject.length > 0) {
        c.subject = c.subject.charAt(0).toUpperCase() + c.subject.slice(1);
      }
      // Penalize header-like predicates
      if (c.predicate === c.predicate.toUpperCase() && /^[A-Z]{4,}/.test(c.predicate)) {
        c.quality = Math.max(0, c.quality - 60);
      }
    });

    // Filter usable high-quality concepts
    const usable = concepts
      .filter((c) => {
        const subLow = c.subject.toLowerCase().trim();
        if (subLow.length < 4) return false;
        if (SKIP_SUBJECTS.has(subLow)) return false;
        if (/^\d/.test(subLow)) return false;
        if (c.quality < 20) return false;
        const wordCount = c.subject.split(/\s+/).length;
        if (wordCount > 5) return false; // Concise subjects only
        // Reject institutional/structural headers
        if (/^(department|course|section|page|module|unit|chapter|slide|semester|university|college|faculty|professor|school|author|http|www)\b/i.test(c.subject)) return false;
        // Reject ALL CAPS subjects
        if (c.subject === c.subject.toUpperCase() && c.subject.length > 5 && !/\d/.test(c.subject)) return false;
        // Reject header predicates
        if (c.predicate.startsWith('SECTION') || c.predicate.startsWith('DEPARTMENT') || c.predicate.startsWith('COURSE')) return false;
        return true;
      })
      .sort((a, b) => b.quality - a.quality);

    if (usable.length === 0) {
      console.warn('[QuizSom] No usable concepts extracted.');
      return [];
    }

    console.log(`[QuizSom] Extracted ${usable.length} high-grade concepts across ${docs.length} document(s). Generating ${totalToGenerate} questions.`);

    // ── STEP 2: Balanced distribution across sections ──
    const sectionMap = new Map<string, ExtractedConcept[]>();
    usable.forEach((c) => {
      const key = c.sectionTitle;
      if (!sectionMap.has(key)) sectionMap.set(key, []);
      sectionMap.get(key)!.push(c);
    });

    const sectionKeys = Array.from(sectionMap.keys());
    const balanced: ExtractedConcept[] = [];
    let sectionIdx = 0;
    const sectionCursors = new Map<string, number>();
    sectionKeys.forEach((k) => sectionCursors.set(k, 0));

    for (let i = 0; i < totalToGenerate; i++) {
      const key = sectionKeys[sectionIdx % sectionKeys.length];
      const pool = sectionMap.get(key)!;
      const cursor = sectionCursors.get(key)! % pool.length;
      balanced.push(pool[cursor]);
      sectionCursors.set(key, cursor + 1);
      sectionIdx++;
    }

    // ── STEP 3: Build diverse questions with semantic distractors ──
    const generated: Question[] = [];
    const usedQuestionTexts = new Set<string>();

    balanced.forEach((concept, i) => {
      const difficultyLevel: QuestionDifficulty =
        req.difficulty === 'mixed'
          ? (['easy', 'medium', 'hard'] as QuestionDifficulty[])[i % 3]
          : req.difficulty;

      const { questionText, correctAnswer, distractors } =
        this.buildQuestion(concept, usable, i, difficultyLevel);

      const qNorm = questionText.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (usedQuestionTexts.has(qNorm)) return;
      usedQuestionTexts.add(qNorm);

      // Rotate correct answer position across options 1..4
      const correctPos = i % 4;
      const allAnswers = [...distractors.slice(0, 3)];
      while (allAnswers.length < 3) allAnswers.push('This principle is not specified in the primary course curriculum');
      allAnswers.splice(correctPos, 0, correctAnswer);

      const options = allAnswers.map((text, pos) => ({
        id: `opt_${pos + 1}`,
        text,
      }));

      generated.push({
        id: `q_local_${Date.now()}_${i + 1}`,
        courseId: req.courseId,
        topic: concept.sectionTitle,
        difficulty: difficultyLevel,
        questionText,
        options,
        correctOptionId: `opt_${correctPos + 1}`,
        explanation: `From "${concept.docTitle}" (Page ${concept.pageNumber}, ${concept.sectionTitle}): "${concept.fullSentence}"`,
        sourceCitation: {
          documentTitle: concept.docTitle,
          pageNumber: concept.pageNumber,
          sectionTitle: concept.sectionTitle,
          excerpt: concept.fullSentence,
        },
        isValidated: true,
        createdAt: new Date().toISOString(),
      });
    });

    return generated;
  }

  // ── Section Splitter ──
  private splitIntoSections(text: string, totalPages: number): { title: string; text: string; pageNumber: number }[] {
    const sections: { title: string; text: string; pageNumber: number }[] = [];
    const lines = text.split('\n');
    let currentTitle = 'Core Concepts & Fundamentals';
    let currentText = '';
    let sectionStartLine = 0;

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();

      const isHeading =
        (trimmed.length > 4 && trimmed.length < 75 &&
         (trimmed === trimmed.toUpperCase() && /[A-Z]{3,}/.test(trimmed)) ||
         /^(?:SECTION|CHAPTER|MODULE|UNIT|TOPIC|PART)\s*[\d.:]/i.test(trimmed) ||
         /^\d+\.\d*\s+[A-Z][A-Za-z\s&,\-]{4,60}$/.test(trimmed));

      if (isHeading && currentText.trim().length > 60) {
        const estPage = Math.min(totalPages, Math.max(1,
          Math.floor(sectionStartLine / Math.max(1, Math.ceil(lines.length / totalPages))) + 1));
        sections.push({ title: currentTitle, text: currentText.trim(), pageNumber: estPage });
        currentTitle = trimmed.replace(/^[\d.\s:–\-]+/, '').trim();
        if (currentTitle.length < 3) currentTitle = trimmed;
        currentText = '';
        sectionStartLine = lineIdx;
      } else {
        currentText += line + '\n';
      }
    });

    if (currentText.trim().length > 30) {
      const estPage = Math.min(totalPages, Math.max(1,
        Math.floor(sectionStartLine / Math.max(1, Math.ceil(lines.length / totalPages))) + 1));
      sections.push({ title: currentTitle, text: currentText.trim(), pageNumber: estPage });
    }

    if (sections.length <= 1 && text.length > 200) {
      const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 40);
      const chunkSize = Math.max(1, Math.ceil(paragraphs.length / Math.min(6, Math.max(2, Math.ceil(totalPages / 3)))));

      for (let i = 0; i < paragraphs.length; i += chunkSize) {
        const chunk = paragraphs.slice(i, i + chunkSize).join('\n\n');
        const firstLine = chunk.split('\n')[0].replace(/^[\d.#*_\-\s]+/, '').trim();
        const title = (firstLine.length > 5 && firstLine.length < 65) ? firstLine : `Module Part ${Math.floor(i / chunkSize) + 1}`;
        const estPage = Math.min(totalPages, Math.floor(i / Math.max(1, Math.ceil(paragraphs.length / totalPages))) + 1);
        sections.push({ title, text: chunk, pageNumber: estPage });
      }
    }

    return sections.length > 0 ? sections : [{ title: 'Course Material', text, pageNumber: 1 }];
  }

  // ── Multi-Pattern Concept Extractor with Anaphora Resolution ──
  private extractConceptsFromSection(
    text: string,
    sectionTitle: string,
    pageNumber: number,
    docTitle: string
  ): ExtractedConcept[] {
    const results: ExtractedConcept[] = [];
    const sentences = text
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => {
        if (s.length < 30 || s.length > 280) return false;
        if (/^(created by|from\s*:|by\s*[–-]|www\.|http|prof\b|dr\b|page\b|slide\b)/i.test(s)) return false;
        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)) return false;
        if (!/^[A-Za-z]/.test(s)) return false;
        const wc = s.split(/\s+/).filter((w) => w.length > 1).length;
        return wc >= 6;
      });

    let activeSubject = sectionTitle.replace(/^[\d.\s:–\-]+/, '').trim();

    sentences.forEach((sent) => {
      // Check for Anaphora (sentences starting with "It provides", "It is", "This is")
      const isPronounStart = /^(?:It|This|These|They)\s+(?:is|are|provides?|enables?|ensures?|allows?|requires?|consists?|means?)/i.test(sent);

      // Pattern 1: DEFINITION — "X is/are/refers to Y"
      const defMatch = sent.match(
        /^(.{4,50}?)\s+(?:is|are|refers?\s+to|is\s+defined\s+as|is\s+known\s+as|means?|consists?\s+of|represents?)\s+(.{15,}?)\.?$/i
      );
      if (defMatch) {
        let subj = defMatch[1].trim().replace(/^[^A-Za-z]+/, '');
        const pred = defMatch[2].trim().replace(/\.+$/, '');

        // If subject is a pronoun, resolve to active subject
        if (isPronounStart && activeSubject) {
          subj = activeSubject;
        } else if (subj.length >= 4) {
          activeSubject = subj;
        }

        if (subj.length >= 4 && pred.length >= 15) {
          results.push({
            type: 'DEFINITION', subject: subj,
            predicate: pred.charAt(0).toUpperCase() + pred.slice(1),
            fullSentence: sent, docTitle, pageNumber, sectionTitle,
            quality: 90 + Math.min(10, subj.length),
          });
          return;
        }
      }

      // Pattern 2: PROPERTY — "X provides/enables/ensures/requires/allows Y"
      const propMatch = sent.match(
        /^(.{4,50}?)\s+(?:provides?|enables?|ensures?|requires?|allows?|supports?|includes?|uses?|implements?|maintains?|creates?|prevents?|eliminates?)\s+(.{12,}?)\.?$/i
      );
      if (propMatch) {
        let subj = propMatch[1].trim().replace(/^[^A-Za-z]+/, '');
        const pred = propMatch[2].trim().replace(/\.+$/, '');

        if (isPronounStart && activeSubject) {
          subj = activeSubject;
        } else if (subj.length >= 4) {
          activeSubject = subj;
        }

        if (subj.length >= 4 && pred.length >= 12) {
          results.push({
            type: 'PROPERTY', subject: subj,
            predicate: pred.charAt(0).toUpperCase() + pred.slice(1),
            fullSentence: sent, docTitle, pageNumber, sectionTitle,
            quality: 80 + Math.min(10, subj.length),
          });
          return;
        }
      }

      // Pattern 3: LIST / FEATURE ITEM — "Concept: Description" or "Feature - Description"
      const listMatch = sent.match(/^([A-Z][a-zA-Z\s]{3,35})\s*[:\-–—]\s*(.{15,})$/);
      if (listMatch) {
        const subj = listMatch[1].trim();
        const pred = listMatch[2].trim().replace(/\.+$/, '');
        if (subj.length >= 4 && pred.length >= 15) {
          activeSubject = subj;
          results.push({
            type: 'FEATURE', subject: subj,
            predicate: pred.charAt(0).toUpperCase() + pred.slice(1),
            fullSentence: sent, docTitle, pageNumber, sectionTitle,
            quality: 85,
          });
          return;
        }
      }

      // Pattern 4: COMPARISON — sentences with "unlike/whereas/compared to/differs from/in contrast"
      if (/\b(unlike|whereas|compared\s+to|differs?\s+from|in\s+contrast|on\s+the\s+other\s+hand|rather\s+than)\b/i.test(sent)) {
        const capitalMatch = sent.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\b/);
        const subj = capitalMatch ? capitalMatch[1] : activeSubject || 'This concept';
        results.push({
          type: 'COMPARISON', subject: subj,
          predicate: sent.replace(/\.+$/, ''),
          fullSentence: sent, docTitle, pageNumber, sectionTitle,
          quality: 85,
        });
        return;
      }

      // Pattern 5: PROCESS — sentences with step/phase/stage/procedure/first/then/finally
      if (/\b(step|phase|stage|procedure|first|then|finally|next|begins?\s+with|followed\s+by|process\s+of)\b/i.test(sent)) {
        const capitalMatch = sent.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\b/);
        const subj = capitalMatch ? capitalMatch[1] : activeSubject || 'This process';
        results.push({
          type: 'PROCESS', subject: subj,
          predicate: sent.replace(/\.+$/, ''),
          fullSentence: sent, docTitle, pageNumber, sectionTitle,
          quality: 75,
        });
        return;
      }

      // Pattern 6: GENERAL FACT with capitalized concept
      const capitalMatch = sent.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\b/);
      if (capitalMatch && capitalMatch[1].length >= 4 && sent.length > 45) {
        results.push({
          type: 'FACT', subject: capitalMatch[1],
          predicate: sent.replace(/\.+$/, ''),
          fullSentence: sent, docTitle, pageNumber, sectionTitle,
          quality: 55 + Math.min(15, capitalMatch[1].length),
        });
      }
    });

    return results;
  }

  // ── Question Builder — picks question type based on concept type ──
  private buildQuestion(
    concept: ExtractedConcept,
    allConcepts: ExtractedConcept[],
    index: number,
    difficulty: QuestionDifficulty
  ): { questionText: string; correctAnswer: string; distractors: string[] } {

    const subjectDisplay = concept.subject;

    let questionText = '';
    const correctAnswer = concept.predicate;

    switch (concept.type) {
      case 'DEFINITION': {
        const templates = [
          `What is ${subjectDisplay}?`,
          `How is ${subjectDisplay} defined in the course material?`,
          `Which of the following best defines the concept of ${subjectDisplay}?`,
        ];
        questionText = templates[index % templates.length];
        break;
      }
      case 'PROPERTY': {
        const templates = [
          `What does ${subjectDisplay} provide or enable?`,
          `Which capability or property is associated with ${subjectDisplay}?`,
          `What is a key functional requirement of ${subjectDisplay}?`,
        ];
        questionText = templates[index % templates.length];
        break;
      }
      case 'FEATURE': {
        const templates = [
          `According to the curriculum, what does ${subjectDisplay} represent?`,
          `Which description accurately corresponds to ${subjectDisplay}?`,
        ];
        questionText = templates[index % templates.length];
        break;
      }
      case 'COMPARISON': {
        questionText = `Which of the following correctly describes a distinction involving ${subjectDisplay}?`;
        break;
      }
      case 'PROCESS': {
        const templates = [
          `Which statement correctly describes the operation involving ${subjectDisplay}?`,
          `What execution flow or procedure is associated with ${subjectDisplay}?`,
        ];
        questionText = templates[index % templates.length];
        break;
      }
      case 'FACT':
      default: {
        const templates = [
          `According to the course material on "${concept.sectionTitle}", which statement about ${subjectDisplay} is correct?`,
          `Which of the following is true regarding ${subjectDisplay}?`,
          `What does the curriculum state regarding ${subjectDisplay}?`,
        ];
        questionText = templates[index % templates.length];
        break;
      }
    }

    // Build smart semantic distractors:
    // 1. Same concept type + same section
    // 2. Same concept type + other sections
    // 3. Any concept from other sections
    const sameTypeAndSection = allConcepts.filter(
      (c) => c.type === concept.type && c.sectionTitle === concept.sectionTitle && c.subject !== concept.subject && c.predicate !== concept.predicate
    );
    const sameTypeOtherSection = allConcepts.filter(
      (c) => c.type === concept.type && c.subject !== concept.subject && c.predicate !== concept.predicate
    );
    const fallbackConcepts = allConcepts.filter(
      (c) => c.subject !== concept.subject && c.predicate !== concept.predicate
    );

    const distractorPool = sameTypeAndSection.length >= 3
      ? sameTypeAndSection
      : sameTypeOtherSection.length >= 3
      ? sameTypeOtherSection
      : fallbackConcepts;

    const distractors: string[] = [];
    const step = Math.max(1, Math.floor(distractorPool.length / 4));

    for (let d = 0; d < 3; d++) {
      const idx = (index + (d + 1) * step) % Math.max(1, distractorPool.length);
      const candidate = distractorPool[idx];
      if (candidate) {
        const distText = candidate.predicate;
        if (distText !== correctAnswer && !distractors.includes(distText)) {
          distractors.push(distText);
        }
      }
    }

    return { questionText, correctAnswer, distractors };
  }
}

export const geminiEngine = new GeminiAssessmentEngine();
