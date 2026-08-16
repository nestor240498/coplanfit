import { useFocusEffect } from 'expo-router';
import { Check, Sparkles, Zap } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { listClients } from '@/features/clients/repository';
import { s } from '@/theme/scale';
import { colors, radius } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export type PlanId = 'basico' | 'medium' | 'pro';

export type SubscriptionPlan = {
  id: PlanId;
  name: string;
  clientLimit: number;
  priceMonth: number;
  priceLabel: string;
  tagline: string;
  popular?: boolean;
  features: string[];
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basico',
    name: 'Básico',
    clientLimit: 10,
    priceMonth: 7,
    priceLabel: '$7/mes',
    tagline: 'Ideal para entrenadores que inician',
    features: [
      'Hasta 10 asesorados activos',
      'Generador de planes con IA',
      'Exportación de PDF profesional',
      'Fichas de salud y antropometría',
    ],
  },
  {
    id: 'medium',
    name: 'Medium',
    popular: true,
    clientLimit: 20,
    priceMonth: 12,
    priceLabel: '$12/mes',
    tagline: 'Para entrenadores en crecimiento',
    features: [
      'Hasta 20 asesorados activos',
      'Generación de planes con IA',
      'Comparador de versiones de plan',
      'Logo y marca personalizada en PDF',
      'Histórico de mediciones corporales',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    clientLimit: 50,
    priceMonth: 25,
    priceLabel: '$25/mes',
    tagline: 'Para alto volumen y entrenadores consolidados',
    features: [
      'Hasta 50 asesorados activos',
      'Generación de planes con IA sin límites',
      'Prioridad en procesamiento de IA',
      'Branding completo en PDFs y reportes',
      'Soporte prioritario',
    ],
  },
];

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const [activePlanId, setActivePlanId] = useState<PlanId>('basico');
  const [modalVisible, setModalVisible] = useState(false);
  const [clientCount, setClientCount] = useState(1);

  useFocusEffect(
    useCallback(() => {
      listClients()
        .then((clients) => setClientCount(clients.length))
        .catch(() => {});
    }, [])
  );

  const activePlan = SUBSCRIPTION_PLANS.find((p) => p.id === activePlanId) ?? SUBSCRIPTION_PLANS[0];
  const usagePct = Math.min(100, Math.round((clientCount / activePlan.clientLimit) * 100));

  function handleSelectPlan(plan: SubscriptionPlan) {
    if (plan.id === activePlanId) {
      setModalVisible(false);
      return;
    }

    if (clientCount > plan.clientLimit) {
      Alert.alert(
        'Límite de asesorados',
        `Tienes ${clientCount} asesorados registrados. Para cambiar al plan ${plan.name} debes tener como máximo ${plan.clientLimit} asesorados.`
      );
      return;
    }

    setActivePlanId(plan.id);
    setModalVisible(false);
    Alert.alert(
      'Plan actualizado',
      `¡Has cambiado al plan ${plan.name} (${plan.priceLabel}) exitosamente!`
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Suscripción" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tarjeta del plan actual */}
        <View style={styles.packageCard}>
          <View style={styles.packageRow}>
            <View style={{ gap: 2 }}>
              <View style={styles.badgeNameRow}>
                <Text style={styles.packageName}>Plan {activePlan.name}</Text>
                {activePlan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>POPULAR</Text>
                  </View>
                )}
              </View>
              <Text style={styles.packageSubtitle}>{activePlan.tagline}</Text>
            </View>
            <Text style={styles.packagePrice}>{activePlan.priceLabel}</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(6, usagePct)}%` }]} />
          </View>

          <View style={styles.usageFooter}>
            <Text style={styles.usageText}>
              {clientCount} de {activePlan.clientLimit} asesorados activos
            </Text>
            <Text style={styles.usagePctText}>{usagePct}% utilizado</Text>
          </View>
        </View>

        {/* Caja de próximo cobro */}
        <View style={styles.chargeBox}>
          <View style={{ gap: 2 }}>
            <Text style={styles.chargeLabel}>Próxima renovación</Text>
            <Text style={styles.chargeDate}>El 15 del próximo mes</Text>
          </View>
          <View style={styles.chargeStatusBadge}>
            <Text style={styles.chargeDays}>Activa</Text>
          </View>
        </View>

        {/* Método de pago */}
        <View style={styles.paymentRow}>
          <View style={{ gap: 2 }}>
            <Text style={styles.paymentText}>Tarjeta de crédito / débito</Text>
            <Text style={styles.paymentSub}>Facturación mensual automática</Text>
          </View>
          <Text style={styles.paymentStatus}>•••• 4821</Text>
        </View>

        {/* Beneficios incluidos */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresCardTitle}>BENEFICIOS INCLUIDOS EN TU PLAN</Text>
          {activePlan.features.map((feat, idx) => (
            <View key={idx} style={styles.featureRow}>
              <View style={styles.checkWrap}>
                <Check size={s(12)} color={colors.lime} strokeWidth={3} />
              </View>
              <Text style={styles.featureText}>{feat}</Text>
            </View>
          ))}
        </View>

        {/* CTA para cambiar o subir de plan */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setModalVisible(true)}
          style={styles.upgradeCta}
        >
          <Zap size={s(14)} color={colors.navy} />
          <Text style={styles.upgradeCtaText}>Cambiar o subir de paquete</Text>
        </Pressable>
      </ScrollView>

      {/* Modal / Sheet con los planes disponibles */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              { paddingBottom: insets.bottom + s(0) },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Tirador visual */}
            <View style={styles.sheetHandleWrap}>
              {/* <View style={styles.sheetHandle} /> */}
            </View>

            {/* Header del Modal */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, gap: 2, paddingRight: s(8) }}>
                <Text style={styles.modalTitle}>Planes de CoplanFit</Text>
                <Text style={styles.modalSubtitle}>
                  Selecciona el paquete que mejor se adapte a tu volumen de asesorados
                </Text>
              </View>
            </View>

            {/* Lista de planes */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.plansList}
            >
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isSelected = plan.id === activePlanId;

                return (
                  <View
                    key={plan.id}
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardActive,
                      plan.popular && !isSelected && styles.planCardPopular,
                    ]}
                  >
                    {plan.popular && (
                      <View style={styles.planBadgeRibbon}>
                        <Sparkles size={s(10)} color={colors.navy} />
                        <Text style={styles.planBadgeRibbonText}>MÁS ELEGIDO</Text>
                      </View>
                    )}

                    <View style={styles.planCardHeader}>
                      <View>
                        <Text style={styles.planCardName}>{plan.name}</Text>
                        <Text style={styles.planCardLimit}>
                          Hasta {plan.clientLimit} asesorados
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.planCardPrice}>{plan.priceLabel}</Text>
                        <Text style={styles.planCardPeriod}>Facturado mensual</Text>
                      </View>
                    </View>

                    <Text style={styles.planCardTagline}>{plan.tagline}</Text>

                    <View style={styles.planDivider} />

                    <View style={styles.planFeatures}>
                      {plan.features.map((f, i) => (
                        <View key={i} style={styles.planFeatureItem}>
                          <Check size={s(11)} color={colors.lime} strokeWidth={3} />
                          <Text style={styles.planFeatureText}>{f}</Text>
                        </View>
                      ))}
                    </View>

                    <Button
                      title={isSelected ? 'Plan actual' : `Elegir plan ${plan.name}`}
                      variant={isSelected ? 'secondary' : 'primary'}
                      onPress={() => handleSelectPlan(plan)}
                      disabled={isSelected}
                      style={{ marginTop: s(10) }}
                    />
                  </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  body: {
    flexGrow: 1,
    padding: s(16),
    gap: s(10),
    paddingBottom: s(40),
  },
  packageCard: {
    backgroundColor: colors.surface,
    borderRadius: s(12),
    padding: s(14),
    gap: s(10),
    borderWidth: 1,
    borderColor: colors.border,
  },
  packageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  packageName: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  popularBadge: {
    backgroundColor: colors.successBg,
    paddingVertical: 2,
    paddingHorizontal: s(6),
    borderRadius: radius.pill,
  },
  popularBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8),
    color: colors.success,
  },
  packageSubtitle: {
    fontFamily: fonts.body,
    fontSize: s(9.5),
    color: colors.textSecondary,
  },
  packagePrice: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.navy,
  },
  progressTrack: {
    height: s(7),
    borderRadius: s(4),
    backgroundColor: colors.neutralChipBg,
    overflow: 'hidden',
  },
  progressFill: {
    height: s(7),
    borderRadius: s(4),
    backgroundColor: colors.lime,
  },
  usageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(9.5),
    color: colors.text,
  },
  usagePctText: {
    fontFamily: fonts.body,
    fontSize: s(9.5),
    color: colors.textMuted,
  },
  chargeBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(12),
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chargeLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  chargeDate: {
    fontFamily: fonts.body,
    fontSize: s(9.5),
    color: colors.textSecondary,
  },
  chargeStatusBadge: {
    backgroundColor: colors.successBg,
    paddingVertical: s(3),
    paddingHorizontal: s(8),
    borderRadius: radius.pill,
  },
  chargeDays: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.label,
    color: colors.success,
  },
  paymentRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(12),
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentText: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  paymentSub: {
    fontFamily: fonts.body,
    fontSize: s(9.5),
    color: colors.textMuted,
  },
  paymentStatus: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.xs,
    color: colors.navy,
  },
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(12),
    borderWidth: 1,
    borderColor: colors.border,
    gap: s(6),
  },
  featuresCardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8.5),
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: s(2),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  checkWrap: {
    width: s(16),
    height: s(16),
    borderRadius: s(8),
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontFamily: fonts.body,
    fontSize: s(9.5),
    color: colors.textSecondary,
  },
  upgradeCta: {
    height: s(40),
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.navy,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    gap: s(6),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: s(6),
    marginBottom: s(12),
  },
  upgradeCtaText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(10),
    color: colors.navy,
  },

  /* Estilos del Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 32, 61, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: s(4),
    maxHeight: '88%',
    width: '100%',
    overflow: 'hidden',
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingVertical: s(6),
  },
  sheetHandle: {
    width: s(36),
    height: s(4),
    borderRadius: s(2),
    backgroundColor: '#CBD5E1',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(16),
    paddingBottom: s(10),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  modalSubtitle: {
    fontFamily: fonts.body,
    fontSize: s(9),
    color: colors.textSecondary,
  },
  closeBtn: {
    width: s(26),
    height: s(26),
    borderRadius: s(13),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plansList: {
    padding: s(16),
    gap: s(12),
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: s(14),
    borderWidth: 1.5,
    borderColor: colors.border,
    position: 'relative',
    gap: s(6),
  },
  planCardActive: {
    borderColor: colors.lime,
    backgroundColor: '#F8FCF3',
  },
  planCardPopular: {
    borderColor: colors.navy,
  },
  planBadgeRibbon: {
    position: 'absolute',
    top: s(-8),
    right: s(12),
    backgroundColor: colors.lime,
    paddingVertical: 2,
    paddingHorizontal: s(8),
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planBadgeRibbonText: {
    fontFamily: fonts.bodyBold,
    fontSize: s(8),
    color: colors.navy,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planCardName: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.base,
    color: colors.text,
  },
  planCardLimit: {
    fontFamily: fonts.bodyBold,
    fontSize: s(9.5),
    color: colors.navy,
    marginTop: 2,
  },
  planCardPrice: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.lg,
    color: colors.navy,
  },
  planCardPeriod: {
    fontFamily: fonts.body,
    fontSize: s(8.5),
    color: colors.textMuted,
  },
  planCardTagline: {
    fontFamily: fonts.body,
    fontSize: s(8),
    color: colors.textSecondary,
  },
  planDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: s(4),
  },
  planFeatures: {
    gap: s(4),
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  planFeatureText: {
    fontFamily: fonts.body,
    fontSize: s(9.5),
    color: colors.text,
  },
});
