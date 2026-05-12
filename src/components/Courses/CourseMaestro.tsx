import { useMaestroContext } from '../../context/MaestroContext';
import type { CourseDefinition } from '../../types/courses';
import { MaestroChat } from '../Maestro/MaestroChat';
import { MaestroSelector } from '../Maestro/MaestroSelector';
import { StudentOnboarding } from '../Maestro/StudentOnboarding';

interface CourseMaestroProps {
  activeCourse: CourseDefinition | null;
  maestroLessonIndex: number;
  view: 'maestro-select' | 'maestro-chat' | 'onboarding';
  onMaestroSelected: (maestroId: string) => void;
  onOnboardingComplete: () => void;
  onBack: () => void;
}

export function CourseMaestro({
  activeCourse,
  maestroLessonIndex,
  view,
  onMaestroSelected,
  onOnboardingComplete,
  onBack,
}: CourseMaestroProps) {
  const { currentSession } = useMaestroContext();

  // Onboarding
  if (view === 'onboarding') {
    return <StudentOnboarding onComplete={onOnboardingComplete} />;
  }

  // Maestro Select
  if (view === 'maestro-select' && activeCourse) {
    return (
      <div className="course-panel">
        <MaestroSelector
          category={activeCourse.category}
          courseId={activeCourse.id}
          lessonIndex={maestroLessonIndex}
          onSelect={onMaestroSelected}
          onBack={onBack}
        />
      </div>
    );
  }

  // Maestro Chat
  if (view === 'maestro-chat' && currentSession) {
    return <MaestroChat onBack={onBack} />;
  }

  return null;
}
