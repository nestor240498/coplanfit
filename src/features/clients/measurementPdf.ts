import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

import { Profile } from '@/features/profile/types';
import { formatDateShort, formatGoal } from '@/lib/format';
import { resolveMediaUrls } from '@/lib/storage';
import { isChangeFavorable } from '@/lib/measurementTrends';
import { Client, Measurement } from './types';

type GenerateMeasurementPdfOptions = {
  client: Pick<Client, 'full_name' | 'goal' | 'age'>;
  profile: Profile | null;
  measurement: Measurement;
  /** Fotos de progreso (confidenciales): solo si el entrenador lo activa. */
  includePhotos?: boolean;
};

type GenerateMeasurementComparisonPdfOptions = {
  client: Pick<Client, 'full_name' | 'goal' | 'age'>;
  profile: Profile | null;
  earlier: Measurement;
  later: Measurement;
  /** Fotos de progreso (confidenciales): solo si el entrenador lo activa. */
  includePhotos?: boolean;
};

function fmt(value: number | null | undefined, unit = '', decimals = 0): string {
  if (value == null) return '—';
  return `${value.toFixed(decimals)}${unit ? ' ' + unit : ''}`;
}

function calculateSumFolds(m: Measurement): number {
  const folds = [
    m.triceps_mm,
    m.biceps_mm,
    m.subscapular_mm,
    m.supraspinal_mm,
    m.suprailiac_mm,
    m.abdominal_mm,
    m.thigh_mm,
    m.calf_mm,
    m.chest_mm,
  ];
  return folds.reduce((acc: number, curr) => {
    return curr != null && curr > 0 ? acc + curr : acc;
  }, 0);
}

/** Exporta reporte PDF de una medición antropométrica individual */
export async function generateAndShareMeasurementPdf({
  client,
  profile,
  measurement,
  includePhotos = false,
}: GenerateMeasurementPdfOptions): Promise<void> {
  try {
    const formattedDate = formatDateShort(measurement.measured_at);
    const goalUpper = (client.goal ? formatGoal(client.goal) : 'CONTROLADO').toUpperCase();
    const trainerName = (profile?.full_name || 'Entrenador Personal').toUpperCase();
    const businessName = (profile?.business_name || 'CoplanFit Coach').toUpperCase();
    const trainerDescription = profile?.description
      ? `<p style="font-size: 10.5px; color: #5A6270; margin: 3px 0 0 0; line-height: 1.4;">${profile.description}</p>`
      : '';

    const trainerLogoHtml = profile?.logo_url
      ? `<img src="${profile.logo_url}" alt="Logo" class="trainer-logo" />`
      : `<div class="trainer-logo-placeholder">${businessName.charAt(0) || 'C'}</div>`;

    const sumFolds = calculateSumFolds(measurement);
    // Fotos del bucket privado: URLs firmadas temporales para que el PDF pueda cargarlas
    const photoUrls = includePhotos ? await resolveMediaUrls(measurement.photos) : [];

    const photosHtml =
      photoUrls.length > 0
        ? `
          <div class="section-title">Registro Fotográfico</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; margin-bottom: 8px;">
            ${photoUrls
              .map(
                (url, idx) => `
                <div style="width: 105px; height: 135px; border-radius: 6px; overflow: hidden; border: 1px solid #DDE2EA; background: #FAFBFD;">
                  <img src="${url}" alt="Foto ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
              `
              )
              .join('')}
          </div>
        `
        : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Evaluación Antropométrica - ${client.full_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@700;800;900&display=swap');
            
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            
            * {
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1F242E;
              margin: 0;
              padding: 0;
              background-color: #FFFFFF;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .page-container {
              width: 100%;
              display: flex;
              flex-direction: column;
            }
            
            .header-banner {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #1B2A4A;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            
            .banner-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            
            .banner-accent {
              width: 5px;
              height: 48px;
              background: #8BC53F;
              border-radius: 3px;
            }
            
            .header-title {
              font-family: 'Manrope', 'Inter', sans-serif;
              font-size: 20px;
              font-weight: 900;
              color: #1B2A4A;
              margin: 0;
              letter-spacing: 0.5px;
            }
            
            .header-subtitle-row {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-top: 4px;
              font-size: 11px;
              font-weight: 700;
              color: #5A6270;
            }
            
            .goal-tag {
              background: #EBF7D4;
              color: #3B6B11;
              padding: 3px 8px;
              border-radius: 4px;
              font-weight: 800;
              letter-spacing: 0.4px;
            }

            .client-meta-card {
              display: flex;
              justify-content: space-between;
              background: #F4F6F9;
              border: 1px solid #DDE2EA;
              border-radius: 8px;
              padding: 10px 16px;
              margin-bottom: 16px;
              font-size: 12px;
            }

            .meta-item {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }

            .meta-label {
              font-size: 10px;
              font-weight: 700;
              color: #717D96;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .meta-val {
              font-size: 13px;
              font-weight: 800;
              color: #1B2A4A;
            }
            
            .trainer-logo {
              max-height: 46px;
              max-width: 140px;
              object-fit: contain;
            }
            
            .trainer-logo-placeholder {
              width: 44px;
              height: 44px;
              border-radius: 8px;
              background: #1B2A4A;
              color: #8BC53F;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'Manrope', sans-serif;
              font-size: 20px;
              font-weight: 900;
            }
            
            .section-title {
              font-family: 'Manrope', 'Inter', sans-serif;
              font-size: 11.5px;
              font-weight: 900;
              color: #1B2A4A;
              letter-spacing: 0.6px;
              text-transform: uppercase;
              margin: 14px 0 6px 0;
              display: flex;
              align-items: center;
              gap: 6px;
            }

            .section-title::before {
              content: '';
              display: inline-block;
              width: 4px;
              height: 12px;
              background: #8BC53F;
              border-radius: 2px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
              font-size: 11.5px;
            }
            
            th {
              background: #1B2A4A;
              color: #FFFFFF;
              font-family: 'Manrope', 'Inter', sans-serif;
              font-size: 10.5px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 6px 10px;
              text-align: left;
              border: 1px solid #1B2A4A;
            }
            
            td {
              padding: 6px 10px;
              border: 1px solid #DDE2EA;
              color: #2E2E2E;
              background: #FFFFFF;
            }

            tr:nth-child(even) td {
              background: #FAFBFD;
            }
            
            .val-bold {
              font-weight: 700;
              color: #1B2A4A;
            }

            .grid-2col {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px;
            }
            
            .bottom-section {
              margin-top: 16px;
              padding-top: 12px;
              border-top: 1px dashed #CBD2E0;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            
            .trainer-signature {
              display: flex;
              align-items: center;
              gap: 12px;
              text-align: right;
            }
            
            .trainer-info {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
            }
            
            .trainer-name {
              font-family: 'Manrope', 'Inter', sans-serif;
              font-size: 14px;
              font-weight: 900;
              color: #1B2A4A;
            }
            
            .trainer-role {
              font-size: 10.5px;
              font-weight: 800;
              color: #4B7A1F;
              margin-top: 1px;
            }
            
            .doc-meta {
              font-size: 9.5px;
              color: #8B93A3;
              margin-top: 3px;
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div>
              <!-- HEADER -->
              <div class="header-banner">
                <div class="banner-left">
                  <div class="banner-accent"></div>
                  <div>
                    <h1 class="header-title">EVALUACIÓN ANTROPOMÉTRICA</h1>
                    <div class="header-subtitle-row">
                      <span class="goal-tag">${goalUpper}</span>
                      <span>·</span>
                      <span>REPORTE OFICIAL DE MEDICIÓN</span>
                    </div>
                  </div>
                </div>
                ${trainerLogoHtml}
              </div>

              <!-- CLIENT INFO -->
              <div class="client-meta-card">
                <div class="meta-item">
                  <span class="meta-label">Asesorado</span>
                  <span class="meta-val">${client.full_name}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Fecha de Medición</span>
                  <span class="meta-val">${formattedDate}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Edad</span>
                  <span class="meta-val">${client.age != null ? `${client.age} años` : '—'}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Objetivo</span>
                  <span class="meta-val">${client.goal ? formatGoal(client.goal) : 'Salud general'}</span>
                </div>
              </div>

              <!-- 2 COLUMNS: COMPOSICIÓN & INDICADORES -->
              <div class="grid-2col">
                <div>
                  <div class="section-title">Composición Corporal</div>
                  <table>
                    <tbody>
                      <tr>
                        <td>Peso</td>
                        <td class="val-bold">${fmt(measurement.weight_kg, 'kg', 1)}</td>
                      </tr>
                      <tr>
                        <td>Estatura</td>
                        <td class="val-bold">${measurement.height_cm != null ? `${(measurement.height_cm / 100).toFixed(2)} m (${measurement.height_cm} cm)` : '—'}</td>
                      </tr>
                      <tr>
                        <td>Grasa Corporal</td>
                        <td class="val-bold">${fmt(measurement.body_fat_pct, '%', 1)}</td>
                      </tr>
                      <tr>
                        <td>Masa Muscular</td>
                        <td class="val-bold">${fmt(measurement.muscle_mass_pct, '%', 1)}</td>
                      </tr>
                      <tr>
                        <td>Grasa Visceral</td>
                        <td class="val-bold">${fmt(measurement.visceral_fat, 'nivel', 0)}</td>
                      </tr>
                      <tr>
                        <td>Metabolismo Basal (BMR)</td>
                        <td class="val-bold">${fmt(measurement.bmr_kcal, 'kcal', 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <div class="section-title">Indicadores y Ratios</div>
                  <table>
                    <tbody>
                      <tr>
                        <td>Índice Masa Corporal (IMC)</td>
                        <td class="val-bold">${fmt(measurement.bmi, '', 1)}</td>
                      </tr>
                      <tr>
                        <td>Relación Cintura / Cadera</td>
                        <td class="val-bold">${fmt(measurement.waist_hip_ratio, '', 2)}</td>
                      </tr>
                      <tr>
                        <td>Sumatoria de Pliegues (∑)</td>
                        <td class="val-bold">${sumFolds > 0 ? `${sumFolds.toFixed(1)} mm` : '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- 2 COLUMNS: PERÍMETROS & PLICOMETRÍA -->
              <div class="grid-2col" style="margin-top: 4px;">
                <div>
                  <div class="section-title">Perímetros Corporales (cm)</div>
                  <table>
                    <tbody>
                      <tr>
                        <td>Cuello</td>
                        <td class="val-bold">${fmt(measurement.neck_cm, 'cm')}</td>
                      </tr>
                      <tr>
                        <td>Hombros</td>
                        <td class="val-bold">${fmt(measurement.shoulders_cm, 'cm')}</td>
                      </tr>
                      <tr>
                        <td>Pecho / Tórax</td>
                        <td class="val-bold">${fmt(measurement.chest_cm, 'cm')}</td>
                      </tr>
                      <tr>
                        <td>Cintura</td>
                        <td class="val-bold">${fmt(measurement.waist_cm, 'cm')}</td>
                      </tr>
                      <tr>
                        <td>Abdomen umbilical</td>
                        <td class="val-bold">${fmt(measurement.abdomen_cm, 'cm')}</td>
                      </tr>
                      <tr>
                        <td>Cadera / Glúteos</td>
                        <td class="val-bold">${fmt(measurement.hip_cm, 'cm')}</td>
                      </tr>
                      <tr>
                        <td>Bíceps relajado</td>
                        <td class="val-bold">${measurement.arm_right_cm != null || measurement.arm_left_cm != null ? `D: ${fmt(measurement.arm_right_cm, 'cm')} · I: ${fmt(measurement.arm_left_cm, 'cm')}` : fmt(measurement.arm_cm, 'cm')}</td>
                      </tr>
                      <tr>
                        <td>Bíceps contraído</td>
                        <td class="val-bold">${measurement.arm_flexed_right_cm != null || measurement.arm_flexed_left_cm != null ? `D: ${fmt(measurement.arm_flexed_right_cm, 'cm')} · I: ${fmt(measurement.arm_flexed_left_cm, 'cm')}` : '—'}</td>
                      </tr>
                      <tr>
                        <td>Antebrazo</td>
                        <td class="val-bold">${measurement.forearm_right_cm != null || measurement.forearm_left_cm != null ? `D: ${fmt(measurement.forearm_right_cm, 'cm')} · I: ${fmt(measurement.forearm_left_cm, 'cm')}` : '—'}</td>
                      </tr>
                      <tr>
                        <td>Muslo</td>
                        <td class="val-bold">${measurement.thigh_right_cm != null || measurement.thigh_left_cm != null ? `D: ${fmt(measurement.thigh_right_cm, 'cm')} · I: ${fmt(measurement.thigh_left_cm, 'cm')}` : '—'}</td>
                      </tr>
                      <tr>
                        <td>Pantorrilla</td>
                        <td class="val-bold">${measurement.calf_right_cm != null || measurement.calf_left_cm != null ? `D: ${fmt(measurement.calf_right_cm, 'cm')} · I: ${fmt(measurement.calf_left_cm, 'cm')}` : '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <div class="section-title">Plicometría / Pliegues (mm)</div>
                  <table>
                    <tbody>
                      <tr>
                        <td>Tríceps</td>
                        <td class="val-bold">${fmt(measurement.triceps_mm, 'mm')}</td>
                      </tr>
                      <tr>
                        <td>Bíceps</td>
                        <td class="val-bold">${fmt(measurement.biceps_mm, 'mm')}</td>
                      </tr>
                      <tr>
                        <td>Subescapular</td>
                        <td class="val-bold">${fmt(measurement.subscapular_mm, 'mm')}</td>
                      </tr>
                      <tr>
                        <td>Supraespinal</td>
                        <td class="val-bold">${fmt(measurement.supraspinal_mm, 'mm')}</td>
                      </tr>
                      <tr>
                        <td>Suprailíaco</td>
                        <td class="val-bold">${fmt(measurement.suprailiac_mm, 'mm')}</td>
                      </tr>
                      <tr>
                        <td>Abdominal</td>
                        <td class="val-bold">${fmt(measurement.abdominal_mm, 'mm')}</td>
                      </tr>
                      <tr>
                        <td>Muslo frontal</td>
                        <td class="val-bold">${fmt(measurement.thigh_mm, 'mm')}</td>
                      </tr>
                      <tr>
                        <td>Pantorrilla medial</td>
                        <td class="val-bold">${fmt(measurement.calf_mm, 'mm')}</td>
                      </tr>
                      <tr>
                        <td>Pectoral / Pecho</td>
                        <td class="val-bold">${fmt(measurement.chest_mm, 'mm')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- FOTOS DE PROGRESO -->
              ${photosHtml}
            </div>

            <!-- FOOTER -->
            <div class="bottom-section">
              <div class="doc-meta">
                Generado automáticamente vía CoplanFit Pro · ${new Date().toLocaleDateString('es-ES')}
              </div>
              <div class="trainer-signature">
                <div class="trainer-info">
                  <div class="trainer-name">${trainerName}</div>
                  <div class="trainer-role">${businessName}</div>
                  ${trainerDescription}
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    if (Platform.OS === 'web') {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        }, 400);
      }
      return;
    }

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Evaluación Antropométrica - ${client.full_name}`,
      });
    } else {
      Alert.alert('PDF generado', `El archivo PDF ha sido generado en: ${uri}`);
    }
  } catch (error) {
    Alert.alert('Error al exportar PDF', (error as Error).message);
  }
}

/** Métricas para la comparativa */
type ComparisonMetric = {
  key: keyof Measurement;
  label: string;
  unit: string;
  decimals?: number;
  category: 'Composición Corporal' | 'Perímetros' | 'Plicometría';
};

const COMPARISON_METRICS: ComparisonMetric[] = [
  // Composición
  { key: 'weight_kg', label: 'Peso', unit: 'kg', decimals: 1, category: 'Composición Corporal' },
  { key: 'height_cm', label: 'Estatura', unit: 'cm', decimals: 0, category: 'Composición Corporal' },
  { key: 'body_fat_pct', label: '% Grasa Corporal', unit: '%', decimals: 1, category: 'Composición Corporal' },
  { key: 'muscle_mass_pct', label: '% Masa Muscular', unit: '%', decimals: 1, category: 'Composición Corporal' },
  { key: 'visceral_fat', label: 'Grasa Visceral', unit: 'nivel', decimals: 0, category: 'Composición Corporal' },
  { key: 'bmr_kcal', label: 'Metabolismo Basal (BMR)', unit: 'kcal', decimals: 0, category: 'Composición Corporal' },
  { key: 'bmi', label: 'IMC (Índice Masa Corporal)', unit: '', decimals: 1, category: 'Composición Corporal' },
  { key: 'waist_hip_ratio', label: 'Relación Cintura / Cadera', unit: '', decimals: 2, category: 'Composición Corporal' },

  // Perímetros
  { key: 'neck_cm', label: 'Cuello', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'shoulders_cm', label: 'Hombros', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'chest_cm', label: 'Pecho / Tórax', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'waist_cm', label: 'Cintura', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'abdomen_cm', label: 'Abdomen umbilical', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'hip_cm', label: 'Cadera / Glúteos', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'arm_right_cm', label: 'Bíceps relajado Der.', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'arm_left_cm', label: 'Bíceps relajado Izq.', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'arm_flexed_right_cm', label: 'Bíceps contraído Der.', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'arm_flexed_left_cm', label: 'Bíceps contraído Izq.', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'forearm_right_cm', label: 'Antebrazo Der.', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'forearm_left_cm', label: 'Antebrazo Izq.', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'thigh_right_cm', label: 'Muslo Der.', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'thigh_left_cm', label: 'Muslo Izq.', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'calf_right_cm', label: 'Pantorrilla Der.', unit: 'cm', decimals: 1, category: 'Perímetros' },
  { key: 'calf_left_cm', label: 'Pantorrilla Izq.', unit: 'cm', decimals: 1, category: 'Perímetros' },

  // Plicometría
  { key: 'triceps_mm', label: 'Tríceps', unit: 'mm', decimals: 1, category: 'Plicometría' },
  { key: 'biceps_mm', label: 'Bíceps', unit: 'mm', decimals: 1, category: 'Plicometría' },
  { key: 'subscapular_mm', label: 'Subescapular', unit: 'mm', decimals: 1, category: 'Plicometría' },
  { key: 'supraspinal_mm', label: 'Supraespinal', unit: 'mm', decimals: 1, category: 'Plicometría' },
  { key: 'suprailiac_mm', label: 'Suprailíaco', unit: 'mm', decimals: 1, category: 'Plicometría' },
  { key: 'abdominal_mm', label: 'Abdominal', unit: 'mm', decimals: 1, category: 'Plicometría' },
  { key: 'thigh_mm', label: 'Muslo frontal', unit: 'mm', decimals: 1, category: 'Plicometría' },
  { key: 'calf_mm', label: 'Pantorrilla medial', unit: 'mm', decimals: 1, category: 'Plicometría' },
  { key: 'chest_mm', label: 'Pectoral / Pecho', unit: 'mm', decimals: 1, category: 'Plicometría' },
];

/** Exporta reporte PDF comparativo entre dos mediciones */
export async function generateAndShareMeasurementComparisonPdf({
  client,
  profile,
  earlier,
  later,
  includePhotos = false,
}: GenerateMeasurementComparisonPdfOptions): Promise<void> {
  try {
    const formattedDateEarlier = formatDateShort(earlier.measured_at);
    const formattedDateLater = formatDateShort(later.measured_at);
    const [earlierPhotos, laterPhotos] = includePhotos
      ? await Promise.all([resolveMediaUrls(earlier.photos), resolveMediaUrls(later.photos)])
      : [[], []];
    const goalUpper = (client.goal ? formatGoal(client.goal) : 'CONTROLADO').toUpperCase();
    const trainerName = (profile?.full_name || 'Entrenador Personal').toUpperCase();
    const businessName = (profile?.business_name || 'CoplanFit Coach').toUpperCase();

    const trainerLogoHtml = profile?.logo_url
      ? `<img src="${profile.logo_url}" alt="Logo" class="trainer-logo" />`
      : `<div class="trainer-logo-placeholder">${businessName.charAt(0) || 'C'}</div>`;

    const trainerDescription = profile?.description
      ? `<p style="font-size: 10.5px; color: #5A6270; margin: 3px 0 0 0; line-height: 1.4;">${profile.description}</p>`
      : '';

    // Filtrar métricas que tengan datos en al menos una de las dos mediciones
    const categories: ('Composición Corporal' | 'Perímetros' | 'Plicometría')[] = [
      'Composición Corporal',
      'Perímetros',
      'Plicometría',
    ];

    const categoryTablesHtml = categories
      .map((cat) => {
        const catMetrics = COMPARISON_METRICS.filter(
          (m) => m.category === cat && (earlier[m.key] != null || later[m.key] != null)
        );

        if (catMetrics.length === 0) return '';

        const rowsHtml = catMetrics
          .map((metric) => {
            const prev = earlier[metric.key] as number | null;
            const next = later[metric.key] as number | null;
            const favorable = prev != null && next != null ? isChangeFavorable(metric.key, prev, next, client.goal) : null;
            const diff = prev != null && next != null ? next - prev : null;

            let diffText = '—';
            let trendBadge = '<span style="color: #9AA2B1; font-weight: 500;">—</span>';

            if (diff != null) {
              const diffFmt = diff.toFixed(metric.decimals ?? 1);
              const sign = diff > 0 ? `+${diffFmt}` : diffFmt;
              const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '=';
              diffText = `${sign} ${metric.unit} ${arrow}`.trim();

              if (favorable === true) {
                trendBadge = '<span class="badge badge-fav">FAVORABLE</span>';
              }
            }

            return `
              <tr>
                <td style="font-weight: 600; width: 34%;">${metric.label}</td>
                <td style="text-align: center; width: 20%; color: #5A6270;">${fmt(prev, metric.unit, metric.decimals)}</td>
                <td style="text-align: center; width: 20%; font-weight: 800; color: #1B2A4A;">${fmt(next, metric.unit, metric.decimals)}</td>
                <td style="text-align: center; width: 14%; font-weight: 700;">${diffText}</td>
                <td style="text-align: center; width: 12%;">${trendBadge}</td>
              </tr>
            `;
          })
          .join('');

        return `
          <div class="section-title">${cat}</div>
          <table>
            <thead>
              <tr>
                <th style="width: 34%;">Parámetro</th>
                <th style="width: 20%; text-align: center;">Inicial (${formattedDateEarlier})</th>
                <th style="width: 20%; text-align: center;">Final (${formattedDateLater})</th>
                <th style="width: 14%; text-align: center;">Diferencia (Δ)</th>
                <th style="width: 12%; text-align: center;">Evaluación</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        `;
      })
      .filter(Boolean)
      .join('');

    const comparisonPhotosHtml =
      earlierPhotos.length > 0 || laterPhotos.length > 0
        ? `
          <div class="section-title">Evolución Visual (Fotos de Progreso)</div>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px; margin-bottom: 10px;">
            ${
              earlierPhotos.length > 0
                ? `
                <div style="background: #FAFBFD; border: 1px solid #DDE2EA; border-radius: 6px; padding: 8px;">
                  <div style="font-size: 10px; font-weight: 800; color: #1B2A4A; margin-bottom: 6px;">
                    INICIAL (${formattedDateEarlier})
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${earlierPhotos
                      .map(
                        (url, idx) => `
                        <div style="width: 95px; height: 125px; border-radius: 4px; overflow: hidden; border: 1px solid #CBD2E0; background: #FFF;">
                          <img src="${url}" alt="Inicial ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;" />
                        </div>
                      `
                      )
                      .join('')}
                  </div>
                </div>
              `
                : ''
            }
            ${
              laterPhotos.length > 0
                ? `
                <div style="background: #FAFBFD; border: 1px solid #DDE2EA; border-radius: 6px; padding: 8px;">
                  <div style="font-size: 10px; font-weight: 800; color: #1B2A4A; margin-bottom: 6px;">
                    FINAL (${formattedDateLater})
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${laterPhotos
                      .map(
                        (url, idx) => `
                        <div style="width: 95px; height: 125px; border-radius: 4px; overflow: hidden; border: 1px solid #CBD2E0; background: #FFF;">
                          <img src="${url}" alt="Final ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;" />
                        </div>
                      `
                      )
                      .join('')}
                  </div>
                </div>
              `
                : ''
            }
          </div>
        `
        : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Comparativa de Evolución - ${client.full_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@700;800;900&display=swap');
            
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            
            * {
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1F242E;
              margin: 0;
              padding: 0;
              background-color: #FFFFFF;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .page-container {
              width: 100%;
              display: flex;
              flex-direction: column;
            }
            
            .header-banner {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #1B2A4A;
              padding-bottom: 12px;
              margin-bottom: 14px;
            }
            
            .banner-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            
            .banner-accent {
              width: 5px;
              height: 48px;
              background: #8BC53F;
              border-radius: 3px;
            }
            
            .header-title {
              font-family: 'Manrope', 'Inter', sans-serif;
              font-size: 20px;
              font-weight: 900;
              color: #1B2A4A;
              margin: 0;
              letter-spacing: 0.5px;
            }
            
            .header-subtitle-row {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-top: 4px;
              font-size: 11px;
              font-weight: 700;
              color: #5A6270;
            }
            
            .goal-tag {
              background: #EBF7D4;
              color: #3B6B11;
              padding: 3px 8px;
              border-radius: 4px;
              font-weight: 800;
              letter-spacing: 0.4px;
            }

            .client-meta-card {
              display: flex;
              justify-content: space-between;
              background: #F4F6F9;
              border: 1px solid #DDE2EA;
              border-radius: 8px;
              padding: 10px 16px;
              margin-bottom: 14px;
              font-size: 12px;
            }

            .meta-item {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }

            .meta-label {
              font-size: 10px;
              font-weight: 700;
              color: #717D96;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .meta-val {
              font-size: 13px;
              font-weight: 800;
              color: #1B2A4A;
            }
            
            .trainer-logo {
              max-height: 46px;
              max-width: 140px;
              object-fit: contain;
            }
            
            .trainer-logo-placeholder {
              width: 44px;
              height: 44px;
              border-radius: 8px;
              background: #1B2A4A;
              color: #8BC53F;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'Manrope', sans-serif;
              font-size: 20px;
              font-weight: 900;
            }
            
            .section-title {
              font-family: 'Manrope', 'Inter', sans-serif;
              font-size: 11px;
              font-weight: 900;
              color: #1B2A4A;
              letter-spacing: 0.6px;
              text-transform: uppercase;
              margin: 12px 0 5px 0;
              display: flex;
              align-items: center;
              gap: 6px;
            }

            .section-title::before {
              content: '';
              display: inline-block;
              width: 4px;
              height: 12px;
              background: #8BC53F;
              border-radius: 2px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8px;
              font-size: 11px;
            }
            
            th {
              background: #1B2A4A;
              color: #FFFFFF;
              font-family: 'Manrope', 'Inter', sans-serif;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 6px 8px;
              border: 1px solid #1B2A4A;
            }
            
            td {
              padding: 5px 8px;
              border: 1px solid #DDE2EA;
              color: #2E2E2E;
              background: #FFFFFF;
            }

            tr:nth-child(even) td {
              background: #FAFBFD;
            }

            .badge {
              font-size: 8.5px;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 3px;
              display: inline-block;
              letter-spacing: 0.3px;
            }

            .badge-fav {
              background: #EBF7D4;
              color: #3B6B11;
            }

            .badge-unfav {
              background: #FEECEB;
              color: #D9383A;
            }

            .badge-neutral {
              background: #EDF2F7;
              color: #4A5568;
            }
            
            .bottom-section {
              margin-top: 14px;
              padding-top: 10px;
              border-top: 1px dashed #CBD2E0;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            
            .trainer-signature {
              display: flex;
              align-items: center;
              gap: 12px;
              text-align: right;
            }
            
            .trainer-info {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
            }
            
            .trainer-name {
              font-family: 'Manrope', 'Inter', sans-serif;
              font-size: 13.5px;
              font-weight: 900;
              color: #1B2A4A;
            }
            
            .trainer-role {
              font-size: 10px;
              font-weight: 800;
              color: #4B7A1F;
              margin-top: 1px;
            }
            
            .doc-meta {
              font-size: 9px;
              color: #8B93A3;
              margin-top: 3px;
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div>
              <!-- HEADER -->
              <div class="header-banner">
                <div class="banner-left">
                  <div class="banner-accent"></div>
                  <div>
                    <h1 class="header-title">COMPARATIVA Y EVOLUCIÓN</h1>
                    <div class="header-subtitle-row">
                      <span class="goal-tag">${goalUpper}</span>
                      <span>·</span>
                      <span>INFORME DE PROGRESO ANTROPOMÉTRICO</span>
                    </div>
                  </div>
                </div>
                ${trainerLogoHtml}
              </div>

              <!-- CLIENT INFO -->
              <div class="client-meta-card">
                <div class="meta-item">
                  <span class="meta-label">Asesorado</span>
                  <span class="meta-val">${client.full_name}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Periodo Comparado</span>
                  <span class="meta-val">${formattedDateEarlier} ➔ ${formattedDateLater}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Objetivo</span>
                  <span class="meta-val">${client.goal ? formatGoal(client.goal) : 'Salud general'}</span>
                </div>
              </div>

              <!-- CATEGORIES TABLES -->
              ${categoryTablesHtml}

              <!-- FOTOS DE PROGRESO -->
              ${comparisonPhotosHtml}
            </div>

            <!-- FOOTER -->
            <div class="bottom-section">
              <div class="doc-meta">
                Generado automáticamente vía CoplanFit Pro · ${new Date().toLocaleDateString('es-ES')}
              </div>
              <div class="trainer-signature">
                <div class="trainer-info">
                  <div class="trainer-name">${trainerName}</div>
                  <div class="trainer-role">${businessName}</div>
                  ${trainerDescription}
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    if (Platform.OS === 'web') {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        }, 400);
      }
      return;
    }

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Comparativa Antropométrica - ${client.full_name}`,
      });
    } else {
      Alert.alert('PDF generado', `El archivo PDF ha sido generado en: ${uri}`);
    }
  } catch (error) {
    Alert.alert('Error al exportar PDF', (error as Error).message);
  }
}
