import type { AppData } from './types';
export const TASK_COLORS = ['#AAC4B5', '#B8BCE0', '#E1C29E', '#B3CDD9', '#D9B4C2', '#C7CEA8', '#D3BEE0', '#E1C5AC'];
export const ACCENTS = ['#416C56', '#5A61A0', '#A55D73', '#39768C', '#9B6D34', '#333D38'];
export const BACKGROUNDS = ['#F7F8F4', '#FFFFFF', '#F3F4FA', '#F9F4F2', '#EEF5F5', '#171C19'];
export const FOREGROUNDS = ['#202A24', '#151515', '#263149', '#46352F', '#F2F4EF'];
export const initialData: AppData = {
  version: 1, tasks: [], flexibleTasks: [], messages: [], holidays: {}, lastHolidaySync: null,
  profile: { nickname: 'Muse', region: '中国大陆', gender: '不愿透露', avatar: '' },
  settings: {
    foreground: '#202A24', background: '#F7F8F4', accent: '#416C56', weekStartsOn: 1,
    todoNotifications: false, courseNotifications: false, reminderMinutes: 10,
    provider: 'openai', dayStart: '08:00', dayEnd: '22:00', holidayEnabled: true,
    aiProfiles: {
      openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', maxTokens: 4096 },
      deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash', maxTokens: 8192 },
      custom: { baseUrl: '', model: '', maxTokens: 4096 },
    },
  },
};
export function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
