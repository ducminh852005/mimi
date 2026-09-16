import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import { localStore, type StudentSessionState } from './utils/storage';
import { adaptPlan, extractTasks, reflect } from './api/client';
import type {
  AcademicTask,
  AdaptPlanResponse,
  ObstacleReason,
  ReflectionFeedback,
  StudentProfile,
} from './types/api';
import { DumpAmbientHomeScreen } from './components/screens/DumpAmbientHomeScreen';
import { WorkloadOverviewScreen } from './components/screens/WorkloadOverviewScreen';
import { FocusActionScreen } from './components/screens/FocusActionScreen';
import { ReflectionScreen } from './components/screens/ReflectionScreen';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { ambientThemeFor } from './lib/theme';

// 4-screen state machine — docs/ARCHITECTURE.md §7.
type Screen = 'screen1' | 'screen2' | 'screen3' | 'screen4';

function App() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<StudentProfile>(() => localStore.getProfile());
  const [session, setSession] = useState<StudentSessionState>(() => localStore.getSession());
  const [tasks, setTasks] = useState<AcademicTask[]>(() => localStore.getTasks());
  const [mirror, setMirror] = useState(() => localStore.getMirror());
  const [plan, setPlan] = useState<AdaptPlanResponse | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [latestLearnedPattern, setLatestLearnedPattern] = useState<string | null>(null);

  // Session Auto-Resume (docs/ARCHITECTURE.md §8): an F5 mid-focus jumps straight
  // back into Screen 3 instead of losing the running step. Derived from the
  // initial localStorage read, not an effect, so there's no extra render.
  const [screen, setScreen] = useState<Screen>(() =>
    session.activeRecommendation && session.startedAt ? 'screen3' : 'screen1',
  );

  function updateProfile(patch: Partial<StudentProfile>) {
    localStore.setProfile(patch);
    setProfile(localStore.getProfile());
  }

  function updateSession(patch: Partial<StudentSessionState>) {
    localStore.setSession(patch);
    setSession(localStore.getSession());
  }

  async function handleExtract(files: File[], rawText: string) {
    setExtracting(true);
    try {
      const extracted = await extractTasks(files, rawText);
      localStore.setTasks(extracted);
      setTasks(extracted);
      setScreen('screen2');
    } finally {
      setExtracting(false);
    }
  }

  useEffect(() => {
    if (screen !== 'screen2' || plan) return;
    let cancelled = false;
    adaptPlan({
      availableMinutes: session.availableMinutes,
      batteryLevel: session.batteryLevel,
      currentTime: new Date().toTimeString().slice(0, 5),
      studentProfile: { chronotype: profile.chronotype, preferredTone: profile.preferredTone },
      courseMultipliers: mirror.courseMultipliers,
      tasks,
    }).then((result) => {
      if (!cancelled) setPlan(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  function handleStart() {
    if (!plan) return;
    updateSession({ activeRecommendation: plan.recommendation, startedAt: Date.now() });
    setScreen('screen3');
  }

  function handleDone() {
    const rec = session.activeRecommendation;
    if (rec) {
      localStore.markSubTaskCompleted(rec.taskId, rec.subTaskId);
      setTasks(localStore.getTasks());
    }
    setScreen('screen4');
  }

  async function handleReflect(feedback: ReflectionFeedback, obstacleReason: ObstacleReason) {
    const rec = session.activeRecommendation;
    if (!rec || !session.startedAt) return;
    const actualMinutesSpent = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));

    const result = await reflect({
      taskId: rec.taskId,
      subTaskId: rec.subTaskId,
      courseCode: rec.courseCode,
      plannedMinutes: rec.allocatedMinutes,
      actualMinutesSpent,
      feedback,
      obstacleReason,
    });

    localStore.addReflectionInsight(
      result.studyMirror.learnedPattern,
      result.studyMirror.behaviorMetric.courseCode,
      result.studyMirror.behaviorMetric.varianceRatio,
    );
    setMirror(localStore.getMirror());
    setLatestLearnedPattern(result.studyMirror.learnedPattern);
  }

  function handleFinish() {
    localStore.clearActiveSession();
    setSession(localStore.getSession());
    setPlan(null);
    setLatestLearnedPattern(null);
    setScreen('screen1');
  }

  const theme = ambientThemeFor(session.batteryLevel);

  return (
    <div className={`min-h-screen ${theme.pageBg}`}>
      <main className="mx-auto max-w-md px-4 pb-12">
        <header className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-semibold">{t('common.appName')}</p>
            <p className="text-[11px] text-gray-500">{t('common.motto')}</p>
          </div>
          <LanguageSwitcher />
        </header>

        {screen === 'screen1' && (
          <DumpAmbientHomeScreen
            profile={profile}
            onProfileChange={updateProfile}
            batteryLevel={session.batteryLevel}
            availableMinutes={session.availableMinutes}
            onBatteryChange={(level) => updateSession({ batteryLevel: level })}
            onMinutesChange={(minutes) => updateSession({ availableMinutes: minutes })}
            onExtract={handleExtract}
            extracting={extracting}
          />
        )}

        {screen === 'screen2' && (
          <WorkloadOverviewScreen
            batteryLevel={session.batteryLevel}
            plan={plan}
            loading={!plan}
            onStart={handleStart}
          />
        )}

        {screen === 'screen3' && (
          <FocusActionScreen
            batteryLevel={session.batteryLevel}
            recommendation={session.activeRecommendation}
            startedAt={session.startedAt}
            onDone={handleDone}
          />
        )}

        {screen === 'screen4' && (
          <ReflectionScreen
            batteryLevel={session.batteryLevel}
            recommendation={session.activeRecommendation}
            latestLearnedPattern={latestLearnedPattern}
            onSubmit={handleReflect}
            onFinish={handleFinish}
          />
        )}
      </main>
    </div>
  );
}

export default App;
