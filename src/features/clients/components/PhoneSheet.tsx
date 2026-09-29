import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet, SheetFooter } from '@/components/ui/BottomSheet';
import { joinPhone, splitPhone } from '@/lib/phone';
import { s } from '@/theme/scale';
import { PhoneField } from './PhoneField';

type Props = {
  visible: boolean;
  value: string | null | undefined;
  onClose: () => void;
  onSave: (phone: string | null) => Promise<void> | void;
};

export function PhoneSheet({ visible, value, onClose, onSave }: Props) {
  const [prefix, setPrefix] = useState(() => splitPhone(value).prefix);
  const [localNumber, setLocalNumber] = useState(() => splitPhone(value).localNumber);
  const [saving, setSaving] = useState(false);

  // Al reabrir, se parte del valor guardado (ajuste de estado durante el render, patrón de React)
  const [openedWith, setOpenedWith] = useState({ visible, value });
  if (openedWith.visible !== visible || openedWith.value !== value) {
    setOpenedWith({ visible, value });
    if (visible) {
      setPrefix(splitPhone(value).prefix);
      setLocalNumber(splitPhone(value).localNumber);
    }
  }

  const phone = joinPhone(prefix, localNumber);
  const error = localNumber.trim() && !phone ? 'Revisa el número: faltan o sobran dígitos.' : undefined;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(localNumber.trim() ? phone : null);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Teléfono del cliente">
      <View style={{ marginBottom: s(12) }}>
        <PhoneField
          prefix={prefix}
          localNumber={localNumber}
          onChangePrefix={setPrefix}
          onChangeLocalNumber={setLocalNumber}
          error={error}
        />
      </View>
      <SheetFooter
        onCancel={onClose}
        onConfirm={handleSave}
        confirmLabel="Guardar"
        confirmDisabled={Boolean(error)}
        confirmLoading={saving}
      />
    </BottomSheet>
  );
}
