export type UserRole = 'TEACHER' | 'STUDENT' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  studentId?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: string;
  teacherId: string;
  description?: string;
  createdAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  pageNumber: number;
  sourceLabel?: string;
  sectionTitle?: string;
  content: string;
  tokenEstimate: number;
  /** Gemini embedding for semantic retrieval; stored with the owner-scoped chunk in MongoDB. */
  embedding?: number[];
  embeddingModel?: string;
  indexedAt?: string;
}

export interface DocumentMaterial {
  id: string;
  ownerId?: string;
  storagePath?: string;
  courseId: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  pageCount: number;
  rawText: string;
  chunks: DocumentChunk[];
  topics: string[];
  status: 'PROCESSING' | 'INDEXED' | 'ERROR';
  uploadedAt: string;
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'mcq';

export interface QuestionOption {
  id: string; // e.g. "opt_1", "opt_2", "opt_3", "opt_4"
  text: string;
}

export interface QuestionSourceCitation {
  documentId?: string;
  documentTitle: string;
  pageNumber: number;
  sectionTitle?: string;
  excerpt?: string;
}

export interface Question {
  id: string;
  assessmentId?: string;
  courseId: string;
  topic: string;
  difficulty: QuestionDifficulty;
  questionText: string;
  options: QuestionOption[];
  correctOptionId: string; // Server only! Never leaked during exam
  explanation: string;
  sourceCitation: QuestionSourceCitation;
  isValidated: boolean;
  validationNotes?: string;
  isCustomEdited?: boolean;
  createdAt: string;
}

export type RoomStatus = 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
export type LeaderboardPrivacy = 'PUBLIC' | 'ANONYMOUS' | 'DISABLED';

export interface AssessmentSettings {
  durationMinutes: number;
  totalQuestions: number;
  difficultyDistribution: 'easy' | 'medium' | 'hard' | 'mixed';
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  questionPoolSize?: number;
  positiveMarks: number;
  negativeMarks: number; // e.g., 0 or 0.25
  allowReviewAfterSubmit: boolean;
  showLeaderboard: LeaderboardPrivacy;
  requireFullscreen: boolean;
  maxFullscreenViolations: number; // default 2
}

export interface Assessment {
  id: string;
  courseId: string;
  teacherId: string;
  title: string;
  moduleName: string;
  description?: string;
  materialDocumentIds: string[];
  questionIds: string[];
  settings: AssessmentSettings;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  assessmentType?: 'FACULTY_EXAM' | 'PLAYGROUND';
  creatorRole?: 'FACULTY' | 'STUDENT';
  creatorStudentId?: string;
  creatorStudentName?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LiveRoom {
  id: string;
  code: string; // 6 characters, e.g. "CS301A", "IA26X7"
  assessmentId: string;
  teacherId: string;
  status: RoomStatus;
  assessmentType?: 'FACULTY_EXAM' | 'PLAYGROUND';
  creatorRole?: 'FACULTY' | 'STUDENT';
  creatorStudentId?: string;
  creatorStudentName?: string;
  startedAt?: string;
  endedAt?: string;
  expiresAt?: string;
  participantCount: number;
  createdAt: string;
}

export type AttemptStatus = 'IN_PROGRESS' | 'COMPLETED' | 'AUTO_SUBMITTED' | 'EXPIRED';

export type IntegrityEventType = 
  | 'FULLSCREEN_EXIT'
  | 'TAB_SWITCH'
  | 'WINDOW_HIDDEN'
  | 'WINDOW_BLUR'
  | 'DEVTOOLS_ATTEMPT'
  | 'PASTE_ATTEMPT';

export interface IntegrityEvent {
  id: string;
  attemptId: string;
  studentId: string;
  eventType: IntegrityEventType;
  timestamp: string;
  questionIndex?: number;
  timeRemainingSeconds?: number;
  metadata?: Record<string, any>;
}

export interface StudentAnswer {
  questionId: string;
  selectedOptionId?: string; // option ID picked by student
  isAnswered: boolean;
  isCorrect?: boolean; // Evaluated upon server scoring
  earnedMarks?: number;
  answeredAt?: string;
}

export interface ExamAttempt {
  id: string;
  roomId: string;
  assessmentId: string;
  studentId: string;
  studentName: string;
  studentRollNo: string;
  status: AttemptStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt?: string;
  completionDurationSeconds?: number;
  
  // Per-student randomized assignment
  assignedQuestionIds: string[];
  
  // Option order randomization map: questionId -> array of optionIds
  assignedOptionOrders: Record<string, string[]>;
  
  // Student submitted answers
  answers: Record<string, StudentAnswer>;
  
  // Score details (calculated on server)
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  correctCount: number;
  incorrectCount: number;
  score: number;
  percentageScore: number;
  
  // Integrity state
  fullscreenViolationCount: number;
  tabSwitchCount: number;
  integrityEvents: IntegrityEvent[];
  autoSubmitReason?: string;
  
  // Performance review & recommendations generated post-quiz
  performanceSummary?: {
    strongTopics: string[];
    weakTopics: string[];
    revisionAdvice: string[];
    pedagogicalFeedback: string;
  };
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  studentRollNo?: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  completionDurationSeconds: number;
  formattedDuration: string;
  submittedAt: string;
  isCurrentStudent?: boolean;
}

export interface TopicPerformanceStat {
  topic: string;
  totalQuestions: number;
  accuracyPercentage: number;
  totalAttempts: number;
  status: 'STRONG' | 'MODERATE' | 'NEEDS_REVISION';
}

export interface QuestionAccuracyStat {
  questionId: string;
  questionIndex: number;
  questionText: string;
  topic: string;
  difficulty: QuestionDifficulty;
  totalAnswered: number;
  correctCount: number;
  accuracyPercentage: number;
  sourceCitation: QuestionSourceCitation;
}

export interface AssessmentAnalytics {
  assessmentId: string;
  totalParticipants: number;
  submittedCount: number;
  averageScorePercentage: number;
  medianScorePercentage: number;
  highestScorePercentage: number;
  lowestScorePercentage: number;
  completionRatePercentage: number;
  averageDurationSeconds: number;
  scoreDistribution: {
    range: string; // "90-100%", "80-89%", etc.
    count: number;
  }[];
  topicStats: TopicPerformanceStat[];
  questionStats: QuestionAccuracyStat[];
  integritySummary: {
    totalFlaggedStudents: number;
    totalFullscreenExits: number;
    totalTabSwitches: number;
    autoSubmittedCount: number;
  };
  geminiPedagogicalInsights?: string;
}
