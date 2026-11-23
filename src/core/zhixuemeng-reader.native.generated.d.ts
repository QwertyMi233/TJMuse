import type {CanvasAssignment} from './types';
declare function readZhixuemeng(request:(path:string,query:Record<string,unknown>)=>Promise<any>,identity:{id:string;username:string},expected?:string):Promise<{userId:string;loginAccount:string;assignments:CanvasAssignment[]}>;
export = readZhixuemeng;
