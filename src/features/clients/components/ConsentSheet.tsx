import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { SingleChoice } from '@/features/workouts/components/ExerciseFormControls';
import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights } from '@/theme/typography';

import { CONSENT_METHODS, type ConsentMethod } from '../types';

type Props = {
  visible: boolean;
  onClose: () => void;
  current: ConsentMethod | null;
  /** `null` quita el registro. */
  onSave: (method: ConsentMethod | null) => Promise<void> | void;
};

/** Anota que el cliente aceptó que se guarden y envíen sus datos de salud (lo declara el entrenador). */
export function ConsentSheet({ visible, onClose, current, onSave }: Props) {
  const [method, setMethod] = useState<ConsentMethod | null>(current);
  const [saving, setSaving] = useState(false);

  async function save(next: ConsentMethod | null) {
    setSaving(true);
    try {
      await onSave(next);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Consentimiento del cliente">
      <View style={styles.body}>
        <Text style={styles.text}>
          Confirma que el cliente aceptó que guardes y le envíes sus datos de salud (medidas, fotos, alergias). Se anota la fecha de hoy. Es
          una declaración tuya: CoplanFit no la verifica.
        </Text>
        <Text style={styles.label}>¿Cómo lo aceptó?</Text>
        <SingleChoice<ConsentMethod> options={CONSENT_METHODS} value={method} onChange={setMethod} />
        <Button title="Guardar" onPress={() => method && save(method)} disabled={!method} loading={saving} />
        {current ? <Button title="Quitar el registro" variant="ghost" onPress={() => save(null)} disabled={saving} /> : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: s(12), paddingBottom: s(8) },
  text: { fontFamily: fonts.body, fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.textSecondary },
  label: { fontFamily: fonts.bodySemi, fontSize: fontSizes.sm, color: colors.text },
});
