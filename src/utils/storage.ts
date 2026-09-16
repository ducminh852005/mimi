import type {
  AcademicTask,
  AdaptPlanResponse,
  BatteryLevel,
  StudentProfile,
} from '../types/api';

export interface StudentSessionState {
  batteryLevel: BatteryLevel;
  availableMinutes: number;
  activeRecommendation: AdaptPlanResponse['recommendation'] | null;
  startedAt: number | null;
}

export interface StudyMirrorData {
  completedStepsCount: number;
  learnedPatterns: string[];
  courseMultipliers: Record<string, number>;
}

const KEYS = {
  SESSION: 'mimi_student_state',
  TASKS: 'mimi_extracted_tasks',
  PROFILE: 'mimi_student_profile',
  MIRROR: 'mimi_study_mirror',
} as const;

const getJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const setJson = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Local Storage Write Error [${key}]:`, err);
  }
};

export const localStore = {
  // Profile & Personal Preferences
  getProfile: (): StudentProfile =>
    getJson<StudentProfile>(KEYS.PROFILE, {
      studentName: 'Bạn',
      chronotype: 'BALANCED',
      preferredTone: 'WARM',
      defaultTimeBudget: 45,
      streakDays: 1,
    }),
  setProfile: (patch: Partial<StudentProfile>) => {
    const current = localStore.getProfile();
    setJson(KEYS.PROFILE, { ...current, ...patch });
  },

  // Session & Battery
  getSession: (): StudentSessionState =>
    getJson<StudentSessionState>(KEYS.SESSION, {
      batteryLevel: 'OKAY',
      availableMinutes: 45,
      activeRecommendation: null,
      startedAt: null,
    }),
  setSession: (patch: Partial<StudentSessionState>) => {
    const current = localStore.getSession();
    setJson(KEYS.SESSION, { ...current, ...patch });
  },

  // Academic Tasks
  getTasks: (): AcademicTask[] => getJson<AcademicTask[]>(KEYS.TASKS, []),
  setTasks: (tasks: AcademicTask[]) => setJson(KEYS.TASKS, tasks),
  markSubTaskCompleted: (taskId: string, subTaskId: string) => {
    const tasks = localStore.getTasks();
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        subTasks: t.subTasks.map((st) =>
          st.id === subTaskId ? { ...st, isCompleted: true } : st,
        ),
      };
    });
    setJson(KEYS.TASKS, updated);
  },

  // Study Mirror
  getMirror: (): StudyMirrorData =>
    getJson<StudyMirrorData>(KEYS.MIRROR, {
      completedStepsCount: 0,
      learnedPatterns: [],
      courseMultipliers: {},
    }),
  addReflectionInsight: (
    newPattern: string,
    courseCode?: string,
    multiplier?: number,
  ) => {
    const mirror = localStore.getMirror();
    const patterns = newPattern
      ? [newPattern, ...mirror.learnedPatterns].slice(0, 10)
      : mirror.learnedPatterns;
    const multipliers = { ...mirror.courseMultipliers };
    if (courseCode && multiplier) multipliers[courseCode] = multiplier;
    setJson(KEYS.MIRROR, {
      completedStepsCount: mirror.completedStepsCount + 1,
      learnedPatterns: patterns,
      courseMultipliers: multipliers,
    });
  },

  clearActiveSession: () => {
    localStore.setSession({ activeRecommendation: null, startedAt: null });
  },
};
