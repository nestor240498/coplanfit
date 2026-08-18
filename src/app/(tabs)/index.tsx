import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { AppBackground } from '@/components/ui/AppBackground';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FAB } from '@/components/ui/FAB';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { listClients } from '@/features/clients/repository';
import { Client } from '@/features/clients/types';
import { formatDateShort, formatGoal } from '@/lib/format';
import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

// TODO: leer el límite del paquete de suscripción cuando exista esa tabla
const PLAN_LIMIT = 10;

/**
 * Pantalla Clientes:
 * - Header navy con badge centrado de clientes.
 * - Tarjetas con avatar con foto, nombre, objetivo, plan vigente y últimas medidas.
 * - FAB "+" para crear nuevo cliente.
 */
export default function ClientsScreen() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    let cancelled = false;
    setError(null);
    listClients()
      .then((data) => {
        if (!cancelled) setClients(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Refresca al volver de "Nuevo cliente" o de la ficha
  useFocusEffect(load);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!clients) return [];
    if (!q) return clients;
    return clients.filter((c) => c.full_name.toLowerCase().includes(q));
  }, [clients, query]);

  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader title="Clientes" right={<Badge label={`${clients?.length ?? '–'}/${PLAN_LIMIT}`} />} />

      <View style={styles.body}>
        <Input
          placeholder="Buscar cliente…"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
          autoCapitalize="none"
        />

        {clients === null && error === null && <ActivityIndicator style={styles.spinner} color={colors.navy} />}

        {error !== null && (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>No se pudieron cargar los clientes: {error}</Text>
            <Button title="Reintentar" variant="secondary" onPress={load} />
          </View>
        )}

        {clients !== null && error === null && (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>
                  {query
                    ? 'Ningún cliente coincide con la búsqueda.'
                    : 'Aún no tienes clientes. Crea el primero con el botón +.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => <ClientRow client={item} onPress={() => router.push(`/client/${item.id}`)} />}
          />
        )}
      </View>

      <FAB accessibilityLabel="Nuevo cliente" onPress={() => router.push('/client/new')} />
    </View>
  );
}

function ClientRow({ client, onPress }: { client: Client; onPress: () => void }) {
  const goalLabel = client.goal ? formatGoal(client.goal) : 'Sin objetivo';
  const planLabel = client.current_plan_version != null ? `v${client.current_plan_version} vigente` : 'Sin plan aún';

  // Últimas medidas formateadas: solo la fecha
  const m = client.latest_measurement;
  const measuresLabel = m?.measured_at ? formatDateShort(m.measured_at) : 'Sin mediciones aún';

  const initials = client.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <Card onPress={onPress} style={styles.row}>
      <View style={styles.avatar}>
        {client.avatar_url ? (
          <Image source={{ uri: client.avatar_url }} style={styles.avatarImage} contentFit="cover" />
        ) : (
          <Text style={styles.avatarInitials}>{initials || 'C'}</Text>
        )}
      </View>
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {client.full_name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={styles.metaHighlight}>Objetivo:</Text> {goalLabel}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={styles.metaHighlight}>Plan:</Text> {planLabel}
        </Text>
        <Text style={styles.measuresText} numberOfLines={1}>
          <Text style={styles.metaHighlight}>Últ. medidas:</Text> {measuresLabel}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: {
    flex: 1,
    paddingHorizontal: s(16),
    paddingTop: s(16),
    gap: s(8),
  },
  search: {
    height: s(36),
    borderRadius: s(9),
    paddingHorizontal: s(12),
    fontSize: fontSizes.sm,
  },
  spinner: { marginTop: s(24) },
  list: { gap: s(8), paddingTop: s(4), paddingBottom: s(80) },
  messageBox: {
    marginTop: s(20),
    gap: s(12),
    alignItems: 'center',
  },
  messageText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: s(15),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    padding: s(10),
  },
  avatar: {
    width: s(42),
    height: s(42),
    borderRadius: s(21),
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  rowText: { flex: 1, flexDirection: "column", gap: s(2) },
  name: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: s(8),
    color: colors.textSecondary,
  },
  metaHighlight: {
    fontFamily: fonts.bodySemi,
    color: colors.navy,
  },
  measuresText: {
    fontFamily: fonts.body,
    fontSize: s(8),
    color: colors.textMuted,
  },
});
