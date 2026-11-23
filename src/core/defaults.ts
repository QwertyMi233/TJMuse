import type { AppData } from './types';
import { HOMEWORK_DISPLAY_DEFAULTS } from './homework';
import { LIGHT_PALETTE, DARK_PALETTE } from './theme';
import {DEFAULT_PERIODS} from './lesson-periods';
import {DEFAULT_CATEGORY_ORDER} from './category-order';
export const TASK_COLORS = ['#AAC4B5', '#B8BCE0', '#E1C29E', '#B3CDD9', '#D9B4C2', '#C7CEA8', '#D3BEE0', '#E1C5AC'];
// Screen palette inspired by Tongji blue; the page stays white by default.
export const DEFAULT_THEME = { foreground: '#123B64', background: '#FFFFFF', accent: '#0066B3' };
export const ACCENTS = ['#0066B3', '#123B64', '#5A61A0', '#A55D73', '#39768C', '#9B6D34'];
export const BACKGROUNDS = ['#FFFFFF', '#EAF3FC', '#F3F4FA', '#F9F4F2', '#EEF5F5', '#111D2D'];
export const FOREGROUNDS = ['#123B64', '#151515', '#263149', '#46352F', '#F2F6FC'];
export const initialData: AppData = {
  timetables: [],
  zhixuemeng: {authMode:'web-session',baseUrl:'https://h5.zhixuemeng.com',userId:null,connected:false,lastSync:null,assignments:[],preferences:{}},
  haoke: { authMode: 'web-session', baseUrl: 'https://tongji.aihaoke.net', userId: null, connected: false, lastSync: null, assignments: [], preferences: {} },
  canvas: { authMode: 'personal-token', baseUrl: 'https://canvas.tongji.edu.cn', userId: null, connected: false, lastSync: null, assignments: [], preferences: {} },
  version: 2, tasks: [], flexibleTasks: [], messages: [], holidays: {}, lastHolidaySync: null,
  profile: { nickname: 'Muse', region: '中国大陆', gender: '不愿透露', avatar: '' },
  settings: {
    language:'system',onboardingCompleted:false,onboardingStep:0,
    lessonPeriods:DEFAULT_PERIODS.map(p=>({...p})),
    aiWriteEnabled:true,
    timetableRowHeight:null,
    themeMode: 'system', themePalettes: { light: { ...LIGHT_PALETTE }, dark: { ...DARK_PALETTE } },
    homeLayout: 'timeline', homeCategoryOrder:[...DEFAULT_CATEGORY_ORDER], collapsedCategories: { course: false, homework: false, todo: false }, collapsedCompleted: { course: true, homework: true, todo: true },
    ...DEFAULT_THEME, ...HOMEWORK_DISPLAY_DEFAULTS, weekStartsOn: 1, semesterStartDate: null, homeworkPlacement: 'timeline', collapseSubmittedHomework: false,
    todoNotifications: true, courseNotifications: true, homeworkNotifications: true, reminderMinutes: 10,
    provider: 'openai', dayStart: '08:00', dayEnd: '22:00', holidayEnabled: true,
    aiProfiles: {
      openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', maxTokens: 4096 },
      deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash', maxTokens: 8192 },
      custom: { baseUrl: '', model: '', maxTokens: 4096 },
    },
  },
};
export function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
