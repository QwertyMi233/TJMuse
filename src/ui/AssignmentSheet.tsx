import {cleanZhixuemengDescription} from '../core/zhixuemeng-description';
import { allHomework,assignmentPlatform, platformName } from '../core/platforms';
import {TemporaryHomeworkEditor} from './TemporaryEditors';
import React, { useState } from 'react';
import {Linking,View} from 'react-native';
import Text from './LocalizedText';

import type { CanvasAssignment } from '../core/types';
import { Button, Checkbox, Hint, Pill, Sheet } from './components';
import { useTheme } from './theme';
import { homeworkCompleted, homeworkStartText, homeworkVisible } from '../core/homework';
import { useStore } from '../state/store';
export default function AssignmentSheet({ assignment, onClose,initialEditing=false }: { assignment: CanvasAssignment; onClose: () => void;initialEditing?:boolean }) {
  const t = useTheme(), { data, setHomeworkPreference, toggleHomework,editHomeworkLocal } = useStore(), [error, setError] = useState(''),[editing,setEditing]=useState(initialEditing);
  const source = assignmentPlatform(assignment), state = data[source], name = platformName(source);
  const original=state.assignments.find(a => a.id === assignment.id);
  assignment = allHomework(data).find(a => a.id === assignment.id) || assignment;
  const completed = homeworkCompleted(assignment);
  const preference = state.preferences[assignment.id], visibility = preference?.visibility || 'default';
  const open = async () => { try { if (new URL(assignment.url).origin !== new URL(state.baseUrl).origin) throw new Error(); await Linking.openURL(assignment.url); } catch { setError('无法打开此作业链接。'); } };
  if(editing)return <TemporaryHomeworkEditor assignment={assignment} onClose={onClose} onSaved={onClose} onDelete={()=>{setHomeworkPreference(assignment.id,{deleted:true});onClose();}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Checkbox checked={!preference?.temporaryDisabled} label="启用这份作业" onPress={()=>editHomeworkLocal(assignment.id,{},!!preference?.temporaryDisabled)}/><Text style={{color:t.fg}}>启用这份作业</Text></View>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Checkbox checked={completed} label={`${completed?'取消完成':'完成'}作业 ${assignment.title}`} onPress={()=>toggleHomework(assignment.id)}/><Text style={{color:t.fg}}>本机标记为已完成</Text></View>
    {preference?.localEdit&&<><Hint>平台原截止时间：{original?.dueAt?new Date(original.dueAt).toLocaleString():'未设置截止时间'}</Hint><Button dismiss title="恢复平台原文" secondary onPress={()=>{editHomeworkLocal(assignment.id,null);onClose();}}/></>}
    <View style={{gap:12}}><Text style={{color:t.fg,fontSize:14,fontWeight:'600'}}>在 To-do 中显示</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{([['default','跟随默认'],['show','显示'],['hide','隐藏']] as const).map(([value,title])=><Pill key={value} title={title} selected={visibility===value} onPress={()=>setHomeworkPreference(assignment.id,{visibility:value})}/>)}</View></View>
  </TemporaryHomeworkEditor>;
  return <Sheet visible title={assignment.title} subtitle={assignment.courseName} onClose={onClose} footer={<Button title={`前往 ${name} 查看作业`} onPress={() => { void open(); }} />}>
    <Hint>{homeworkStartText(assignment)}</Hint>
    <Hint>截止：{assignment.dueAt ? new Date(assignment.dueAt).toLocaleString('zh-CN') : '未设置截止时间'}</Hint>
    <Hint>{name} 状态：{assignment.submitted === null ? '尚未获取提交状态' : assignment.submitted ? '已提交' : '未提交'}</Hint>
    {preference?.localEdit&&<><Hint>当前使用本机临时安排。</Hint><Hint>平台原截止时间：{original?.dueAt?new Date(original.dueAt).toLocaleString():'未设置截止时间'}</Hint><Button title="恢复平台原文" secondary onPress={()=>editHomeworkLocal(assignment.id,null)}/></>}
    <Button dismiss title="临时编辑作业" secondary icon="create-outline" onPress={()=>setEditing(true)}/>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Checkbox checked={!preference?.temporaryDisabled} label="启用这份作业" onPress={()=>editHomeworkLocal(assignment.id,{},!!preference?.temporaryDisabled)}/><View style={{flex:1}}><Text style={{color:t.fg}}>启用这份作业</Text><Hint>临时禁用后不参与首页、提醒或 AI 安排，可在这里恢复。</Hint></View></View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Checkbox checked={completed} label={`${completed ? '取消完成' : '完成'}作业 ${assignment.title}`} onPress={() => toggleHomework(assignment.id)} /><Text style={{ color: t.fg }}>本机标记为已完成</Text></View>
    <Text translate={false} selectable style={{ color: t.fg, lineHeight: 24 }}>{(source==='zhixuemeng'?cleanZhixuemengDescription(assignment.description):assignment.description) || '暂无作业说明。'}</Text>
    <View style={{ gap: 12 }}><Text style={{ color: t.fg, fontSize: 14, fontWeight: '600' }}>在 To-do 中显示</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{([['default','跟随默认'],['show','显示'],['hide','隐藏']] as const).map(([value,title]) => <Pill key={value} title={title} selected={visibility === value} onPress={() => setHomeworkPreference(assignment.id, { visibility: value })} />)}</View><Hint>{homeworkVisible(assignment, data.settings, preference) ? '当前显示在 To-do 中。' : '当前不显示在 To-do 中。'}{!data.settings.showHomeworkInTodo ? '全局总开关已关闭，可在“我的 → 作业显示设置”开启。' : ''}</Hint></View>
    <Hint>本机的完成勾选不会提交、修改或删除平台作业。</Hint>
    <Hint>{assignment.dueAt ? '启用显示后，从开始日到截止日每天显示同一份作业，各天的完成状态联动。' : '无截止时间的作业启用后，从开始日起持续显示；可随时隐藏或删除。'}</Hint>
    {!!error && <Hint error>{error}</Hint>}
  </Sheet>;
}
