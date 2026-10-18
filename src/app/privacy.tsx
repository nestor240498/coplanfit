import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBackground } from '@/components/ui/AppBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AnalysisCard } from '@/features/anthropometry/components/AnalysisCard';
import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts, fontSizes, lineHeights } from '@/theme/typography';

const SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: 'Qué datos guarda CoplanFit',
    paragraphs: [
      'De tus clientes: nombre, teléfono o correo, edad y sexo, medidas y fotos de progreso, alergias, condiciones médicas y notas, planes, rutinas y el registro de lo que les envías.',
      'De ti: tu cuenta, tu perfil y el uso de las generaciones con IA.',
    ],
  },
  {
    title: 'Quién es responsable',
    paragraphs: [
      'Tú eres quien decide qué datos recoges de tus clientes y para qué. CoplanFit es la herramienta donde los guardas. Los datos de salud son sensibles: trátalos con cuidado.',
    ],
  },
  {
    title: 'Consentimiento de tus clientes',
    paragraphs: [
      'Antes de guardar o enviar datos de salud, pide al cliente que lo acepte (por WhatsApp o por escrito) y regístralo en su ficha, en «Privacidad y datos». Es una declaración tuya; la app solo anota la fecha.',
      'En España (RGPD), Colombia (Ley 1581 de 2012) y Chile (Ley 21.719, desde el 1 de diciembre de 2026) el consentimiento previo y explícito es la base habitual para datos de salud. En Venezuela no hay una ley general, pero la Constitución protege el acceso y la rectificación de los datos personales y se espera consentimiento previo.',
    ],
  },
  {
    title: 'Dónde se guardan y quién puede verlos',
    paragraphs: [
      'Los datos se guardan en Supabase con acceso restringido a tu cuenta: ningún otro entrenador puede verlos. Las fotos de los clientes están en un almacenamiento privado y se muestran con enlaces temporales.',
      'Los PDF que envías salen de la app hacia el medio que elijas (WhatsApp, correo…): desde ese momento los controla quien los recibe.',
    ],
  },
  {
    title: 'Uso de inteligencia artificial',
    paragraphs: [
      'Para sugerir planes y rutinas, completar ejercicios o leer un informe ISAK en PDF, la app envía a Google Gemini los datos necesarios: objetivo, alergias y condiciones, medidas y, en la lectura de informes, el PDF completo. Informa de esto a tus clientes.',
      'No envíes nada que el cliente no haya aceptado compartir.',
    ],
  },
  {
    title: 'Derechos de tus clientes',
    paragraphs: [
      'Pueden pedirte una copia de sus datos, corregirlos o que los borres. En la ficha, «Privacidad y datos» te permite descargar una copia (archivo JSON) y eliminar al cliente con todo lo suyo, incluidas sus fotos. Eliminar no se puede deshacer.',
    ],
  },
  {
    title: 'Resultados y certificaciones',
    paragraphs: [
      'Los análisis son información orientativa: no son un diagnóstico ni sustituyen una valoración médica.',
      'La certificación que aparece en tus informes (por ejemplo ISAK) la declaras tú: CoplanFit no la verifica y no está avalada por ISAK. Escribe solo una acreditación que tengas vigente.',
    ],
  },
];

/** Texto informativo sobre privacidad y uso de datos. Es una guía, no asesoría legal. */
export default function PrivacyScreen() {
  return (
    <View style={styles.screen}>
      <AppBackground />
      <ScreenHeader title="Privacidad y uso de datos" showBack />
      <ScrollView contentContainerStyle={styles.body}>
        {SECTIONS.map((section) => (
          <AnalysisCard key={section.title} title={section.title}>
            {section.paragraphs.map((p) => (
              <Text key={p} style={styles.text}>
                {p}
              </Text>
            ))}
          </AnalysisCard>
        ))}
        <Text style={styles.footnote}>
          Esta pantalla es una guía de buenas prácticas, no asesoría legal. Consulta la normativa de los países donde trabajas.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: s(16), gap: s(16), paddingBottom: s(40) },
  text: { fontFamily: fonts.body, fontSize: fontSizes.sm, lineHeight: lineHeights.sm, color: colors.text },
  footnote: { textAlign: 'center', fontFamily: fonts.body, fontSize: fontSizes.xs, lineHeight: lineHeights.xs, color: colors.textSecondary },
});
