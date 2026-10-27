import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initialData } from '../core/defaults';
import { toggleDate } from '../core/calendar';
import type { AppData, Task, FlexibleTask, Message, Settings, Profile, Holiday } from '../core/types';
import { builtIn2026, fetchHolidays } from '../services/holidays';
import { syncNotifications } from '../services/notifications';

const STORAGE_KEY = 'tjmuse.data.v1';
type Store = {
  data: AppData; ready: boolean; error: string; notice: string; clearNotice: () => void;
  saveTask: (task: Task) => void; deleteTask: (id: string) => void; toggleTask: (id: string, date: string) => void;
  toggleSubtask: (id: string, subId: string, date: string) => void;
  saveFlexible: (task: FlexibleTask) => void; deleteFlexible: (id: string) => void; toggleFlexible: (id: string) => void;
  addMessages: (messages: Message[]) => void; clearMessages: () => void;
  updateSettings: (settings: Partial<Settings>) => void; updateProfile: (profile: Profile) => void;
  getHoliday: (date: string) => Holiday | undefined; syncHolidays: (year: number) => Promise<void>;
};
const Context = createContext<Store | null>(null);
let writes: Promise<void> = Promise.resolve();
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(initialData);
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const latest = useRef(data); latest.current = data;
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.version !== 1 || !Array.isArray(saved.tasks) || !Array.isArray(saved.flexibleTasks) || !Array.isArray(saved.messages)) throw new Error('本地数据格式无法读取。');
        setData({ ...initialData, ...saved, settings: { ...initialData.settings, ...saved.settings,
          aiProfiles: { ...initialData.settings.aiProfiles, ...saved.settings?.aiProfiles } }, profile: { ...initialData.profile, ...saved.profile } });
      }
      setReady(true);
    }).catch(() => setError('无法读取本地数据。为保护已有记录，暂未写入更改。请重新打开 App。'));
  }, []);
  useEffect(() => {
    if (!ready) return;
    writes = writes.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)));
    void writes.catch(() => setNotice('本地保存失败，请检查设备存储空间。'));
  }, [data, ready]);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => { void syncNotifications(data).catch(e => setNotice(e.message || '提醒更新失败。')); }, 350);
    return () => clearTimeout(timer);
  }, [data.tasks, data.settings.todoNotifications, data.settings.courseNotifications, data.settings.reminderMinutes, ready]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && ready) void syncNotifications(latest.current).catch(e => setNotice(e.message));
    });
    return () => subscription.remove();
  }, [ready]);
  const syncHolidays = useCallback(async (year: number) => {
    const result = await fetchHolidays(year);
    setData(d => ({ ...d, holidays: { ...d.holidays, [year]: result }, lastHolidaySync: new Date().toISOString() }));
  }, []);
  useEffect(() => {
    if (!ready || !data.settings.holidayEnabled) return;
    const year = new Date().getFullYear();
    const last = data.lastHolidaySync ? new Date(data.lastHolidaySync).getTime() : 0;
    if (Date.now() - last > 7 * 86400000) void syncHolidays(year).catch(() => {});
  }, [ready, data.settings.holidayEnabled, syncHolidays]);
  const store: Store = {
    data, ready, error, notice, clearNotice: () => setNotice(''),
    saveTask: task => setData(d => ({ ...d, tasks: d.tasks.some(t => t.id === task.id) ? d.tasks.map(t => t.id === task.id ? task : t) : [...d.tasks, task] })),
    deleteTask: id => setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) })),
    toggleTask: (id, date) => setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id && t.kind === 'todo' ? { ...t, completedDates: toggleDate(t.completedDates, date) } : t) })),
    toggleSubtask: (id, subId, date) => setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, completedDates: toggleDate(s.completedDates, date) } : s) } : t) })),
    saveFlexible: task => setData(d => ({ ...d, flexibleTasks: d.flexibleTasks.some(t => t.id === task.id) ? d.flexibleTasks.map(t => t.id === task.id ? task : t) : [...d.flexibleTasks, task] })),
    deleteFlexible: id => setData(d => ({ ...d, flexibleTasks: d.flexibleTasks.filter(t => t.id !== id) })),
    toggleFlexible: id => setData(d => ({ ...d, flexibleTasks: d.flexibleTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) })),
    addMessages: messages => setData(d => ({ ...d, messages: [...d.messages, ...messages].slice(-500) })),
    clearMessages: () => setData(d => ({ ...d, messages: [] })),
    updateSettings: settings => setData(d => ({ ...d, settings: { ...d.settings, ...settings } })),
    updateProfile: profile => setData(d => ({ ...d, profile })),
    getHoliday: date => data.settings.holidayEnabled ? (data.holidays[date.slice(0, 4)] || (date.startsWith('2026-') ? builtIn2026 : undefined))?.days.find(h => h.date === date) : undefined,
    syncHolidays,
  };
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useStore() { const value = useContext(Context); if (!value) throw new Error('AppProvider missing'); return value; }
