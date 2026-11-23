import React, { useEffect,useRef,useState } from 'react';
import {Switch,View} from 'react-native';
import Text from './LocalizedText';

import { useStore } from '../state/store';
import { listCanvasSessionTokens } from '../services/platform-auth';
import { WebSessionError,type CanvasTokenOption } from '../services/web-session';
import { DEMO_MODE, demoDelay } from '../services/demo-mode';
import { Button, Checkbox, Hint, Pill, Sheet } from './components';
import { useTheme } from './theme';
import TongjiLoginSheet from './TongjiLoginSheet';
import {useSheetDismiss} from './useSheetDismiss';
export default function CanvasRenewalSheet({ onClose }: { onClose: () => void }) {
  const {closeRef,dismiss}=useSheetDismiss(onClose);
  const store = useStore(), t = useTheme(), config = store.data.canvas.renewal;
  const [visible, setVisible] = useState(true), [tokens, setTokens] = useState<CanvasTokenOption[]>([]), [selected, setSelected] = useState<CanvasTokenOption | null>(null);
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [loginSettings,setLoginSettings]=useState(false),alive=useRef(true),readRequest=useRef<AbortController|null>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;readRequest.current?.abort(new WebSessionError('cancelled'));};},[]);
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(''); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : '操作失败。'); } finally { setBusy(false); } };
  const read = () => {if(readRequest.current)return;readRequest.current=new AbortController();setError('');setBusy(true);dismiss(()=>{setVisible(false);void readTokens(readRequest.current!);});};
  const readTokens = async (request:AbortController) => {
    let cancelled=false;
    try {
      await new Promise(resolve => setTimeout(resolve, 350));
      if(!alive.current||request.signal.aborted)return;
      const values = DEMO_MODE ? (await demoDelay(), [{ id: '101', accountId: '10001', purpose: 'TJMuse 专用令牌（演示）' }]) : await listCanvasSessionTokens(request.signal);
      if(!alive.current||readRequest.current!==request)return;
      setTokens(values); setSelected(null); setConsent(false);
      if (!values.length) setError('尚未找到令牌，请先在官方设置页创建一枚 TJMuse 专用令牌。');
    } catch (e) {cancelled=e instanceof WebSessionError&&e.code==='cancelled';if(!alive.current)return;if(cancelled)onClose();else setError(e instanceof Error ? e.message : '无法读取令牌列表。'); }
    finally {if(readRequest.current===request)readRequest.current=null;if(alive.current){if(!cancelled)setVisible(true);setBusy(false);}}
  };
  if(loginSettings)return <TongjiLoginSheet onClose={onClose}/>;
  return <Sheet closeRef={closeRef} visible={visible} title="Canvas 自动更换令牌" onClose={onClose}>
    <Hint>{DEMO_MODE ? '演示使用示例令牌，不连接学校、不修改真实凭据。' : '先在官方页面登录一次，再选择仅供 TJMuse 使用的专用令牌。可选用本机学号密码自动登录。'}</Hint>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{color:t.fg}}>自动更换令牌</Text><Switch accessibilityLabel="自动更换令牌开关" value={config?.enabled===true} disabled={busy||store.renewalBusy} onValueChange={enabled=>{if(enabled)void read();else void run(store.disableCanvasRenewal);}} trackColor={{false:t.line,true:t.accent}}/></View>
    <Button title="读取并选择专用令牌" secondary disabled={busy||store.renewalBusy} onPress={()=>{void read();}}/>
    <Button dismiss title="学校自动登录" secondary disabled={busy||store.renewalBusy} onPress={()=>setLoginSettings(true)}/>
    <View style={{ backgroundColor: t.soft, padding: 16, borderRadius: 18, gap: 8 }}><Text style={{ color: t.fg, fontWeight: '600' }}>{config?.enabled ? '自动更换已开启' : '自动更换未开启'}</Text>
      {config?.purpose && <Hint>{config.purpose}</Hint>}
      {config?.lastRotated && <Hint>上次更换：{new Date(config.lastRotated).toLocaleString('zh-CN')}</Hint>}
      {config?.enabled && <Hint>自动保持登录已开启 · 启动、回到前台及运行中定期检查</Hint>}
      {config?.lastSessionCheck && <Hint>上次登录检查：{new Date(config.lastSessionCheck).toLocaleString('zh-CN')}</Hint>}
      {!!config?.message && <Hint error>{config.message}</Hint>}
    </View>

    {!!tokens.length && <View style={{ gap: 10 }}><Text style={{ color: t.fg, fontWeight: '600' }}>选择 TJMuse 专用令牌</Text>{tokens.map(token => <Pill key={token.id} title={token.purpose} selected={selected?.id === token.id} onPress={() => { setSelected(token); setConsent(false); }} />)}</View>}
    {!!selected && <><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Checkbox checked={consent} onPress={() => setConsent(v => !v)} label="同意自动重新生成所选专用令牌" /><Text style={{ flex: 1, color: t.fg, fontSize: 13, lineHeight: 20 }}>我同意自动重新生成所选专用令牌</Text></View><Hint>重新生成后旧值立即失效，请勿选择其他软件正在使用的令牌。</Hint><Button title="启用自动更换" disabled={!consent} busy={busy || store.renewalBusy} onPress={() => { void run(async () => { await store.enableCanvasRenewal(selected); setTokens([]); setSelected(null); setConsent(false); }); }} /></>}
    <Hint>通过同济 IAM 统一认证保持连接。每次打开或返回 App 自动同步作业；运行时约每 10 分钟维护会话，令牌约每 30 分钟更换。开启学号自动登录后可恢复认证，验证码或二次验证需手动完成。关闭或挂起 App 后不保证维护。</Hint>
    {!!error && <Hint error>{error}</Hint>}
  </Sheet>;
}
