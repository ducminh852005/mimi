// Core domain enums

export type BatteryLevel = 'LOW' | 'OKAY' | 'GOOD' | 'FULL';
export type TaskUrgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ReflectionFeedback = 'EASY' | 'OKAY' | 'HARD';
export type ObstacleReason =
  | 'TOO_TIRED'
  | 'TOOK_LONGER_THAN_EXPECTED'
  | 'DIDNT_UNDERSTAND'
  | 'DISTRACTED'
  | 'UNEXPECTED_INTERRUPT'
  | 'NONE';

export type Chronotype = 'NIGHT_OWL' | 'EARLY_BIRD' | 'BALANCED';
export type CompanionTone = 'WARM' | 'DIRECT' | 'CHEERFUL';

// Student Adaptive Profile

export interface StudentProfile {
  studentName: string;
  chronotype: Chronotype;
  preferredTone: CompanionTone;
  defaultTimeBudget: number;
  streakDays: number;
}

// Academic tasks extracted from Brain Dump

export interface SubTask {
  id: string;
  stepIndex: number;
  description: string;
  estimatedMinutes: number;
  isCompleted: boolean;
}

export interface AcademicTask {
  id: string;
  courseCode: string;
  title: string;
  rawDeadline: string;
  urgency: TaskUrgency;
  estimatedTotalMinutes: number;
  subTasks: SubTask[];
}

// Generic API envelope — every /api/v1/* response is wrapped in this

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

// Endpoint 1 — POST /api/v1/dump/extract (multipart/form-data)

export interface ExtractResponse {
  tasks: AcademicTask[];
}

// Endpoint 2 — POST /api/v1/companion/adapt-plan

export interface AdaptPlanRequest {
  availableMinutes: number;
  batteryLevel: BatteryLevel;
  currentTime: string;
  studentProfile: Pick<StudentProfile, 'chronotype' | 'preferredTone'>;
  courseMultipliers: Record<string, number>;
  tasks: AcademicTask[];
}

export interface AdaptPlanResponse {
  workloadSummary: {
    totalIdentifiedMinutes: number;
    availableMinutes: number;
    isOverloaded: boolean;
  };
  recommendation: {
    taskId: string;
    subTaskId: string;
    courseCode: string;
    taskTitle: string;
    actionStep: string;
    allocatedMinutes: number;
    companionMessage: string;
  };
}

// Endpoint 3 — POST /api/v1/companion/reflect

export interface ReflectRequest {
  taskId: string;
  subTaskId: string;
  courseCode: string;
  plannedMinutes: number;
  actualMinutesSpent: number;
  feedback: ReflectionFeedback;
  obstacleReason: ObstacleReason;
}

export interface ReflectResponse {
  sessionId: string;
  studyMirror: {
    learnedPattern: string;
    behaviorMetric: {
      courseCode: string;
      varianceRatio: number;
    };
  };
}
