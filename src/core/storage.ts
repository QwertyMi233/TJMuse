import { initialData, DEFAULT_THEME } from './defaults';
import { validDate } from './calendar';
import type { AppData, Settings, HomeworkPreference, CanvasRenewal } from './types';
import { cleanHomeworkTrash } from './homework-trash';
import { DARK_PALETTE, LIGHT_PALETTE, isDark, validHex } from './theme';
import { validateTimetable } from './timetable';
import type { Palette, Timetable } from './types';
import {validateLessonPeriods} from './lesson-periods';
import {normalizeCategoryOrder} from './category-order';
import {cleanZhixuemengDescription} from './zhixuemeng-description';
import {LANGUAGES} from './locales';
import {validateCourseEdit,validateHomeworkEdit} from './local-overrides';
function restoreLocalPreference(p:Record<string,unknown>){
 let localEdit;try{if(p.localEdit!==undefined)localEdit=validateHomeworkEdit(p.localEdit);}catch{/* Drop malformed local edits only. */}
 return {...(localEdit?{localEdit}:{}),...(typeof p.temporaryDisabled==='boolean'?{temporaryDisabled:p.temporaryDisabled}:{})};
}
function restoreCourseEdits(v:unknown){
 const edits:NonNullable<AppData['courseOverrides']>={};if(!record(v))return edits;
 for(const [id,raw] of Object.entries(v).slice(0,5000)){if(!/^(course:|course-local:)/.test(id)||!validDate(id.slice(-10)))continue;try{edits[id]=validateCourseEdit(raw);}catch{}}
 return edits;
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const validStamp = (value: unknown) => typeof value === 'string' && Number.isFinite(new Date(value).getTime()) ? value : null;
function restoreRenewal(value: unknown, userId: unknown): CanvasRenewal | undefined {
  if (!record(value) || value.accountId !== userId || !/^\d+$/.test(String(value.tokenId)) || typeof value.purpose !== 'string' || !value.purpose.trim()) return;
  return { enabled: value.enabled === true, accountId: String(userId), tokenId: String(value.tokenId), purpose: value.purpose.slice(0, 200),
    lastAttempt: validStamp(value.lastAttempt), lastRotated: validStamp(value.lastRotated), expiresAt: validStamp(value.expiresAt),
    status: value.status === 'needs-login' || value.status === 'error' ? value.status : 'ready', message: typeof value.message === 'string' ? value.message.slice(0, 200) : '',
    lastSessionAttempt: validStamp(value.lastSessionAttempt), lastSessionCheck: validStamp(value.lastSessionCheck), lastErrorCode: typeof value.lastErrorCode==='string'?value.lastErrorCode.slice(0,80):null };
}
function palette(value: unknown, fallback: Palette): Palette {
  const raw=record(value)?value:{};
  return { foreground: validHex(raw.foreground)?raw.foreground:fallback.foreground, background: validHex(raw.background)?raw.background:fallback.background, accent: validHex(raw.accent)?raw.accent:fallback.accent };
}
function restoreTimetables(value: unknown): Timetable[] {
  if (!Array.isArray(value)) return [];
  const result:Timetable[]=[],ids=new Set<string>();
  for (const item of value.slice(0,50)) {
    if (!record(item) || !Array.isArray(item.sessions) || !Array.isArray(item.periods)) continue;
    try {
      const table:Timetable={id:String(item.id||''),name:String(item.name||''),enabled:item.enabled!==false,semesterStartDate:String(item.semesterStartDate||''),weekStartsOn:item.weekStartsOn===0?0:1,importedAt:validStamp(item.importedAt)||'',
        periods:item.periods.filter(record).map(p=>({number:Number(p.number),start:String(p.start),end:String(p.end)})),
        sessions:item.sessions.filter(record).map(s=>({id:String(s.id||''),...(validHex(s.color)?{color:s.color}:{}),...(s.startTime!==undefined||s.endTime!==undefined?{startTime:String(s.startTime||''),endTime:String(s.endTime||'')}:{}),title:String(s.title||''),teacher:String(s.teacher||'').slice(0,150),location:String(s.location||'').slice(0,200),weekday:Number(s.weekday),startPeriod:Number(s.startPeriod),endPeriod:Number(s.endPeriod),weeks:Array.isArray(s.weeks)?[...new Set(s.weeks.map(Number))].sort((a,b)=>a-b):[]}))};
      validateTimetable(table);if(ids.has(table.id))continue;ids.add(table.id);result.push(table);
    } catch { /* An invalid imported table cannot produce phantom courses. */ }
  }
  return result;
}

// Keep the original storage key so an installed 0.1.0 can upgrade in place.
export function restoreData(value: unknown, now = new Date()): AppData {
  if (!record(value) || ![1, 2].includes(value.version as number) || !Array.isArray(value.tasks) || !Array.isArray(value.flexibleTasks) || !Array.isArray(value.messages)) {
    throw new Error('本地数据格式无法读取。');
  }
  const saved = record(value.settings) ? value.settings : {};
  const savedProfiles = record(saved.aiProfiles) ? saved.aiProfiles : {};
  const settings: Settings = { ...initialData.settings, ...saved, aiProfiles: {
    openai: { ...initialData.settings.aiProfiles.openai, ...(record(savedProfiles.openai) ? savedProfiles.openai : {}) },
    deepseek: { ...initialData.settings.aiProfiles.deepseek, ...(record(savedProfiles.deepseek) ? savedProfiles.deepseek : {}) },
    custom: { ...initialData.settings.aiProfiles.custom, ...(record(savedProfiles.custom) ? savedProfiles.custom : {}) },
  } };
  if (value.version === 1) {
    const legacy = { foreground: '#202A24', background: '#F7F8F4', accent: '#416C56' };
    for (const key of ['foreground', 'background', 'accent'] as const) {
      if (saved[key] === legacy[key]) settings[key] = DEFAULT_THEME[key];
    }
  }
  const palettes=record(saved.themePalettes)?saved.themePalettes:{};
  const legacyPalette=palette(settings,LIGHT_PALETTE), legacyDark=isDark(legacyPalette.background);
  settings.themePalettes={light:palette(palettes.light,legacyDark?LIGHT_PALETTE:legacyPalette),dark:palette(palettes.dark,legacyDark?legacyPalette:DARK_PALETTE)};
  const legacyCustom=legacyPalette.foreground!==LIGHT_PALETTE.foreground||legacyPalette.background!==LIGHT_PALETTE.background||legacyPalette.accent!==LIGHT_PALETTE.accent;
  settings.themeMode=saved.themeMode==='light'||saved.themeMode==='dark'||saved.themeMode==='system'?saved.themeMode:legacyCustom?(legacyDark?'dark':'light'):'system';
  settings.homeLayout=saved.homeLayout==='grouped'?'grouped':'timeline';
  settings.language=LANGUAGES.includes(saved.language as any)?saved.language as Settings['language']:'system';
  settings.onboardingCompleted=typeof saved.onboardingCompleted==='boolean'?saved.onboardingCompleted:!!saved.semesterStartDate;
  settings.onboardingStep=Number.isInteger(saved.onboardingStep)&&Number(saved.onboardingStep)>=0&&Number(saved.onboardingStep)<=6?Number(saved.onboardingStep):0;
  settings.homeCategoryOrder=normalizeCategoryOrder(saved.homeCategoryOrder);
  const categories=record(saved.collapsedCategories)?saved.collapsedCategories:{},completed=record(saved.collapsedCompleted)?saved.collapsedCompleted:{};
  settings.collapsedCategories={course:categories.course===true,homework:categories.homework===true,todo:categories.todo===true};
  settings.collapsedCompleted={course:completed.course!==false,homework:completed.homework!==false,todo:completed.todo!==false};
  settings.weekStartsOn = saved.weekStartsOn === 0 ? 0 : 1;
  settings.aiWriteEnabled = saved.aiWriteEnabled !== false;
  try{settings.lessonPeriods=validateLessonPeriods(Array.isArray(saved.lessonPeriods)?saved.lessonPeriods.filter(record).map(p=>({number:Number(p.number),start:String(p.start||''),end:String(p.end||'')})):initialData.settings.lessonPeriods.map(p=>({...p})));}
  catch{settings.lessonPeriods=initialData.settings.lessonPeriods.map(p=>({...p}));}
  settings.timetableRowHeight=typeof saved.timetableRowHeight==='number'&&Number.isFinite(saved.timetableRowHeight)&&saved.timetableRowHeight>=28&&saved.timetableRowHeight<=180?saved.timetableRowHeight:null;
  settings.homeworkPlacement = saved.homeworkPlacement === 'top' || saved.homeworkPlacement === 'bottom' ? saved.homeworkPlacement : 'timeline';
  settings.collapseSubmittedHomework = saved.collapseSubmittedHomework === true;
  settings.showHomeworkInTodo = saved.showHomeworkInTodo !== false;
  settings.showDatedHomeworkByDefault = saved.showDatedHomeworkByDefault !== false;
  settings.showUndatedHomeworkByDefault = saved.showUndatedHomeworkByDefault === true;
  settings.homeworkNotifications = typeof saved.homeworkNotifications === 'boolean' ? saved.homeworkNotifications : saved.todoNotifications === true;
  settings.semesterStartDate = typeof saved.semesterStartDate === 'string' && validDate(saved.semesterStartDate) ? saved.semesterStartDate : null;
  const canvas = record(value.canvas) ? value.canvas : {};
  const haoke = record(value.haoke) ? value.haoke : {};
  const haokePreferences: Record<string, HomeworkPreference> = {};
  if (record(haoke.preferences)) for (const [id, p] of Object.entries(haoke.preferences)) {
    if (/^haoke:\d+:(?:exam:)?\d+$/.test(id) && record(p)) haokePreferences[id] = {
      visibility: p.visibility === 'show' || p.visibility === 'hide' ? p.visibility : 'default', deleted: p.deleted === true,
      ...restoreLocalPreference(p),
      ...(typeof p.completedOverride === 'boolean' ? { completedOverride: p.completedOverride } : {}),
      ...(validStamp(p.deletedAt) ? { deletedAt: validStamp(p.deletedAt)! } : {}), ...(p.purged === true ? { purged: true } : {}),
    };
  }
  const preferences: Record<string, HomeworkPreference> = {};
  if (record(canvas.preferences)) for (const [id, pref] of Object.entries(canvas.preferences)) {
    if (/^\d+:\d+$/.test(id) && record(pref)) preferences[id] = {
      visibility: pref.visibility === 'show' || pref.visibility === 'hide' ? pref.visibility : 'default', deleted: pref.deleted === true,
      ...restoreLocalPreference(pref),
      ...(typeof pref.completedOverride === 'boolean' ? { completedOverride: pref.completedOverride } : {}),
      ...(pref.deleted === true && typeof pref.deletedAt === 'string' && Number.isFinite(Date.parse(pref.deletedAt)) ? { deletedAt: pref.deletedAt } : {}),
      ...(pref.deleted === true && pref.purged === true ? { purged: true } : {}),
    };
  }
  const zxm=record(value.zhixuemeng)?value.zhixuemeng:{},zxmPreferences:Record<string,HomeworkPreference>={};
  const zxmId=(id:string)=>/^zhixuemeng:[A-Za-z0-9_-]{1,128}:[A-Za-z0-9_-]{1,128}$/.test(id);
  if(record(zxm.preferences))for(const[id,p]of Object.entries(zxm.preferences))if(zxmId(id)&&record(p))zxmPreferences[id]={visibility:p.visibility==='show'||p.visibility==='hide'?p.visibility:'default',deleted:p.deleted===true,...restoreLocalPreference(p),...(typeof p.completedOverride==='boolean'?{completedOverride:p.completedOverride}:{}),...(validStamp(p.deletedAt)?{deletedAt:validStamp(p.deletedAt)!}:{}),...(p.purged===true?{purged:true}:{})};
  const firstSeen = typeof canvas.lastSync === 'string' && Number.isFinite(Date.parse(canvas.lastSync)) ? canvas.lastSync : now.toISOString();
  return { ...initialData, ...value, version: 2, settings,
    timetables:restoreTimetables(value.timetables),
    courseOverrides:restoreCourseEdits(value.courseOverrides),
    courseExceptions:record(value.courseExceptions)?Object.fromEntries(Object.entries(value.courseExceptions).filter(([id,v])=>/^(course:|course-local:)/.test(id)&&validDate(id.slice(-10))&&typeof v==='boolean')) as Record<string,boolean>:{},
    zhixuemeng:cleanHomeworkTrash({...initialData.zhixuemeng,userId:typeof zxm.userId==='string'?zxm.userId:null,connected:zxm.connected===true,lastSync:validStamp(zxm.lastSync),preferences:zxmPreferences,
      assignments:Array.isArray(zxm.assignments)?zxm.assignments.filter(record).filter(a=>zxmId(String(a.id))).map(a=>({...a,platform:'zhixuemeng',description:cleanZhixuemengDescription(a.description),completedOverride:typeof zxmPreferences[String(a.id)]?.completedOverride==='boolean'?zxmPreferences[String(a.id)]!.completedOverride:typeof a.completedOverride==='boolean'?a.completedOverride:a.completed===true?true:undefined})) as AppData['zhixuemeng']['assignments']:[]},now),
    haoke: cleanHomeworkTrash({ ...initialData.haoke, userId: typeof haoke.userId === 'string' ? haoke.userId : null,
      connected: haoke.connected === true, lastSync: validStamp(haoke.lastSync), preferences: haokePreferences,
      assignments: Array.isArray(haoke.assignments) ? haoke.assignments.filter(record).filter(a => /^haoke:\d+:(?:exam:)?\d+$/.test(String(a.id))).map(a => ({ ...a, platform: 'haoke',
        completedOverride: typeof haokePreferences[String(a.id)]?.completedOverride === 'boolean' ? haokePreferences[String(a.id)]!.completedOverride : typeof a.completedOverride === 'boolean' ? a.completedOverride : a.completed === true ? true : undefined,
      })) as AppData['haoke']['assignments'] : [] }, now),
    canvas: cleanHomeworkTrash({ ...initialData.canvas, baseUrl: typeof canvas.baseUrl === 'string' ? canvas.baseUrl : initialData.canvas.baseUrl,
      userId: typeof canvas.userId === 'string' ? canvas.userId : null, connected: canvas.authMode === 'personal-token' && canvas.connected === true,
      lastSync: typeof canvas.lastSync === 'string' ? canvas.lastSync : null, preferences, renewal: restoreRenewal(canvas.renewal, canvas.userId),
      assignments: Array.isArray(canvas.assignments) ? canvas.assignments.filter(record).map(a => ({ ...a,
        completedOverride: typeof preferences[String(a.id)]?.completedOverride === 'boolean' ? preferences[String(a.id)]!.completedOverride : typeof a.completedOverride === 'boolean' ? a.completedOverride : a.completed === true ? true : undefined,
        firstSeenAt: typeof a.firstSeenAt === 'string' ? a.firstSeenAt : firstSeen })) as AppData['canvas']['assignments'] : [] }, now),
    tasks: value.tasks as AppData['tasks'], flexibleTasks: value.flexibleTasks as AppData['flexibleTasks'], messages: value.messages as AppData['messages'],
    profile: { ...initialData.profile, ...(record(value.profile) ? value.profile : {}) },
  };
}
