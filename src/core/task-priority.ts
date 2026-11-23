import type {TaskPriority} from './types';

export function taskPriority(value:TaskPriority={}){
  return {important:value.important===true,urgent:value.urgent===true};
}
export function priorityLabel(value:TaskPriority){
  const {important,urgent}=taskPriority(value);
  return important?(urgent?'重要紧急':'重要不紧急'):(urgent?'不重要紧急':'不紧急不重要');
}
// Omitted flags keep an existing choice; only actual booleans may change it.
export function parsePriority(value:Record<string,unknown>,fallback:TaskPriority={}){
  for(const key of ['important','urgent'])if(value[key]!==undefined&&typeof value[key]!=='boolean')throw new Error('重要和紧急须为开关值');
  return taskPriority({...fallback,...(value.important!==undefined?{important:value.important as boolean}:{}),...(value.urgent!==undefined?{urgent:value.urgent as boolean}:{})});
}
