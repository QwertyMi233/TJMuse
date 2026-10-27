import type { HolidayYear } from '../core/types';
// Source: 国办发明电〔2025〕7号, 2025-11-04.
// https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm
const days: HolidayYear['days'] = [];
function off(name: string, month: number, start: number, end: number) {
  for (let day = start; day <= end; day++) days.push({ name, date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, isOffDay: true });
}
off('元旦', 1, 1, 3); off('春节', 2, 15, 23); off('清明节', 4, 4, 6); off('劳动节', 5, 1, 5);
off('端午节', 6, 19, 21); off('中秋节', 9, 25, 27); off('国庆节', 10, 1, 7);
for (const [date, name] of [['01-04', '元旦'], ['02-14', '春节'], ['02-28', '春节'], ['05-09', '劳动节'], ['09-20', '国庆节'], ['10-10', '国庆节']]) days.push({ date: `2026-${date}`, name: name!, isOffDay: false });
export const builtIn2026: HolidayYear = { year: 2026, days, papers: ['https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm'] };
export async function fetchHolidays(year: number): Promise<HolidayYear> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`, { signal: controller.signal });
    if (!response.ok) throw new Error(`${year} 年调休数据尚不可用，已保留本地数据。`);
    const result = await response.json();
    if (result.year !== year || !Array.isArray(result.days) || !result.days.every((d: unknown) => {
      const day = d as { date?: unknown; name?: unknown; isOffDay?: unknown };
      return typeof day.date === 'string' && day.date.startsWith(`${year}-`) && typeof day.name === 'string' && typeof day.isOffDay === 'boolean';
    })) throw new Error('调休数据格式不正确，已保留本地数据。');
    return { year, days: result.days, papers: Array.isArray(result.papers) ? result.papers.filter((p: unknown) => typeof p === 'string' && p.startsWith('https://')) : [] };
  } catch (error) {
    if (controller.signal.aborted) throw new Error('同步超时，已保留本地调休数据。');
    throw error;
  } finally { clearTimeout(timer); }
}
