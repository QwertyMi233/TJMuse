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
export interface Task {
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
}
export interface FlexibleTask { id: string; title: string; description: string; completed: boolean }
export interface Message { id: string; role: 'user' | 'assistant'; content: string; date: DateKey; createdAt: string }
export interface AIProfile { baseUrl: string; model: string; maxTokens: number }
export interface Settings {
  foreground: string;
  background: string;
  accent: string;
  weekStartsOn: 0 | 1;
  todoNotifications: boolean;
  courseNotifications: boolean;
  reminderMinutes: number;
  provider: Provider;
  aiProfiles: Record<Provider, AIProfile>;
  dayStart: string;
  dayEnd: string;
  holidayEnabled: boolean;
}
export interface Profile { nickname: string; region: string; gender: string; avatar: string }
export interface Holiday { date: DateKey; name: string; isOffDay: boolean }
export interface HolidayYear { year: number; days: Holiday[]; papers: string[] }
export interface AppData {
  version: 1;
  tasks: Task[];
  flexibleTasks: FlexibleTask[];
  messages: Message[];
  settings: Settings;
  profile: Profile;
  holidays: Record<string, HolidayYear>;
  lastHolidaySync: string | null;
}
