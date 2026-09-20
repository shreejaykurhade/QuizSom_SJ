/**
 * Seed cases for grounded-retrieval evaluation. Faculty can extend this list
 * with approved questions and expected source pages before a release.
 */
export type GroundedEvaluationCase = {
  question: string;
  expectedDocumentTitle: string;
  expectedPage: number;
  requiredTerms: string[];
};

export const groundedEvaluationCases: GroundedEvaluationCase[] = [
  { question: 'What is a local maximum in hill climbing?', expectedDocumentTitle: 'AI Notes', expectedPage: 164, requiredTerms: ['local', 'maximum'] },
  { question: 'What does the RIP periodic timer control?', expectedDocumentTitle: 'Routing Protocols', expectedPage: 1, requiredTerms: ['periodic', 'advertising'] },
];

export function passesGroundedCase(answer: string[], citation: { documentTitle: string; pageNumber: number; excerpt: string } | undefined, test: GroundedEvaluationCase) {
  if (!citation || citation.documentTitle !== test.expectedDocumentTitle || citation.pageNumber !== test.expectedPage) return false;
  const evidence = `${answer.join(' ')} ${citation.excerpt}`.toLowerCase();
  return test.requiredTerms.every(term => evidence.includes(term.toLowerCase()));
}
