import { DocumentChunk, DocumentMaterial } from '../db/types';
import JSZip from 'jszip';

export interface ProcessedDocumentResult {
  title: string;
  rawText: string;
  pageCount: number;
  chunks: DocumentChunk[];
  topics: string[];
}

/**
 * Aggressively cleans PDF-extracted text by removing:
 * - Recurring slide/page headers (e.g. "Yogita Borse 3", "Created by Prof")
 * - Author lines with websites/emails (e.g. "Tushar B. Kute, http://tusharkute.com")
 * - Dates, URLs, publisher metadata
 * - Non-printable characters and PDF artifacts
 * - Standalone page/slide numbers
 * - Formatting noise and bullet symbols
 */
export function cleanPdfText(raw: string): string {
  if (!raw) return '';

  // Step 1: Remove non-printable / PDF binary garbage
  let text = raw
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/[\u2588\u25A0\uFFFD\uFEFF]/g, '')
    // Remove Private Use Area characters (PDF bullet symbols like U+F0A8, U+F0B7, etc.)
    .replace(/[\uE000-\uF8FF]/g, '')
    // Replace common PDF bullet symbols with a clean standard separator
    .replace(/[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u25CF\u25CB]/g, '\n• ')
    .replace(/[]/g, '\n• ');

  // Step 2: Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step 3: Remove author + website / email combos (e.g. "Tushar B. Kute, http://tusharkute.com")
  text = text.replace(/^[A-Z][a-zA-Z\s.,]+(?:http[s]?:\/\/\S+|www\.\S+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}).*$/gim, '');
  text = text.replace(/(?:by\s+)?[A-Z][a-zA-Z\s.,]+\s*,\s*(?:http[s]?:\/\/\S+|www\.\S+)/gi, '');

  // Step 4: Remove recurring slide headers like "1/1/2019 Created by Prof. Yogita Borse 3"
  text = text.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}\s+Created\s+by\s+[A-Za-z.\s]+\d*\s*/gi, '');

  // Step 5: Remove standalone "Created by Prof..." lines
  text = text.replace(/^Created\s+by\s+.{2,60}$/gim, '');

  // Step 6: Remove source attribution lines (From: Book By – Author www.site.com)
  text = text.replace(/^From\s*:\s*.+$/gim, '');
  text = text.replace(/^By\s*[–-]\s*.+$/gim, '');
  text = text.replace(/^Author\s*:\s*.+$/gim, '');

  // Step 7: Remove standalone URLs and web addresses
  text = text.replace(/^(https?:\/\/|www\.)\S+\s*$/gim, '');
  text = text.replace(/(https?:\/\/|www\.)\S+/gi, '');

  // Step 8: Remove standalone dates like "1/1/2019"
  text = text.replace(/^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/gm, '');

  // Step 9: Remove standalone page/slide numbers
  text = text.replace(/^\s*\d{1,3}\s*$/gm, '');

  // Step 10: Remove repeated header-like patterns (Author Name + Number on its own line)
  text = text.replace(/^[A-Z][a-z]+\s+[A-Z][a-z]+\s+\d{1,3}\s*$/gm, '');

  // Step 11: Remove "Slide X", "Page X of Y", "--- PAGE X ---"
  text = text.replace(/^(?:slide|page)\s+\d+(\s+of\s+\d+)?\s*$/gim, '');
  text = text.replace(/^---\s*PAGE\s+\d+\s*---$/gim, '');

  // Step 12: Merge broken hyphenated words at line ends
  text = text.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2');

  // Step 13: Convert bullets into coherent sentences
  // e.g. "• Benefits : increased efficiency" -> "Benefits include: increased efficiency"
  text = text.replace(/^\s*•\s*/gm, '');

  // Step 14: Collapse excessive whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  // Step 15: Remove lines that are just whitespace or single characters
  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 2)
    .join('\n');

  return text.trim();
}

function decodeOfficeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractOpenXmlText(buffer: Buffer, kind: 'pptx' | 'docx') {
  const archive = await JSZip.loadAsync(buffer);
  if (kind === 'pptx') {
    const slides = Object.keys(archive.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1]) - Number(b.match(/slide(\d+)/)?.[1]));
    const pages = await Promise.all(slides.map(async (name, index) => {
      const xml = await archive.file(name)!.async('text');
      const text = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g))
        .map((match) => decodeOfficeXml(match[1]))
        .join('\n');
      return `[[PAGE ${index + 1}]]\n${text}`;
    }));
    return { text: pages.join('\n\n'), pageCount: Math.max(1, pages.length) };
  }

  const documentXml = archive.file('word/document.xml');
  if (!documentXml) throw new Error('The DOCX file does not contain a readable document body');
  const xml = await documentXml.async('text');
  const withParagraphs = xml.replace(/<\/w:p>/g, '\n\n').replace(/<w:tab\/>/g, ' ');
  const text = Array.from(withParagraphs.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>|(\n\n)/g))
    .map((match) => match[2] || decodeOfficeXml(match[1] || ''))
    .join('');
  return { text, pageCount: Math.max(1, Math.ceil(text.split(/\s+/).length / 400)) };
}

export async function processDocumentBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  courseId: string
): Promise<DocumentMaterial> {
  // Lazy-import to keep the module lightweight when vision isn't needed
  const { isImageMime, isTextSparse, isVisionSupported, extractTextWithVision } = await import('./visionOcr');

  let rawText = '';
  let pageCount = 1;
  let usedVisionOcr = false;

  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const isImage = isImageMime(mimeType) || /\.(png|jpe?g|webp|heic|heif|tiff?|bmp)$/i.test(fileName);

  if (isPdf) {
    // ── Step 1: Try standard text-layer extraction via pdf-parse ──
    try {
      const pdfParse = require('pdf-parse');
      let renderedPage = 0;
      const pdfData = await pdfParse(buffer, {
        // Keep a durable page boundary.  It is what lets a quiz citation open
        // the exact PDF page that supplied the correct answer.
        pagerender: async (pageData: any) => {
          renderedPage += 1;
          const textContent = await pageData.getTextContent({ normalizeWhitespace: true });
          const text = textContent.items.map((item: any) => item.str || '').join(' ');
          return `\n\n[[PAGE ${renderedPage}]]\n${text}`;
        },
      });
      rawText = pdfData.text || '';
      pageCount = pdfData.numpages || 1;
    } catch (err) {
      console.warn('PDF parse fallback:', err);
      rawText = '';
    }

    // ── Step 2: If text is sparse (scanned / handwritten), fall back to Gemini Vision OCR ──
    if (isTextSparse(rawText, pageCount) && isVisionSupported(mimeType)) {
      console.log(`[DocumentProcessor] Sparse text detected (${rawText.split(/\s+/).length} words / ${pageCount} pages). Attempting Gemini Vision OCR...`);
      try {
        const visionText = await extractTextWithVision(buffer, mimeType, pageCount);
        if (visionText && visionText.trim().length > rawText.trim().length) {
          rawText = visionText;
          usedVisionOcr = true;
          console.log(`[DocumentProcessor] Vision OCR successful — extracted ${visionText.split(/\s+/).length} words`);
        }
      } catch (err) {
        console.warn('[DocumentProcessor] Vision OCR fallback failed:', err);
      }
    }
  } else if (isImage) {
    // ── Direct image upload (photo of handwritten notes) ──
    console.log(`[DocumentProcessor] Image file detected (${mimeType}). Using Gemini Vision OCR...`);
    try {
      const visionText = await extractTextWithVision(buffer, mimeType, 1);
      if (visionText && visionText.trim().length > 10) {
        rawText = visionText;
        usedVisionOcr = true;
        pageCount = 1;
        console.log(`[DocumentProcessor] Image OCR successful — extracted ${visionText.split(/\s+/).length} words`);
      } else {
        rawText = '[Image file — no text could be extracted]';
      }
    } catch (err) {
      console.warn('[DocumentProcessor] Image Vision OCR failed:', err);
      rawText = '[Image file — OCR extraction failed]';
    }
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || fileName.toLowerCase().endsWith('.pptx')) {
    const extracted = await extractOpenXmlText(buffer, 'pptx');
    rawText = extracted.text;
    pageCount = extracted.pageCount;
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.toLowerCase().endsWith('.docx')) {
    const extracted = await extractOpenXmlText(buffer, 'docx');
    rawText = extracted.text;
    pageCount = extracted.pageCount;
  } else if (fileName.toLowerCase().endsWith('.ppt')) {
    throw new Error('Legacy .ppt files are not supported. Save the presentation as .pptx and upload it again.');
  } else {
    // ── Plain text / markdown / docx fallback ──
    rawText = buffer.toString('utf-8');
    const words = rawText.split(/\s+/).length;
    pageCount = Math.max(1, Math.ceil(words / 400));
  }

  // Thorough clean of extracted text (skip aggressive cleaning for vision OCR output
  // since Gemini already returns clean structured text)
  rawText = usedVisionOcr ? rawText.trim() : cleanPdfText(rawText);

  // Create clean chunks
  const chunks = chunkDocumentText(rawText, pageCount);
  const topics = extractKeyTopics(rawText);

  const cleanTitle = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/^[0-9]+[._\s-]*/, '') // Remove leading numbers like "39. "
    .replace(/[_-]/g, ' ')
    .trim();

  const docMaterial: DocumentMaterial = {
    id: `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    courseId,
    title: cleanTitle.length > 3 ? cleanTitle : 'Course Syllabus Material',
    fileName,
    fileSize: buffer.length,
    mimeType,
    pageCount,
    rawText,
    chunks,
    topics,
    status: 'INDEXED',
    uploadedAt: new Date().toISOString(),
  };

  docMaterial.chunks = docMaterial.chunks.map((chunk) => ({ ...chunk, documentId: docMaterial.id }));

  return docMaterial;
}

export function chunkDocumentText(text: string, totalPages: number): DocumentChunk[] {
  const markedPages = Array.from(text.matchAll(/\[\[PAGE\s+(\d+)\]\]([\s\S]*?)(?=\[\[PAGE\s+\d+\]\]|$)/g))
    .map((match) => ({ pageNumber: Number(match[1]), text: match[2].trim() }))
    .filter((page) => page.text.length > 0);

  // PDFs are extracted page by page. Never combine text from separate pages,
  // otherwise a citation cannot honestly point to a single visible page.
  if (markedPages.length > 0) {
    return markedPages.flatMap((page, pageIndex) => {
      const pageParagraphs = page.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      const pageChunks: DocumentChunk[] = [];
      let current = '';
      let localIndex = 0;
      pageParagraphs.forEach((paragraph, index) => {
        const candidate = `${current}${current ? '\n\n' : ''}${paragraph}`;
        if (candidate.split(/\s+/).length > 350 && current) {
          pageChunks.push(createChunk(current, page.pageNumber, pageIndex * 100 + localIndex++));
          current = paragraph;
        } else {
          current = candidate;
        }
        if (index === pageParagraphs.length - 1 && current) {
          pageChunks.push(createChunk(current, page.pageNumber, pageIndex * 100 + localIndex));
        }
      });
      return pageChunks;
    });
  }

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 25);

  const chunks: DocumentChunk[] = [];
  const chunkSize = 350;

  let currentChunkText = '';
  let chunkIndex = 0;
  const paragraphsPerPage = Math.max(1, Math.ceil(paragraphs.length / Math.max(1, totalPages)));

  paragraphs.forEach((para, pIdx) => {
    currentChunkText += para + '\n\n';
    const wordCount = currentChunkText.split(/\s+/).length;

    if (wordCount >= chunkSize || pIdx === paragraphs.length - 1) {
      const pageNumber = Math.min(totalPages, Math.max(1, Math.floor(pIdx / paragraphsPerPage) + 1));

      // Extract section title from the first heading-like line
      const lines = currentChunkText.trim().split('\n');
      let sectionTitle = '';
      for (const line of lines) {
        const clean = line.replace(/^[#*_\-\d.\s]+/, '').trim();
        if (
          clean.length > 4 &&
          clean.length < 80 &&
          !clean.includes('...') &&
          !clean.includes('www.') &&
          !/^(page|slide|module|chapter|unit)\s*\d*$/i.test(clean)
        ) {
          sectionTitle = clean;
          break;
        }
      }
      if (!sectionTitle) sectionTitle = 'Core Curriculum Material';

      chunks.push(createChunk(currentChunkText.trim(), pageNumber, chunkIndex, sectionTitle));

      chunkIndex += 1;
      currentChunkText = '';
    }
  });

  if (chunks.length === 0 && text.trim().length > 0) {
    chunks.push(createChunk(text.trim(), 1, 0, 'Course Material'));
  }

  return chunks;
}

function createChunk(content: string, pageNumber: number, chunkIndex: number, sectionTitle?: string): DocumentChunk {
  const firstLine = content.split('\n').map((line) => line.trim()).find(Boolean) || '';
  return {
    id: `chunk_${Date.now()}_${chunkIndex}`,
    documentId: '',
    chunkIndex,
    pageNumber,
    sectionTitle: sectionTitle || (firstLine.length > 4 && firstLine.length < 80 ? firstLine : 'Core Curriculum Material'),
    content,
    tokenEstimate: Math.round(content.split(/\s+/).length * 1.3),
  };
}

export function extractKeyTopics(text: string): string[] {
  const lines = text.split('\n');
  const candidates: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (
      (trimmed.startsWith('Module') ||
        trimmed.startsWith('Chapter') ||
        trimmed.startsWith('Unit') ||
        trimmed.startsWith('Section') ||
        /^\d+\.\s+[A-Z]/.test(trimmed)) &&
      trimmed.length < 80
    ) {
      const clean = trimmed.replace(/^[#*_\s]+/, '').trim();
      if (clean.length > 5 && !clean.includes('...')) {
        candidates.push(clean);
      }
    }
  });

  if (candidates.length > 0) {
    return Array.from(new Set(candidates)).slice(0, 8);
  }

  // Fallback: extract capitalized heading phrases
  const headingMatches = text.match(/^[A-Z][A-Za-z\s&,\-]{5,50}$/gm);
  if (headingMatches && headingMatches.length > 0) {
    const valid = headingMatches
      .map((h) => h.trim())
      .filter((h) => h.length > 6 && !h.startsWith('PAGE') && !h.startsWith('SLIDE'));
    if (valid.length > 0) {
      return Array.from(new Set(valid)).slice(0, 6);
    }
  }

  return [
    'Core Concepts & Terminology',
    'Architectural Principles',
    'Protocols & Mechanisms',
    'Analysis & Implementations',
  ];
}
