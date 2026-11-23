import React, { useMemo, useState } from 'react';
import {Linking,Platform,View,type ImageStyle,type TextStyle} from 'react-native';
import Text from './LocalizedText';

import { Renderer, useMarkdown, type MarkedStyles } from 'react-native-marked';
import { useTheme } from './theme';
import { Hint } from './components';

class ChatRenderer extends Renderer {
  constructor(private readonly onError: () => void) { super({ selectable: true }); }
  heading(children: string | React.ReactNode[], styles?: TextStyle) {
    return <Text key={this.getKey()} accessibilityRole="header" selectable style={styles}>{children}</Text>;
  }
  link(children: string | React.ReactNode[], href: string, styles?: TextStyle, title?: string) {
    const allowed = /^(https?:\/\/|mailto:)/i.test(href);
    return <Text key={this.getKey()} selectable accessibilityRole={allowed ? 'link' : undefined} accessibilityLabel={title || href} style={styles} onPress={allowed ? () => { void Linking.openURL(href).catch(this.onError); } : undefined}>{children}</Text>;
  }
  // This conversation is text-only: keep image descriptions without fetching remote images.
  image(uri: string, alt?: string, _styles?: ImageStyle, title?: string) {
    return this.link(alt || title || '查看图片', uri);
  }
}

export default function MarkdownMessage({ content }: { content: string }) {
  const t = useTheme(), [linkError, setLinkError] = useState(false);
  const renderer = useMemo(() => new ChatRenderer(() => setLinkError(true)), []);
  const theme = useMemo(() => ({ colors: { text: t.fg, link: t.accent, code: t.soft, border: t.line } }), [t.fg, t.accent, t.soft, t.line]);
  const styles = useMemo<MarkedStyles>(() => {
    const text = { fontSize: 13, lineHeight: 23, color: t.fg };
    const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
    return {
      text, strong: { ...text, fontWeight: '700' }, em: text, strikethrough: text, li: text,
      paragraph: { paddingVertical: 4, minWidth: 0 },
      h1: { fontSize: 23, lineHeight: 31, fontWeight: '700', borderBottomWidth: 0, marginVertical: 8 },
      h2: { fontSize: 20, lineHeight: 28, fontWeight: '700', borderBottomWidth: 0, marginVertical: 7 },
      h3: { fontSize: 17, lineHeight: 25, fontWeight: '700', marginVertical: 6 },
      h4: { fontSize: 15, lineHeight: 23, fontWeight: '700' },
      h5: { fontSize: 14, lineHeight: 22, fontWeight: '700' },
      h6: { fontSize: 13, lineHeight: 22, fontWeight: '700' },
      link: { ...text, color: t.accent, fontStyle: 'normal', textDecorationLine: 'underline' },
      blockquote: { borderLeftWidth: 3, borderLeftColor: t.accent, paddingLeft: 12, marginVertical: 7, backgroundColor: t.soft, borderRadius: 4, opacity: 1 },
      code: { padding: 12, borderRadius: 12, backgroundColor: t.soft },
      codeText: { ...text, fontFamily: mono, fontSize: 12 },
      codespan: { ...text, fontFamily: mono, fontSize: 12, fontStyle: 'normal', fontWeight: '400', backgroundColor: t.soft },
      table: { borderColor: t.line, borderWidth: 1 }, tableCell: { padding: 9 },
    };
  }, [t.fg, t.accent, t.line, t.soft]);
  // Native Views inside the existing chat ScrollView avoid nested virtualized lists.
  const elements = useMarkdown(content, { renderer, theme, styles, colorScheme: t.dark ? 'dark' : 'light' });
  return <View testID="markdown-message" style={{ minWidth: 0, maxWidth: '100%', alignSelf: 'stretch' }}>{elements}{linkError && <Hint error>无法打开链接，请检查设备设置。</Hint>}</View>;
}
