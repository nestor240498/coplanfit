import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/** Mockup (sheets "Agregar a la ficha" / "Agregar comida" / etc.): overlay navy + hoja blanca 20px arriba. */
export function BottomSheet({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + s(18) }]} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type FooterProps = {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
};

/** Fila "Cancelar / acción" que cierra casi todas las hojas del mockup. */
export function SheetFooter({ onCancel, onConfirm, confirmLabel, confirmDisabled }: FooterProps) {
  return (
    <View style={styles.footer}>
      <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onConfirm}
        disabled={confirmDisabled}
        style={[styles.confirmBtn, confirmDisabled && styles.confirmBtnDisabled]}
      >
        <Text style={styles.confirmText}>{confirmLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,32,61,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: s(18),
    gap: s(8),
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: s(14),
    color: colors.navy,
    marginBottom: s(2),
  },
  footer: {
    flexDirection: 'row',
    gap: s(8),
    marginTop: s(6),
  },
  cancelBtn: {
    flex: 1,
    height: s(36),
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(10),
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    height: s(36),
    borderRadius: radius.button,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(10),
    color: colors.navy,
  },
});
