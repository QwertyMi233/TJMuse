import React, { useState } from 'react';
import { View } from 'react-native';
import type { FlexibleTask } from '../core/types';
import { uid } from '../core/defaults';
import { useStore } from '../state/store';
import { Button, ConfirmSheet, Field, Hint, IconButton, Sheet } from './components';
import {useSheetDismiss} from './useSheetDismiss';
import PriorityFields from './PriorityFields';
export default function FlexibleEditor({ task, onClose }: { task?: FlexibleTask; onClose: () => void }) {
  const {closeRef,dismiss}=useSheetDismiss(onClose);
  const { saveFlexible, deleteFlexible } = useStore();
  const [title, setTitle] = useState(task?.title || ''), [description, setDescription] = useState(task?.description || ''), [error, setError] = useState(''), [confirm, setConfirm] = useState(false);
  const [important,setImportant]=useState(task?.important===true),[urgent,setUrgent]=useState(task?.urgent===true);
  return <Sheet visible closeRef={closeRef} title={task ? '编辑自由事项' : '留一个小心愿'} subtitle="不设截止时间，交给合适的空闲。" onClose={onClose} footer={<View style={{ flexDirection: 'row', gap: 12 }}>{task && <IconButton label="删除自由事项" icon="trash-outline" color="#BD5C5C" onPress={() => setConfirm(true)} />}<View style={{ flex: 1 }}><Button title={task ? '保存更改' : '确认添加'} icon="checkmark" onPress={() => { if (!title.trim()) return setError('请填入 To-do 名称。'); dismiss(()=>{saveFlexible({ id: task?.id || uid(), title: title.trim(), description: description.trim(), completed: task?.completed || false, important, urgent });onClose();}); }} /></View></View>}>
    <Field label="TO-DO 名称" placeholder="一直想做的一件事…" value={title} onChangeText={setTitle} maxLength={100} />
    <PriorityFields important={important} urgent={urgent} onImportant={setImportant} onUrgent={setUrgent}/>
    <Field label="描述" placeholder="关于它的想法（可选）" value={description} onChangeText={setDescription} multiline maxLength={2000} />
    <Hint>可以在对话中请 AI 添加小事，也可手动填写。自由事项独立保存在 AI 页，不会自动写入固定日程。</Hint>
    {!!error && <Hint error>{error}</Hint>}
    <ConfirmSheet visible={confirm} title="删除这件事？" description="该自由事项会被删除。" onClose={() => setConfirm(false)} onConfirm={() => { dismiss(()=>{deleteFlexible(task!.id);onClose();}); }} />
  </Sheet>;
}
