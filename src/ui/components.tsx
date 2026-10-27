import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from './theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const t = useTheme(); return <Ionicons name={name} size={size} color={color || t.fg} />;
}
export function Tap({ children, onPress, label, style, disabled = false }: { children: React.ReactNode; onPress: () => void; label: string; style?: ViewStyle | ViewStyle[]; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [style, { opacity: disabled ? .4 : pressed ? .65 : 1 }]}>{children}</Pressable>;
}
export function IconButton({ icon, onPress, label, color, style }: { icon: IconName; onPress: () => void; label: string; color?: string; style?: ViewStyle }) {
  return <Tap label={label} onPress={onPress} style={[styles.iconButton, style || {}]}><Icon name={icon} color={color} size={21} /></Tap>;
}
export function Button({ title, onPress, icon, secondary, busy, disabled }: { title: string; onPress: () => void; icon?: IconName; secondary?: boolean; busy?: boolean; disabled?: boolean }) {
  const t = useTheme(); return <Tap label={title} onPress={onPress} disabled={busy || disabled} style={[styles.button, { backgroundColor: secondary ? t.soft : t.accent }]}>
    {busy ? <ActivityIndicator color={secondary ? t.accent : t.onAccent} /> : icon ? <Icon name={icon} size={19} color={secondary ? t.accent : t.onAccent} /> : null}
    <Text style={{ fontSize: 15, fontWeight: '600', color: secondary ? t.accent : t.onAccent }}>{title}</Text>
  </Tap>;
}
export function Checkbox({ checked, onPress, label, color }: { checked: boolean; onPress: () => void; label: string; color?: string }) {
  const t = useTheme(); return <Tap label={label} onPress={() => { if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {}); onPress(); }} style={{ padding: 8, marginLeft: -4 }}>
    <View accessibilityRole="checkbox" accessibilityState={{ checked }} style={{ width: 23, height: 23, borderRadius: 8, borderWidth: 1.5, borderColor: checked ? t.accent : color || t.line, backgroundColor: checked ? t.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {checked && <Icon name="checkmark" color={t.onAccent} size={16} />}
    </View>
  </Tap>;
}
export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  const t = useTheme(); return <View style={{ gap: 8 }}>
    {label && <Text style={{ color: t.muted, fontSize: 12, fontWeight: '600', marginLeft: 2 }}>{label}</Text>}
    <TextInput accessibilityLabel={label || props.placeholder} placeholderTextColor={t.muted} {...props} style={[styles.field, { backgroundColor: t.surface, color: t.fg, borderColor: t.line }, props.multiline && { minHeight: 88, textAlignVertical: 'top' }, style]} />
  </View>;
}
export function Pill({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
  const t = useTheme(); return <Tap onPress={onPress} label={title} style={{ paddingHorizontal: 16, paddingVertical: 11, borderRadius: 16, backgroundColor: selected ? t.accent : t.surface, borderWidth: 1, borderColor: selected ? t.accent : t.line }}>
    <Text style={{ color: selected ? t.onAccent : t.muted, fontSize: 13, fontWeight: '600' }}>{title}</Text>
  </Tap>;
}
export function Sheet({ visible, title, subtitle, onClose, children, footer }: { visible: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  const t = useTheme(); return <Modal visible={visible} animationType="slide" transparent={Platform.OS === 'web'} presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'} onRequestClose={onClose}>
    <View style={[{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#14231B55' : t.bg, justifyContent: 'flex-end' }, Platform.OS === 'web' && { alignItems: 'center' }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[{ flex: 1, width: '100%', backgroundColor: t.bg }, Platform.OS === 'web' && { maxWidth: 560, maxHeight: '92%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }]}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 5 }}><Text style={{ fontSize: 26, fontWeight: '700', color: t.fg, letterSpacing: -.8 }}>{title}</Text>{subtitle && <Text style={{ color: t.muted, fontSize: 12 }}>{subtitle}</Text>}</View>
            <IconButton icon="close" label="关闭" onPress={onClose} style={{ backgroundColor: t.soft, borderRadius: 24 }} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 28, gap: 20 }} showsVerticalScrollIndicator={false}>{children}</ScrollView>
          {footer && <SafeAreaView edges={['bottom']} style={{ padding: 20, paddingBottom: Platform.OS === 'web' ? 24 : 8, borderTopWidth: 1, borderColor: t.line, backgroundColor: t.bg }}>{footer}</SafeAreaView>}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  </Modal>;
}
export function Fab({ onPress, label = '添加 To-do', small = false }: { onPress: () => void; label?: string; small?: boolean }) {
  const t = useTheme(); return <Tap onPress={onPress} label={label} style={{ width: small ? 42 : 58, height: small ? 42 : 58, borderRadius: Platform.OS === 'android' ? 20 : 30, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent, borderWidth: 1, borderColor: '#FFFFFF33', boxShadow: '0px 6px 18px #203B272B' }}><Icon name="add" size={small ? 24 : 31} color={t.onAccent} /></Tap>;
}
export function Hint({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  const t = useTheme(); return <Text accessibilityRole={error ? 'alert' : undefined} style={{ color: error ? '#BE524F' : t.muted, fontSize: 12, lineHeight: 20 }}>{children}</Text>;
}
export function ConfirmSheet({ visible, title, description, onClose, onConfirm }: { visible: boolean; title: string; description: string; onClose: () => void; onConfirm: () => void }) {
  return <Sheet visible={visible} title={title} onClose={onClose} footer={<Button title="确认" onPress={() => { onConfirm(); onClose(); }} />}><Hint>{description}</Hint></Sheet>;
}
const styles = StyleSheet.create({
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 50, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18 },
  field: { minHeight: 52, borderRadius: 17, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, lineHeight: 22 },
});
