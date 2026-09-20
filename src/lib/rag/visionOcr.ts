/**
 * Gemini Vision OCR – extracts text from scanned PDFs and handwritten notes
 * by sending the raw file bytes directly to Gemini Flash as inline multimodal data.
 *
 * Supports: PDF (scanned/handwritten), PNG, JPEG, WEBP, HEIC, TIFF, BMP
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Map of common MIME types for images that Gemini accepts
const VISION_MIME_MAP: Record<string, string> = {
  'application/pdf': 'application/pdf',
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/webp': 'image/webp',
  'image/heic': 'image/heic',
  'image/heif': 'image/heif',
  'image/tiff': 'image/tiff',
  'image/bmp': 'image/bmp',
};

/** Returns true if the MIME type is a raw image (not PDF) */
export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/** Returns true if the MIME type can be sent to Gemini Vision for OCR */
export function isVisionSupported(mimeType: string): boolean {
  return mimeType in VISION_MIME_MAP || mimeType.startsWith('image/');
}

/**
 * Determines if extracted text appears too sparse to be a digitally-typed document.
 * Used as a heuristic to decide whether to fall back to Gemini Vision OCR.
 *
 * A scanned/handwritten PDF will yield very little or no text from pdf-parse
 * because there is no text layer — only rasterized images.
 */
export function isTextSparse(rawText: string, pageCount: number): boolean {
  const cleaned = rawText.replace(/\s+/g, ' ').trim();
  const wordCount = cleaned.split(' ').filter(w => w.length > 1).length;

  // Threshold: fewer than 15 meaningful words per page is almost certainly scanned
  const wordsPerPage = wordCount / Math.max(1, pageCount);
  return wordsPerPage < 15;
}

/**
 * Extract text from a scanned/handwritten document using Gemini Flash vision.
 *
 * Sends the raw bytes as inline data with a prompt that instructs the model
 * to faithfully transcribe ALL visible text, preserving structure and page breaks.
 */
export async function extractTextWithVision(
  buffer: Buffer,
  mimeType: string,
  pageCount: number
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey.length < 5) {
    console.warn('[VisionOCR] No Gemini API key — cannot perform vision OCR');
    return '';
  }

  const resolvedMime = VISION_MIME_MAP[mimeType] || mimeType;
  const base64Data = buffer.toString('base64');

  // Guard: Gemini has a ~20MB inline data limit. For very large files, chunk pages.
  // For now, we handle files up to ~20MB directly.
  const MAX_INLINE_BYTES = 20 * 1024 * 1024;
  if (buffer.length > MAX_INLINE_BYTES) {
    console.warn(`[VisionOCR] File too large for inline vision (${(buffer.length / (1024 * 1024)).toFixed(1)}MB). Skipping.`);
    return '';
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Try model names in order of preference (using active Gemini models)
  const modelNames = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest',
  ];

  const prompt = `You are an expert OCR system. Your task is to faithfully transcribe ALL visible text from this document.

INSTRUCTIONS:
1. Transcribe every word, number, symbol, equation, and diagram label you can see.
2. For handwritten content, do your best to read the handwriting accurately.
3. Preserve the logical structure: headings, bullet points, numbered lists, paragraphs.
4. For multi-page documents, insert [[PAGE X]] markers between pages (e.g. [[PAGE 1]], [[PAGE 2]], etc.).
5. For diagrams or figures, describe them briefly in [FIGURE: description] format.
6. For mathematical equations, use plain text notation (e.g. "x^2 + y^2 = r^2").
7. Do NOT add any commentary, summaries, or interpretations. Output ONLY the transcribed text.
8. If a word is unclear, provide your best guess and continue.

OUTPUT FORMAT:
Start each page with [[PAGE X]] on its own line, then the transcribed content for that page.`;

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.05 },
      });

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: resolvedMime,
            data: base64Data,
          },
        },
      ]);

      const extractedText = result.response.text();

      if (extractedText && extractedText.trim().length > 20) {
        console.log(`[VisionOCR] Successfully extracted ${extractedText.split(/\s+/).length} words using ${modelName}`);

        // If the model didn't add page markers and we know there are multiple pages,
        // add a [[PAGE 1]] marker at the start
        if (!extractedText.includes('[[PAGE') && pageCount >= 1) {
          return `[[PAGE 1]]\n${extractedText.trim()}`;
        }

        return extractedText.trim();
      }
    } catch (err: any) {
      console.warn(`[VisionOCR] Model ${modelName} failed:`, err?.message?.slice(0, 120));
      continue;
    }
  }

  console.warn('[VisionOCR] All Gemini models failed for vision OCR');
  return '';
}
