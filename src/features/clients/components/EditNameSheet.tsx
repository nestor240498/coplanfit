import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Pencil } from 'lucide-react-native';

import { BottomSheet, SheetFooter } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { uploadClientAvatar } from '@/features/clients/repository';
import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type Props = {
  visible: boolean;
  clientId: string;
  initialName: string;
  initialAvatarUrl?: string | null;
  onClose: () => void;
  onSave: (data: { full_name: string; avatar_url?: string | null }) => Promise<void> | void;
};

/**
 * Drawer para editar los datos básicos del cliente (foto y nombre).
 */
export function EditNameSheet({
  visible,
  clientId,
  initialName,
  initialAvatarUrl,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permiso requerido',
        'Necesitas autorizar el acceso a tus fotos para cambiar la foto.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const url = await uploadClientAvatar(clientId, result.assets[0].uri);
      setAvatarUrl(url);
    } catch (e) {
      Alert.alert('Error al subir foto', (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (name.trim().length < 2) return;
    setSaving(true);
    try {
      await onSave({
        full_name: name.trim(),
        avatar_url: avatarUrl,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Editar cliente">
      <View style={styles.content}>
        {/* Avatar interactivo con lápiz */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cambiar foto de perfil del cliente"
          onPress={handlePickImage}
          disabled={uploading}
          style={styles.avatarWrapper}
        >
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <Text style={styles.avatarInitials}>{initials || 'C'}</Text>
            )}
          </View>

          <View style={styles.editBadge}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Pencil size={s(11)} color={colors.surface} strokeWidth={2.5} />
            )}
          </View>
        </Pressable>

        <Text style={styles.avatarHint}>Toca para cambiar la foto</Text>

        <Input
          label="Nombre completo"
          value={name}
          onChangeText={setName}
          placeholder="Nombre del cliente"
          containerStyle={styles.inputContainer}
        />
      </View>

      <SheetFooter
        onCancel={onClose}
        onConfirm={handleSave}
        confirmLabel="Guardar"
        confirmDisabled={name.trim().length < 2 || saving || uploading}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: s(10),
    paddingBottom: s(8),
    width: '100%',
  },
  inputContainer: {
    width: '100%',
  },
  avatarWrapper: {
    position: 'relative',
    marginTop: s(4),
  },
  avatar: {
    width: s(68),
    height: s(68),
    borderRadius: s(34),
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.base,
    color: colors.textSecondary,
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: s(22),
    height: s(22),
    borderRadius: s(11),
    backgroundColor: colors.navy,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontFamily: fonts.body,
    fontSize: s(9),
    color: colors.textMuted,
    marginTop: -s(4),
  },
});

