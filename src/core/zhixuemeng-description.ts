// Platform-generated authoring metadata is not an assignment instruction.
export function cleanZhixuemengDescription(value:unknown):string {
  const text=typeof value==='string'?value:'';
  if(!/生成\s*JSON\s*数据的章节范围|chapter_\d{8,}|section_\d{8,}/i.test(text))return text;
  const start=text.search(/(?:^|\n)\s*1[.、]\s*/);
  return start>=0?text.slice(start).trim():'';
}
