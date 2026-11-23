export type DateKey = string;
export type Provider = 'openai' | 'deepseek' | 'custom';
export type RepeatUnit = 'day' | 'week' | 'month' | 'year';
export interface RepeatRule {
  interval: number;
  unit: RepeatUnit;
  weekdays: number[];
  weekStartsOn: 0 | 1;
}
export interface Subtask { id: string; title: string; completedDates: DateKey[] }
export interface TaskPriority { important?: boolean; urgent?: boolean }
export interface Task extends TaskPriority {
  id: string;
  title: string;
  description: string;
  location: string;
  date: DateKey;
  time: string;
  duration: number;
  color: string;
  kind: 'todo' | 'course';
  repeat: RepeatRule | null;
  subtasks: Subtask[];
  completedDates: DateKey[];
  homeworkId?: string;
  canvasSubmitted?: boolean;
  homeworkDueAt?: string;
  homeworkPlatform?: 'canvas' | 'haoke' | 'zhixuemeng';
  timetableId?: string;
  courseSessionId?: string;
}
// Derived for a day view; only the original Task is persisted.
export interface TaskOccurrence extends Task {
  occurrenceDate: DateKey;
  endDate: DateKey;
  endTime: string;
  dayStartTime: string;
  dayEndTime: string;
  isContinuation: boolean;
  continuesTomorrow: boolean;
}
export interface FlexibleTask extends TaskPriority { id: string; title: string; description: string; completed: boolean }
export interface AITodoChange { taskId:string; before:Task|null; after:Task; flexibleSource?:FlexibleTask }
export interface AICourseRecordChange {kind:'course-record';id:string;tableId:string|null;before:CourseSession|Task;after:CourseSession|Task|null;index:number;context:string;title:string;date?:string}
export interface CourseOccurrenceEdit { title?:string; description?:string; location?:string; time?:string; endTime?:string; color?:string }
export interface HomeworkLocalEdit { title?:string; description?:string; courseName?:string; unlockAt?:string|null; dueAt?:string|null }
export type AIStateChange = {kind:'homework';platform:'canvas'|'haoke'|'zhixuemeng';id:string;accountId:string|null;before:HomeworkPreference|undefined;beforeOverride:boolean|undefined;beforeCompleted:boolean;after:HomeworkPreference;title:string} | {kind:'course';id:string;before:boolean|undefined;after:boolean;title:string;date:string;fingerprint:string} | {kind:'course-local';id:string;date:string;before:CourseOccurrenceEdit|undefined;after:CourseOccurrenceEdit|undefined;fingerprint:string;title:string} | AICourseRecordChange;
export interface Message { id: string; role: 'user' | 'assistant'; content: string; date: DateKey; createdAt: string; aiUndo?:{changes:AITodoChange[];addedFlexible:FlexibleTask[];stateChanges?:AIStateChange[]} }
export interface AIProfile { baseUrl: string; model: string; maxTokens: number }
export interface Palette { foreground: string; background: string; accent: string }
export type TaskCategory = 'course' | 'homework' | 'todo';
export interface Settings {
  language:import('./locales').LanguageSetting;
  onboardingCompleted:boolean;
  onboardingStep:number;
  lessonPeriods:LessonPeriod[];
  aiWriteEnabled:boolean;
  timetableRowHeight:number|null;
  themeMode: 'system' | 'light' | 'dark';
  themePalettes: { light: Palette; dark: Palette };
  homeLayout: 'timeline' | 'grouped';
  homeCategoryOrder: TaskCategory[];
  collapsedCategories: Record<TaskCategory, boolean>;
  collapsedCompleted: Record<TaskCategory, boolean>;
  homeworkPlacement: 'timeline' | 'top' | 'bottom';
  collapseSubmittedHomework: boolean;
  showHomeworkInTodo: boolean;
  showDatedHomeworkByDefault: boolean;
  showUndatedHomeworkByDefault: boolean;
  foreground: string;
  background: string;
  accent: string;
  weekStartsOn: 0 | 1;
  semesterStartDate: DateKey | null;
  todoNotifications: boolean;
  courseNotifications: boolean;
  homeworkNotifications: boolean;
  reminderMinutes: number;
  provider: Provider;
  aiProfiles: Record<Provider, AIProfile>;
  dayStart: string;
  dayEnd: string;
  holidayEnabled: boolean;
}
export interface Profile { nickname: string; region: string; regionCode?:string; gender: string; avatar: string }
export interface Holiday { date: DateKey; name: string; isOffDay: boolean }
export interface HolidayYear { year: number; days: Holiday[]; papers: string[] }
export interface CanvasAssignment {
  platform?: 'canvas' | 'haoke' | 'zhixuemeng';
  id: string; courseId: string; courseName: string; title: string; description: string;
  dueAt: string | null; url: string; submitted: boolean | null; completed: boolean;
  completedOverride?: boolean;
  unlockAt?: string | null; createdAt?: string | null; firstSeenAt?: string | null;
}
export interface HomeworkPreference {
  visibility: 'default' | 'show' | 'hide'; deleted: boolean;
  localEdit?: HomeworkLocalEdit;
  temporaryDisabled?: boolean;
  completedOverride?: boolean;
  deletedAt?: string;
  // A content-free tombstone prevents a cleared assignment from being reimported.
  purged?: boolean;
}
export interface CanvasRenewal {
  enabled: boolean; tokenId: string; purpose: string; accountId: string;
  lastAttempt: string | null; lastRotated: string | null; expiresAt: string | null;
  status: 'ready' | 'needs-login' | 'error'; message: string;
  lastSessionAttempt?: string | null; lastSessionCheck?: string | null;
  lastErrorCode?: string | null;
}
export interface HomeworkPlatformState { authMode: 'personal-token' | 'web-session'; baseUrl: string; userId: string | null; connected: boolean; lastSync: string | null; assignments: CanvasAssignment[]; preferences: Record<string, HomeworkPreference> }
export interface CanvasState extends HomeworkPlatformState { authMode: 'personal-token'; renewal?: CanvasRenewal }
export interface HaokeState extends HomeworkPlatformState { authMode: 'web-session' }
export interface CourseSession {
  color?:string;
  startTime?:string; endTime?:string;
  id: string; title: string; teacher: string; location: string; weekday: number;
  startPeriod: number; endPeriod: number; weeks: number[];
}
export interface LessonPeriod { number: number; start: string; end: string }
export interface Timetable {
  id: string; name: string; enabled: boolean; semesterStartDate: DateKey; weekStartsOn: 0 | 1;
  importedAt: string; sessions: CourseSession[]; periods: LessonPeriod[];
}
export interface AppData {
  courseExceptions?: Record<string, boolean>;
  courseOverrides?: Record<string, CourseOccurrenceEdit>;
  timetables: Timetable[];
  canvas: CanvasState;
  haoke: HaokeState;
  zhixuemeng: HaokeState;
  version: 2;
  tasks: Task[];
  flexibleTasks: FlexibleTask[];
  messages: Message[];
  settings: Settings;
  profile: Profile;
  holidays: Record<string, HolidayYear>;
  lastHolidaySync: string | null;
}
