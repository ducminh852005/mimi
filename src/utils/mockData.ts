import type { AcademicTask, AdaptPlanResponse, ReflectResponse } from '../types/api';

// Pre-warmed fallback data — see docs/ARCHITECTURE.md §8 (Demo Resilience Plan).
// Loaded by src/api/client.ts whenever a real /api/v1/* call times out or errors,
// so a live demo never shows a spinner or a dead screen.

export const mockTasks: AcademicTask[] = [
  {
    id: 'task_101',
    courseCode: 'M101',
    title: 'Reflective Journal #2',
    rawDeadline: 'Tomorrow 23:59',
    urgency: 'HIGH',
    estimatedTotalMinutes: 60,
    subTasks: [
      {
        id: 'sub_1',
        stepIndex: 1,
        description: 'Answer reflection questions 1 to 3',
        estimatedMinutes: 20,
        isCompleted: false,
      },
      {
        id: 'sub_2',
        stepIndex: 2,
        description: 'Answer reflection questions 4 to 6',
        estimatedMinutes: 20,
        isCompleted: false,
      },
      {
        id: 'sub_3',
        stepIndex: 3,
        description: 'Proofread and submit',
        estimatedMinutes: 20,
        isCompleted: false,
      },
    ],
  },
  {
    id: 'task_102',
    courseCode: 'S204',
    title: 'Lab Report — Titration Experiment',
    rawDeadline: 'Friday 17:00',
    urgency: 'MEDIUM',
    estimatedTotalMinutes: 45,
    subTasks: [
      {
        id: 'sub_4',
        stepIndex: 1,
        description: 'Fill in the results table',
        estimatedMinutes: 15,
        isCompleted: false,
      },
      {
        id: 'sub_5',
        stepIndex: 2,
        description: 'Write the discussion paragraph',
        estimatedMinutes: 15,
        isCompleted: false,
      },
      {
        id: 'sub_6',
        stepIndex: 3,
        description: 'Write the conclusion',
        estimatedMinutes: 15,
        isCompleted: false,
      },
    ],
  },
];

export const mockAdaptPlanResponse: AdaptPlanResponse = {
  workloadSummary: {
    totalIdentifiedMinutes: 105,
    availableMinutes: 45,
    isOverloaded: true,
  },
  recommendation: {
    taskId: 'task_101',
    subTaskId: 'sub_1',
    courseCode: 'M101',
    taskTitle: 'Reflective Journal #2',
    actionStep: 'Answer reflection questions 1 to 3',
    allocatedMinutes: 20,
    companionMessage:
      "Your battery is at 20% tonight. Since M101 usually takes a bit longer for you, we won't rush the whole journal—let's just finish questions 1 to 3 together.",
  },
};

export const mockReflectResponse: ReflectResponse = {
  sessionId: 'ses_mock',
  studyMirror: {
    learnedPattern:
      'You consistently need ~20 minutes for M101 reflections. Time multipliers updated.',
    behaviorMetric: {
      courseCode: 'M101',
      varianceRatio: 1.33,
    },
  },
};
