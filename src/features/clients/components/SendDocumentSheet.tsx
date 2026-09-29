import * as Linking from 'expo-linking';
import { Download, MessageCircle, Send } from 'lucide-react-native';
import { ReactNode, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';
import { DocumentToDeliver, downloadDocument, sendDocument } from '../sentLogRepository';

type Props = {
  visible: boolean;
  onClose: () => void;
  document: DocumentToDeliver | null;
  clientName: string;
  /** Teléfono internacional solo con dígitos (clients.phone); habilita abrir el chat de WhatsApp. */
  clientPhone?: string | null;
  /** Opciones extra del documento (p. ej. el interruptor de fotos). */
  children?: ReactNode;
  /** Tras enviarlo (para refrescar el historial de envíos). */
  onSent?: () => void;
};

type Action = 'send' | 'download' | 'chat';

export function SendDocumentSheet({ visible, onClose, document, clientName, clientPhone, children, onSent }: Props) {
  const [busy, setBusy] = useState<Action | null>(null);
  const firstName = clientName.split(' ')[0] || clientName;

  async function run(action: Action) {
    if (!document) return;
    setBusy(action);
    try {
      if (action === 'send') {
        await sendDocument(document, clientName);
        onSent?.();
        onClose();
      } else if (action === 'download') {
        await downloadDocument(document);
      } else if (clientPhone) {
        const text = `Hola ${firstName}, te envío tu ${document.label.toLowerCase()}.`;
        await Linking.openURL(`https://wa.me/${clientPhone}?text=${encodeURIComponent(text)}`);
      }
    } catch (e) {
      Alert.alert('No se pudo completar', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function option(action: Action, Icon: typeof Send, title: string, description: string, primary = false) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => run(action)}
        disabled={busy !== null}
        style={[styles.option, primary && styles.optionPrimary, busy !== null && busy !== action && styles.dimmed]}
      >
        {busy === action ? (
          <ActivityIndicator size="small" color={colors.navy} />
        ) : (
          <Icon size={s(18)} color={colors.navy} />
        )}
        <View style={styles.texts}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={document?.label ?? 'Documento'}>
      {children ? <View style={styles.extra}>{children}</View> : null}

      {option(
        'send',
        Send,
        `Enviar a ${firstName}`,
        'Elige WhatsApp, correo u otra app para mandarle el PDF. Quedará anotado en el historial de envíos.',
        true
      )}
      {option('download', Download, 'Descargar o imprimir', 'Guarda el PDF en el dispositivo sin marcarlo como enviado.')}
      {clientPhone ? (
        option('chat', MessageCircle, `Abrir chat de WhatsApp con ${firstName}`, 'Con un mensaje listo para avisarle.')
      ) : (
        <Text style={styles.hint}>
          Añade el teléfono de {firstName} en su ficha para abrir su chat de WhatsApp directamente.
        </Text>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  extra: { marginBottom: s(10) },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    minHeight: 60,
    padding: s(12),
    marginBottom: s(8),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionPrimary: { borderColor: colors.lime, backgroundColor: colors.successBg },
  dimmed: { opacity: 0.5 },
  texts: { flex: 1, gap: s(2) },
  title: { fontFamily: fonts.bodyBold, fontSize: fontSizes.sm, color: colors.navy },
  description: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: s(4) },
});
