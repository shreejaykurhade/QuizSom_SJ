import fs from 'fs';
import path from 'path';
import { Collection, GridFSBucket, MongoClient } from 'mongodb';
import {
  User,
  Course,
  DocumentMaterial,
  Question,
  Assessment,
  LiveRoom,
  ExamAttempt,
  IntegrityEvent,
  LeaderboardEntry,
  AssessmentAnalytics,
  TopicPerformanceStat,
  QuestionAccuracyStat,
} from './types';

interface DatabaseSchema {
  users: User[];
  courses: Course[];
  documents: DocumentMaterial[];
  questions: Question[];
  assessments: Assessment[];
  rooms: LiveRoom[];
  attempts: ExamAttempt[];
  integrityEvents: IntegrityEvent[];
  lastInitialized: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'assessly_db.json');

class DatabaseStore {
  private data: DatabaseSchema;
  private isInitialized = false;
  private mongoCollection: Collection<DatabaseSchema> | null = null;
  private fileBucket: GridFSBucket | null = null;
  private mongoReady: Promise<void> = Promise.resolve();

  constructor() {
    this.data = this.getDefaultState();
    this.init();
  }

  async ready(): Promise<void> {
    await this.mongoReady;
  }

  async flush(): Promise<void> {
    await this.ready();
    if (process.env.MONGODB_URI) {
      if (!this.mongoCollection) throw new Error('MongoDB persistence is unavailable');
      await this.persistMongo();
    }
  }

  async refresh(): Promise<void> {
    await this.ready();
    if (!this.mongoCollection) return;
    const stored = await this.mongoCollection.findOne({ _id: 'primary' } as any);
    if (stored) {
      const { _id, ...workspace } = stored as DatabaseSchema & { _id?: unknown };
      this.data = workspace;
    }
  }

  private getDefaultState(): DatabaseSchema {
    return {
      users: [], courses: [], documents: [], questions: [], assessments: [], rooms: [], attempts: [],
      integrityEvents: [],
      lastInitialized: new Date().toISOString(),
    };
  }

  private init() {
    if (this.isInitialized) return;

    const mongoUri = process.env.MONGODB_URI?.trim();
    if (mongoUri) {
      this.mongoReady = this.initMongo(mongoUri);
      return;
    }

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      // Start empty only when there is no local workspace yet.  Once a faculty
      // member uploads material it must survive a Next.js restart; access is
      // still enforced by the material's Firebase UID in the API routes.
      if (fs.existsSync(DB_FILE)) {
        const saved = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as DatabaseSchema;
        if (Array.isArray(saved.documents) && Array.isArray(saved.assessments) && Array.isArray(saved.attempts)) {
          this.data = saved;
          this.isInitialized = true;
          return;
        }
      }

      this.data = this.getDefaultState();
      this.save();
      this.isInitialized = true;
    } catch (err) {
      console.warn('Database initialization fallback to in-memory store:', err);
      this.data = this.getDefaultState();
      this.isInitialized = true;
    }
  }

  private async initMongo(uri: string): Promise<void> {
    try {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
      await client.connect();
      const mongoDb = client.db(process.env.MONGODB_DB || 'quizsom');
      this.mongoCollection = mongoDb.collection<DatabaseSchema>('workspace');
      this.fileBucket = new GridFSBucket(mongoDb, { bucketName: 'materialFiles' });
      const stored = await this.mongoCollection.findOne({ _id: 'primary' } as any);
      if (stored) {
        const { _id, ...workspace } = stored as DatabaseSchema & { _id?: unknown };
        this.data = workspace;
      } else if (fs.existsSync(DB_FILE)) {
        this.data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as DatabaseSchema;
        await this.persistMongo();
      } else {
        this.data = this.getDefaultState();
        await this.persistMongo();
      }
      this.isInitialized = true;
      console.log('[QuizSom] MongoDB persistence connected.');
    } catch (err: any) {
      console.warn('[QuizSom] MongoDB connection warning, falling back to local file storage:', err.message);
      this.mongoCollection = null;
      this.fileBucket = null;
      if (fs.existsSync(DB_FILE)) {
        this.data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as DatabaseSchema;
      } else {
        this.data = this.getDefaultState();
      }
      this.isInitialized = true;
    }
  }

  async saveDocumentFile(documentId: string, fileName: string, mimeType: string, buffer: Buffer): Promise<string> {
    await this.ready();
    if (this.fileBucket) {
      const previous = await this.fileBucket.find({ 'metadata.documentId': documentId }).toArray();
      await Promise.all(previous.map((file) => this.fileBucket!.delete(file._id)));
      await new Promise<void>((resolve, reject) => {
        const stream = this.fileBucket!.openUploadStream(fileName, {
          metadata: { documentId, mimeType },
        });
        stream.once('finish', () => resolve());
        stream.once('error', reject);
        stream.end(buffer);
      });
      return `gridfs:${documentId}`;
    }

    const uploadDirectory = path.join(DATA_DIR, 'uploads');
    fs.mkdirSync(uploadDirectory, { recursive: true });
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = path.join(uploadDirectory, `${documentId}-${safeName}`);
    fs.writeFileSync(storagePath, buffer);
    return storagePath;
  }

  async getDocumentFile(document: DocumentMaterial): Promise<Buffer | null> {
    await this.ready();
    if (document.storagePath?.startsWith('gridfs:') && this.fileBucket) {
      const stored = await this.fileBucket.find({ 'metadata.documentId': document.id }).sort({ uploadDate: -1 }).next();
      if (!stored) return null;
      return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        const stream = this.fileBucket!.openDownloadStream(stored._id);
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.once('end', () => resolve(Buffer.concat(chunks)));
        stream.once('error', reject);
      });
    }
    if (document.storagePath && fs.existsSync(document.storagePath)) return fs.readFileSync(document.storagePath);
    return null;
  }

  private async persistMongo() {
    if (!this.mongoCollection) return;

    // Embeddings are derived cache data and can make the single workspace
    // document exceed MongoDB's 16 MB BSON limit after only a few uploads.
    // Keep them available in the warm process for retrieval, but persist a
    // compact snapshot. Missing vectors are rebuilt by the RAG indexer when
    // the document is used again.
    const documents = this.data.documents.map((document) => ({
      ...document,
      chunks: document.chunks.map((chunk) => {
        const { embedding: _embedding, embeddingModel: _embeddingModel, indexedAt: _indexedAt, ...persistedChunk } = chunk;
        return persistedChunk;
      }),
    }));

    await this.mongoCollection.replaceOne(
      { _id: 'primary' } as any,
      { ...this.data, documents, _id: 'primary' } as any,
      { upsert: true }
    );
  }

  private save() {
    if (process.env.MONGODB_URI) {
      void this.persistMongo().catch((err) => console.error('MongoDB persistence error:', err));
      return;
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting database:', err);
    }
  }

  // --- Users ---
  getUsers(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  // --- Courses ---
  getCourses(): Course[] {
    return this.data.courses;
  }

  getCourseById(id: string): Course | undefined {
    return this.data.courses.find((c) => c.id === id);
  }

  createCourse(course: Omit<Course, 'id' | 'createdAt'>): Course {
    const newCourse: Course = {
      ...course,
      id: `course_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.courses.push(newCourse);
    this.save();
    return newCourse;
  }

  // --- Documents / Materials ---
  getDocuments(courseId?: string): DocumentMaterial[] {
    if (courseId) {
      return this.data.documents.filter((d) => d.courseId === courseId);
    }
    return this.data.documents;
  }

  getDocumentById(id: string): DocumentMaterial | undefined {
    return this.data.documents.find((d) => d.id === id);
  }

  saveDocument(doc: DocumentMaterial): DocumentMaterial {
    const existingIndex = this.data.documents.findIndex((d) => d.id === doc.id);
    if (existingIndex >= 0) {
      this.data.documents[existingIndex] = doc;
    } else {
      this.data.documents.push(doc);
    }
    this.save();
    return doc;
  }

  // --- Questions & Question Bank ---
  getQuestions(filters?: {
    courseId?: string;
    assessmentId?: string;
    topic?: string;
    difficulty?: string;
    search?: string;
  }): Question[] {
    return this.data.questions.filter((q) => {
      if (filters?.courseId && q.courseId !== filters.courseId) return false;
      if (filters?.assessmentId && q.assessmentId !== filters.assessmentId) return false;
      if (filters?.topic && q.topic.toLowerCase() !== filters.topic.toLowerCase()) return false;
      if (filters?.difficulty && q.difficulty !== filters.difficulty) return false;
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        const matchesText = q.questionText.toLowerCase().includes(query);
        const matchesTopic = q.topic.toLowerCase().includes(query);
        if (!matchesText && !matchesTopic) return false;
      }
      return true;
    });
  }

  getQuestionById(id: string): Question | undefined {
    return this.data.questions.find((q) => q.id === id);
  }

  saveQuestion(question: Question): Question {
    const existingIndex = this.data.questions.findIndex((q) => q.id === question.id);
    if (existingIndex >= 0) {
      this.data.questions[existingIndex] = question;
    } else {
      this.data.questions.push(question);
    }
    this.save();
    return question;
  }

  saveQuestionsBatch(questions: Question[]): void {
    questions.forEach((q) => {
      const idx = this.data.questions.findIndex((item) => item.id === q.id);
      if (idx >= 0) {
        this.data.questions[idx] = q;
      } else {
        this.data.questions.push(q);
      }
    });
    this.save();
  }

  deleteQuestion(id: string): boolean {
    const initialLen = this.data.questions.length;
    this.data.questions = this.data.questions.filter((q) => q.id !== id);
    if (this.data.questions.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Assessments ---
  getAssessments(courseId?: string): Assessment[] {
    if (courseId) {
      return this.data.assessments.filter((a) => a.courseId === courseId);
    }
    return this.data.assessments;
  }

  getAssessmentById(id: string): Assessment | undefined {
    return this.data.assessments.find((a) => a.id === id);
  }

  saveAssessment(assessment: Assessment): Assessment {
    const existingIndex = this.data.assessments.findIndex((a) => a.id === assessment.id);
    if (existingIndex >= 0) {
      this.data.assessments[existingIndex] = assessment;
    } else {
      this.data.assessments.push(assessment);
    }
    this.save();
    return assessment;
  }

  // --- Rooms ---
  getRoomByCode(code: string): LiveRoom | undefined {
    return this.data.rooms.find((r) => r.code.toUpperCase() === code.trim().toUpperCase());
  }

  getRoomById(id: string): LiveRoom | undefined {
    return this.data.rooms.find((r) => r.id === id);
  }

  getRoomsByAssessmentId(assessmentId: string): LiveRoom[] {
    return this.data.rooms.filter((r) => r.assessmentId === assessmentId);
  }

  saveRoom(room: LiveRoom): LiveRoom {
    const existingIndex = this.data.rooms.findIndex((r) => r.id === room.id || r.code === room.code);
    if (existingIndex >= 0) {
      this.data.rooms[existingIndex] = room;
    } else {
      this.data.rooms.push(room);
    }
    this.save();
    return room;
  }

  deleteRoom(roomId: string): boolean {
    const before = this.data.rooms.length;
    this.data.rooms = this.data.rooms.filter((room) => room.id !== roomId);
    if (this.data.rooms.length === before) return false;
    this.save();
    return true;
  }

  createRoomForAssessment(
    assessmentId: string,
    teacherId: string,
    customCode?: string,
    playgroundMeta?: {
      assessmentType?: 'FACULTY_EXAM' | 'PLAYGROUND';
      creatorRole?: 'FACULTY' | 'STUDENT';
      creatorStudentId?: string;
      creatorStudentName?: string;
    }
  ): LiveRoom {
    // Generate clean 6-character room code (avoiding ambiguous 0, O, 1, I, 5, S)
    const charset = '2346789ABCDEFGHJKLMNPQRTUVWXYZ';
    let code = customCode || '';
    if (!code) {
      for (let i = 0; i < 6; i++) {
        code += charset.charAt(Math.floor(Math.random() * charset.length));
      }
    }

    const newRoom: LiveRoom = {
      id: `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      code: code.toUpperCase(),
      assessmentId,
      teacherId,
      status: 'ACTIVE',
      participantCount: 0,
      assessmentType: playgroundMeta?.assessmentType || 'FACULTY_EXAM',
      creatorRole: playgroundMeta?.creatorRole || 'FACULTY',
      creatorStudentId: playgroundMeta?.creatorStudentId,
      creatorStudentName: playgroundMeta?.creatorStudentName,
      createdAt: new Date().toISOString(),
    };

    this.data.rooms.push(newRoom);
    this.save();
    return newRoom;
  }

  // --- Playground Methods ---
  getPlaygroundRooms(studentId: string): {
    room: LiveRoom;
    assessment?: Assessment;
    isCreator: boolean;
    myAttempt?: ExamAttempt;
    totalAttempts: number;
  }[] {
    const studentAttempts = this.data.attempts.filter((a) => a.studentId === studentId);
    const attemptedRoomIds = new Set(studentAttempts.map((a) => a.roomId));

    const playgroundRooms = this.data.rooms.filter(
      (r) =>
        r.assessmentType === 'PLAYGROUND' &&
        (r.creatorStudentId === studentId || attemptedRoomIds.has(r.id) || r.teacherId === studentId)
    );

    return playgroundRooms.map((room) => {
      const assessment = this.getAssessmentById(room.assessmentId);
      const attempts = this.getAttemptsByRoom(room.id);
      const myAttempt = studentAttempts.find((a) => a.roomId === room.id);
      return {
        room,
        assessment,
        isCreator: room.creatorStudentId === studentId || room.teacherId === studentId,
        myAttempt,
        totalAttempts: attempts.length,
      };
    });
  }

  getPlaygroundLeaderboard(roomCode: string): {
    room?: LiveRoom;
    assessment?: Assessment;
    leaderboard: {
      rank: number;
      studentId: string;
      studentName: string;
      studentRollNo: string;
      score: number;
      percentageScore: number;
      correctCount: number;
      incorrectCount: number;
      unansweredCount: number;
      totalQuestions: number;
      completionDurationSeconds: number;
      status: string;
      submittedAt: string;
    }[];
  } {
    const room = this.getRoomByCode(roomCode);
    if (!room) return { leaderboard: [] };

    const assessment = this.getAssessmentById(room.assessmentId);
    const attempts = this.getAttemptsByRoom(room.id);

    // Sort by score descending, then completion duration ascending
    const sortedAttempts = [...attempts].sort((a, b) => {
      if ((b.score ?? 0) !== (a.score ?? 0)) {
        return (b.score ?? 0) - (a.score ?? 0);
      }
      return (a.completionDurationSeconds ?? 99999) - (b.completionDurationSeconds ?? 99999);
    });

    const leaderboard = sortedAttempts.map((att, idx) => ({
      rank: idx + 1,
      studentId: att.studentId,
      studentName: att.studentName || 'Student Peer',
      studentRollNo: att.studentRollNo || '',
      score: att.score ?? 0,
      percentageScore: att.percentageScore ?? 0,
      correctCount: att.correctCount ?? 0,
      incorrectCount: att.incorrectCount ?? 0,
      unansweredCount: att.unansweredCount ?? 0,
      totalQuestions: att.totalQuestions || assessment?.questionIds.length || 0,
      completionDurationSeconds: att.completionDurationSeconds ?? 0,
      status: att.status,
      submittedAt: att.submittedAt || att.startedAt,
    }));

    return {
      room,
      assessment,
      leaderboard,
    };
  }

  // --- Attempts & Integrity ---
  getAttemptById(attemptId: string): ExamAttempt | undefined {
    return this.data.attempts.find((a) => a.id === attemptId);
  }

  getAttemptsByRoom(roomId: string): ExamAttempt[] {
    return this.data.attempts.filter((a) => a.roomId === roomId);
  }

  getAttemptsByStudent(studentId: string): ExamAttempt[] {
    return this.data.attempts.filter((attempt) => attempt.studentId === studentId);
  }

  getAttemptsByAssessment(assessmentId: string): ExamAttempt[] {
    return this.data.attempts.filter((a) => a.assessmentId === assessmentId);
  }

  getAttemptByStudentAndRoom(studentId: string, roomId: string): ExamAttempt | undefined {
    return this.data.attempts.find(
      (a) => a.studentId === studentId && a.roomId === roomId
    );
  }

  saveAttempt(attempt: ExamAttempt): ExamAttempt {
    const existingIndex = this.data.attempts.findIndex((a) => a.id === attempt.id);
    if (existingIndex >= 0) {
      this.data.attempts[existingIndex] = attempt;
    } else {
      this.data.attempts.push(attempt);
    }
    this.save();
    return attempt;
  }

  recordIntegrityEvent(
    attemptId: string,
    eventType: IntegrityEvent['eventType'],
    metadata?: Record<string, any>
  ): { attempt: ExamAttempt; shouldAutoSubmit: boolean; violationCount: number } {
    const attempt = this.getAttemptById(attemptId);
    if (!attempt) {
      throw new Error(`Attempt not found: ${attemptId}`);
    }

    const event: IntegrityEvent = {
      id: `ev_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      attemptId,
      studentId: attempt.studentId,
      eventType,
      timestamp: new Date().toISOString(),
      questionIndex: metadata?.questionIndex,
      timeRemainingSeconds: metadata?.timeRemainingSeconds,
      metadata,
    };

    attempt.integrityEvents = attempt.integrityEvents || [];
    attempt.integrityEvents.push(event);

    if (eventType === 'FULLSCREEN_EXIT') {
      attempt.fullscreenViolationCount = (attempt.fullscreenViolationCount || 0) + 1;
    } else if (
      eventType === 'TAB_SWITCH' ||
      eventType === 'WINDOW_HIDDEN' ||
      eventType === 'WINDOW_BLUR'
    ) {
      attempt.tabSwitchCount = (attempt.tabSwitchCount || 0) + 1;
    }

    const totalViolations =
      (attempt.fullscreenViolationCount || 0) + (attempt.tabSwitchCount || 0);

    // 2 strikes trigger instant authoritative auto-submission
    const shouldAutoSubmit = totalViolations >= 2;
    if (shouldAutoSubmit && (attempt.status === 'IN_PROGRESS' || !attempt.status)) {
      attempt.status = 'AUTO_SUBMITTED';
      attempt.autoSubmitReason =
        (attempt.tabSwitchCount || 0) >= 1
          ? 'TAB_SWITCH_LIMIT_EXCEEDED'
          : 'FULLSCREEN_VIOLATION_LIMIT_EXCEEDED';
      attempt.submittedAt = new Date().toISOString();
      if (attempt.startedAt) {
        attempt.completionDurationSeconds = Math.max(
          1,
          Math.floor(
            (new Date(attempt.submittedAt).getTime() -
              new Date(attempt.startedAt).getTime()) /
              1000
          )
        );
      }
      this.saveAttempt(attempt);

      // Score the attempt immediately so scores are saved
      return {
        attempt: this.scoreAttempt(attempt.id),
        shouldAutoSubmit: true,
        violationCount: totalViolations,
      };
    }

    this.saveAttempt(attempt);
    return {
      attempt,
      shouldAutoSubmit,
      violationCount: totalViolations,
    };
  }

  // --- Authoritative Server Scoring ---
  scoreAttempt(attemptId: string): ExamAttempt {
    const attempt = this.getAttemptById(attemptId);
    if (!attempt) throw new Error('Attempt not found');

    const assessment = this.getAssessmentById(attempt.assessmentId);
    const positiveMarks = assessment?.settings.positiveMarks ?? 1.0;
    const negativeMarks = assessment?.settings.negativeMarks ?? 0.25;

    let correctCount = 0;
    let incorrectCount = 0;
    let answeredCount = 0;
    let totalScore = 0;

    const questions = this.getQuestions({ assessmentId: attempt.assessmentId });
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    const topicPerformance: Record<string, { correct: number; total: number }> = {};

    attempt.assignedQuestionIds.forEach((qId) => {
      const q = questionMap.get(qId);
      if (!q) return;

      const studentAns = attempt.answers[qId];
      if (!topicPerformance[q.topic]) {
        topicPerformance[q.topic] = { correct: 0, total: 0 };
      }
      topicPerformance[q.topic].total += 1;

      if (studentAns && studentAns.selectedOptionId) {
        answeredCount += 1;
        const isCorrect = studentAns.selectedOptionId === q.correctOptionId;
        studentAns.isAnswered = true;
        studentAns.isCorrect = isCorrect;

        if (isCorrect) {
          correctCount += 1;
          studentAns.earnedMarks = positiveMarks;
          totalScore += positiveMarks;
          topicPerformance[q.topic].correct += 1;
        } else {
          incorrectCount += 1;
          studentAns.earnedMarks = -negativeMarks;
          totalScore -= negativeMarks;
        }
      } else {
        if (studentAns) {
          studentAns.isAnswered = false;
          studentAns.isCorrect = false;
          studentAns.earnedMarks = 0;
        }
      }
    });

    const totalQuestions = attempt.assignedQuestionIds.length || 1;
    const maxScore = totalQuestions * positiveMarks;
    const boundedScore = Math.max(0, totalScore);
    const percentage = Math.round((boundedScore / maxScore) * 100);

    attempt.totalQuestions = totalQuestions;
    attempt.answeredCount = answeredCount;
    attempt.unansweredCount = totalQuestions - answeredCount;
    attempt.correctCount = correctCount;
    attempt.incorrectCount = incorrectCount;
    attempt.score = parseFloat(boundedScore.toFixed(2));
    attempt.percentageScore = percentage;

    // Build topic analysis
    const strongTopics: string[] = [];
    const weakTopics: string[] = [];
    Object.entries(topicPerformance).forEach(([topic, stat]) => {
      const pct = (stat.correct / stat.total) * 100;
      if (pct >= 70) {
        strongTopics.push(topic);
      } else {
        weakTopics.push(topic);
      }
    });

    attempt.performanceSummary = {
      strongTopics,
      weakTopics,
      revisionAdvice: weakTopics.map(
        (t) => `Review textbook sections and module notes concerning ${t}.`
      ),
      pedagogicalFeedback:
        percentage >= 80
          ? 'Exceptional mastery across primary learning outcomes.'
          : percentage >= 60
          ? 'Satisfactory conceptual grasp. Focused revision recommended on identified weak topics.'
          : 'Further review of core foundational material and functional dependency rules required.',
    };

    if (!attempt.submittedAt) {
      attempt.submittedAt = new Date().toISOString();
    }
    if (attempt.startedAt && !attempt.completionDurationSeconds) {
      attempt.completionDurationSeconds = Math.max(
        1,
        Math.floor((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000)
      );
    }

    if (attempt.status === 'IN_PROGRESS') {
      attempt.status = 'COMPLETED';
    }

    this.saveAttempt(attempt);
    return attempt;
  }

  // --- Leaderboard Calculation (Deterministic Tie-Breaker) ---
  getLeaderboard(roomId: string, currentStudentId?: string): LeaderboardEntry[] {
    const attempts = this.getAttemptsByRoom(roomId).filter(
      (a) => a.status === 'COMPLETED' || a.status === 'AUTO_SUBMITTED'
    );

    // Primary: Score DESC
    // Secondary: Completion Duration ASC
    // Tertiary: Earliest Submitted At ASC
    const sorted = [...attempts].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const durA = a.completionDurationSeconds ?? 999999;
      const durB = b.completionDurationSeconds ?? 999999;
      if (durA !== durB) {
        return durA - durB;
      }
      const timeA = new Date(a.submittedAt || 0).getTime();
      const timeB = new Date(b.submittedAt || 0).getTime();
      return timeA - timeB;
    });

    const maxScore = (sorted[0]?.totalQuestions || 15) * 1.0;

    return sorted.map((attempt, index) => {
      const dur = attempt.completionDurationSeconds || 0;
      const mins = Math.floor(dur / 60);
      const secs = dur % 60;
      const formattedDuration = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      return {
        rank: index + 1,
        studentId: attempt.studentId,
        studentName: attempt.studentName,
        studentRollNo: attempt.studentRollNo,
        score: attempt.score,
        maxScore,
        percentage: attempt.percentageScore,
        correctCount: attempt.correctCount,
        completionDurationSeconds: dur,
        formattedDuration,
        submittedAt: attempt.submittedAt || '',
        isCurrentStudent: Boolean(currentStudentId && attempt.studentId === currentStudentId),
      };
    });
  }

  // --- Teacher Analytics Calculation ---
  getAssessmentAnalytics(assessmentId: string): AssessmentAnalytics {
    const attempts = this.getAttemptsByAssessment(assessmentId).filter(
      (a) => a.status === 'COMPLETED' || a.status === 'AUTO_SUBMITTED'
    );
    const questions = this.getQuestions({ assessmentId });

    if (attempts.length === 0) {
      return {
        assessmentId,
        totalParticipants: 0,
        submittedCount: 0,
        averageScorePercentage: 0,
        medianScorePercentage: 0,
        highestScorePercentage: 0,
        lowestScorePercentage: 0,
        completionRatePercentage: 0,
        averageDurationSeconds: 0,
        scoreDistribution: [
          { range: '90–100%', count: 0 },
          { range: '80–89%', count: 0 },
          { range: '70–79%', count: 0 },
          { range: '60–69%', count: 0 },
          { range: '< 60%', count: 0 },
        ],
        topicStats: [],
        questionStats: [],
        integritySummary: {
          totalFlaggedStudents: 0,
          totalFullscreenExits: 0,
          totalTabSwitches: 0,
          autoSubmittedCount: 0,
        },
        geminiPedagogicalInsights:
          'No student examination telemetry recorded yet for this assessment. Pedagogical analysis and concept friction identification will automatically generate once students complete their proctored attempts.',
      };
    }

    const scores = attempts.map((a) => a.percentageScore).sort((a, b) => a - b);
    const sumScore = scores.reduce((acc, s) => acc + s, 0);
    const averageScorePercentage = Math.round(sumScore / scores.length);
    const medianScorePercentage = scores[Math.floor(scores.length / 2)];
    const highestScorePercentage = scores[scores.length - 1];
    const lowestScorePercentage = scores[0];

    const sumDuration = attempts.reduce((acc, a) => acc + (a.completionDurationSeconds || 0), 0);
    const averageDurationSeconds = Math.round(sumDuration / attempts.length);

    // Score Distribution Bins
    const bins = [
      { range: '90–100%', min: 90, max: 100, count: 0 },
      { range: '80–89%', min: 80, max: 89, count: 0 },
      { range: '70–79%', min: 70, max: 79, count: 0 },
      { range: '60–69%', min: 60, max: 69, count: 0 },
      { range: '< 60%', min: 0, max: 59, count: 0 },
    ];
    scores.forEach((s) => {
      const bin = bins.find((b) => s >= b.min && s <= b.max) || bins[bins.length - 1];
      bin.count += 1;
    });

    // Question Accuracy Stats
    const questionStats: QuestionAccuracyStat[] = questions.map((q, idx) => {
      let correctAns = 0;
      let totalAns = 0;
      attempts.forEach((att) => {
        const a = att.answers[q.id];
        if (a && a.isAnswered) {
          totalAns += 1;
          if (a.selectedOptionId === q.correctOptionId) {
            correctAns += 1;
          }
        }
      });
      const pct = totalAns > 0 ? Math.round((correctAns / totalAns) * 100) : 0;
      return {
        questionId: q.id,
        questionIndex: idx + 1,
        questionText: q.questionText,
        topic: q.topic,
        difficulty: q.difficulty,
        totalAnswered: totalAns,
        correctCount: correctAns,
        accuracyPercentage: pct,
        sourceCitation: q.sourceCitation,
      };
    });

    // Topic Performance Stats
    const topicMap: Record<string, { correct: number; total: number; qCount: Set<string> }> = {};
    questionStats.forEach((qs) => {
      if (!topicMap[qs.topic]) {
        topicMap[qs.topic] = { correct: 0, total: 0, qCount: new Set() };
      }
      topicMap[qs.topic].correct += qs.correctCount;
      topicMap[qs.topic].total += qs.totalAnswered;
      topicMap[qs.topic].qCount.add(qs.questionId);
    });

    const topicStats: TopicPerformanceStat[] = Object.entries(topicMap).map(([topic, data]) => {
      const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
      return {
        topic,
        totalQuestions: data.qCount.size,
        accuracyPercentage: pct,
        totalAttempts: data.total,
        status: pct >= 75 ? 'STRONG' : pct >= 60 ? 'MODERATE' : 'NEEDS_REVISION',
      };
    });

    // Integrity Summary
    let totalFullscreenExits = 0;
    let totalTabSwitches = 0;
    let flaggedStudents = 0;
    let autoSubmittedCount = 0;

    attempts.forEach((a) => {
      const fs = a.fullscreenViolationCount || 0;
      const tabs = a.tabSwitchCount || 0;
      totalFullscreenExits += fs;
      totalTabSwitches += tabs;
      if (fs > 0 || tabs > 0) flaggedStudents += 1;
      if (a.status === 'AUTO_SUBMITTED') autoSubmittedCount += 1;
    });

    // Dynamic Gemini Pedagogical Summary based on real topic metrics
    const strongTopics = topicStats.filter((t) => t.accuracyPercentage >= 70).map((t) => t.topic);
    const weakTopics = topicStats.filter((t) => t.accuracyPercentage < 60).map((t) => t.topic);

    let pedagogicalInsight = '';
    if (strongTopics.length > 0 && weakTopics.length > 0) {
      pedagogicalInsight = `Students demonstrated strong comprehension across ${strongTopics.slice(0, 3).join(', ')}. The highest cognitive friction occurred in ${weakTopics.slice(0, 3).join(', ')} (class average ${averageScorePercentage}%). Focused concept reinforcement on ${weakTopics[0]} is recommended for remedial lecture clarification.`;
    } else if (weakTopics.length > 0) {
      pedagogicalInsight = `Cohort examination submissions indicate significant cognitive friction across ${weakTopics.slice(0, 3).join(', ')} (class average ${averageScorePercentage}%). Foundational review and worked problem demonstrations are recommended before subsequent evaluations.`;
    } else if (strongTopics.length > 0) {
      pedagogicalInsight = `Exceptional cohort mastery observed across evaluated topics (${strongTopics.slice(0, 3).join(', ')}) with a strong class average of ${averageScorePercentage}%. Core syllabus learning outcomes are well consolidated.`;
    } else {
      const topicNames = topicStats.map((t) => t.topic).filter(Boolean);
      pedagogicalInsight = `Cohort demonstrated steady conceptual progress across ${topicNames.slice(0, 3).join(', ') || 'evaluated curriculum topics'} with a class average of ${averageScorePercentage}%. Continued application practice is recommended.`;
    }

    return {
      assessmentId,
      totalParticipants: attempts.length,
      submittedCount: attempts.length,
      averageScorePercentage,
      medianScorePercentage,
      highestScorePercentage,
      lowestScorePercentage,
      completionRatePercentage: 100,
      averageDurationSeconds,
      scoreDistribution: bins.map(({ range, count }) => ({ range, count })),
      topicStats,
      questionStats,
      integritySummary: {
        totalFlaggedStudents: flaggedStudents,
        totalFullscreenExits,
        totalTabSwitches,
        autoSubmittedCount,
      },
      geminiPedagogicalInsights: pedagogicalInsight,
    };
  }

  // Reset or re-seed for testing
  resetToSeed(): void {
    this.data = this.getDefaultState();
    this.save();
  }
}

// Global Singleton for development and serverless hot-reloads
const globalForDb = global as unknown as { assesslyDbInstance?: DatabaseStore };
if (globalForDb.assesslyDbInstance) {
  Object.setPrototypeOf(globalForDb.assesslyDbInstance, DatabaseStore.prototype);
}
export const db = globalForDb.assesslyDbInstance || new DatabaseStore();
if (process.env.NODE_ENV !== 'production') globalForDb.assesslyDbInstance = db;
