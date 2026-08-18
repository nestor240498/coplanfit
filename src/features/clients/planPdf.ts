import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

import { formatDateShort } from '@/lib/format';
import { Profile } from '@/features/profile/types';
import { FoodGroup } from './planBuilderTypes';
import { PlanVersionData } from './plansRepository';
import { Client } from './types';

type GeneratePlanPdfOptions = {
  client: Pick<Client, 'full_name' | 'goal'>;
  profile: Profile | null;
  planData: PlanVersionData;
  versionNumber?: number;
  createdAt?: string;
};

const CATEGORY_DISPLAY_ORDER: { key: FoodGroup; label: string }[] = [
  { key: 'carbohidratos', label: 'Carbohidratos' },
  { key: 'grasas', label: 'Grasas' },
  { key: 'proteinas', label: 'Proteínas' },
  { key: 'vegetales', label: 'Vegetales / Hortalizas' },
  { key: 'frutas', label: 'Frutas' },
  { key: 'lacteos', label: 'Lácteos' },
];

export async function generateAndSharePlanPdf({
  client,
  profile,
  planData,
  versionNumber,
  createdAt,
}: GeneratePlanPdfOptions): Promise<void> {
  try {
    const formattedDate = createdAt ? formatDateShort(createdAt) : formatDateShort(new Date().toISOString());
    const versionLabel = versionNumber != null ? `Versión ${versionNumber}` : 'Plan Nutricional';
    const goalUpper = (client.goal || 'CONTROLADO').toUpperCase();

    // 1. Filas de Lista de Mercado por Categoría (Macro nutriente vs Alimento sin cantidades)
    const marketRowsHtml = CATEGORY_DISPLAY_ORDER.map(({ key, label }) => {
      const items = (planData.suggestions?.[key] ?? []).filter((f) => f && f.checked);
      if (items.length === 0) return '';

      const itemsListHtml = items
        .map((item) => `<li style="margin-bottom: 4px; color: #2E2E2E; font-size: 12.5px; font-weight: 500;">${item.name}</li>`)
        .join('');

      return `
        <tr>
          <td style="width: 36%; vertical-align: middle; text-align: center; font-weight: 700; font-size: 13px; color: #1B2A4A; background: #FFFFFF; padding: 14px 12px; border: 1px solid #DDE2EA;">
            ${label}
          </td>
          <td style="width: 64%; vertical-align: middle; background: #FFFFFF; padding: 14px 18px; border: 1px solid #DDE2EA;">
            <ul style="margin: 0; padding-left: 18px; line-height: 1.5;">
              ${itemsListHtml}
            </ul>
          </td>
        </tr>
      `;
    })
      .filter(Boolean)
      .join('');

    // 2. Filas de Comidas de 3 columnas (Comida / Opción 1 / Opción 2)
    const mealRowsHtml = (planData.mealSlots ?? [])
      .map((slot) => {
        const assignment = planData.meals?.[slot.id] ?? { option1: '', option2: '' };
        const isMerienda = slot.type === 'merienda';
        const subtitle = isMerienda ? 'Merienda' : 'Comida principal';

        return `
          <tr>
            <td style="width: 26%; vertical-align: middle; text-align: center; padding: 14px 10px; border: 1px solid #DDE2EA; background: #FFFFFF;">
              <div style="font-size: 13px; font-weight: 800; color: #1B2A4A;">${slot.name}</div>
              <div style="font-size: 10.5px; color: #5A6270; font-weight: 600; margin-top: 3px;">${slot.time} · ${subtitle}</div>
            </td>
            <td style="width: 37%; vertical-align: middle; padding: 12px 14px; border: 1px solid #DDE2EA; background: #FFFFFF; font-size: 12px; color: #2E2E2E; line-height: 1.5;">
              ${assignment.option1 || '—'}
            </td>
            <td style="width: 37%; vertical-align: middle; padding: 12px 14px; border: 1px solid #DDE2EA; background: #FFFFFF; font-size: 12px; color: #2E2E2E; line-height: 1.5;">
              ${assignment.option2 || '—'}
            </td>
          </tr>
        `;
      })
      .join('');

    // 3. Suplementación
    const supplementsListHtml = (planData.supplements ?? [])
      .map((s) => `<li style="margin-bottom: 4px;"><strong>${s.name}</strong>: ${s.dose} · ${s.scheduleDetail || s.schedule}</li>`)
      .join('');

    const supplementsSummaryListHtml = (planData.supplements ?? [])
      .map((s) => `<li style="margin-bottom: 4px; font-weight: 500;">${s.name}</li>`)
      .join('');

    const trainerName = (profile?.full_name || 'Entrenador Personal').toUpperCase();
    const businessName = (profile?.business_name || 'CoplanFit Coach').toUpperCase();
    const trainerDescription = profile?.description ? `<p style="font-size: 10.5px; color: #5A6270; margin: 3px 0 0 0; line-height: 1.4;">${profile.description}</p>` : '';

    const trainerLogoHtml = profile?.logo_url
      ? `<img src="${profile.logo_url}" style="width: 52px; height: 52px; border-radius: 26px; object-fit: cover; border: 2px solid #8BC53F;" />`
      : `<div style="width: 48px; height: 48px; border-radius: 24px; background: #1B2A4A; color: #8BC53F; border: 2px solid #8BC53F; font-size: 17px; font-weight: 900; display: flex; align-items: center; justify-content: center; letter-spacing: 0.5px;">${trainerName.slice(0, 2)}</div>`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Plan Nutricional - ${client.full_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Manrope:wght@700;800;900&display=swap');

            @page {
              margin: 12mm 15mm;
              size: A4;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #2E2E2E;
              background-color: #F7F8FA;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page-container {
              min-height: 98vh;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 4px 0;
            }
            .page-break {
              page-break-before: always;
            }
            
            /* Banner superior con Navy CoplanFit (#1B2A4A) */
            .header-banner {
              background: #1B2A4A;
              color: #FFFFFF;
              padding: 16px 20px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 20px;
              box-shadow: 0 4px 10px rgba(27, 42, 74, 0.12);
            }
            .banner-left {
              display: flex;
              align-items: center;
              gap: 14px;
            }
            .banner-accent {
              width: 4px;
              height: 44px;
              background-color: #8BC53F;
              border-radius: 2px;
            }
            .banner-title-wrap {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .header-title {
              font-family: 'Manrope', 'Inter', sans-serif;
              font-size: 22px;
              font-weight: 900;
              letter-spacing: 0.8px;
              margin: 0;
              color: #FFFFFF;
              text-transform: uppercase;
            }
            .header-subtitle-row {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.5px;
              color: #B9C2D6;
              margin-top: 2px;
            }
            .goal-tag {
              background: rgba(139, 197, 63, 0.2);
              color: #8BC53F;
              padding: 2px 7px;
              border-radius: 4px;
              font-weight: 800;
            }
            .arrow-circle {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              border: 1px solid #8BC53F;
              color: #8BC53F;
              font-size: 9px;
              line-height: 1;
            }
            
            /* Tablas de contenido */
            table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              border-radius: 8px;
              overflow: hidden;
              margin-bottom: 20px;
              border: 1px solid #DDE2EA;
              background: #FFFFFF;
              box-shadow: 0 2px 6px rgba(27, 42, 74, 0.04);
            }
            th {
              background-color: #EEF2F8;
              color: #1B2A4A;
              font-family: 'Manrope', 'Inter', sans-serif;
              font-size: 13px;
              font-weight: 800;
              padding: 12px 14px;
              text-align: center;
              border-bottom: 2px solid #DDE2EA;
              text-transform: uppercase;
              letter-spacing: 0.4px;
            }
            
            /* Bloques inferiores */
            .bottom-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              gap: 16px;
              margin-top: auto;
              padding-top: 12px;
            }
            .info-card {
              flex: 1;
              background: #FFFFFF;
              border: 1px solid #DDE2EA;
              border-left: 4px solid #8BC53F;
              border-radius: 6px;
              padding: 12px 16px;
              box-shadow: 0 2px 4px rgba(27, 42, 74, 0.04);
            }
            .info-card-title {
              font-family: 'Manrope', 'Inter', sans-serif;
              font-size: 11.5px;
              font-weight: 900;
              color: #1B2A4A;
              text-transform: uppercase;
              letter-spacing: 0.6px;
              margin-bottom: 5px;
            }
            .info-card ul {
              margin: 0;
              padding-left: 18px;
              font-size: 11.5px;
              color: #2E2E2E;
              line-height: 1.5;
            }
            
            /* Bloque de firma y marca del entrenador */
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
              font-size: 16px;
              font-weight: 900;
              color: #1B2A4A;
              letter-spacing: 0.3px;
            }
            .trainer-role {
              font-size: 11px;
              font-weight: 800;
              color: #4B7A1F;
              letter-spacing: 0.5px;
              margin-top: 2px;
            }
            .doc-meta {
              font-size: 9px;
              color: #8B93A3;
              margin-top: 4px;
            }
          </style>
        </head>
        <body>
          <!-- ==================== PÁGINA 1: LISTA DE MERCADO ==================== -->
          <div class="page-container">
            <div>
              <div class="header-banner">
                <div class="banner-left">
                  <div class="banner-accent"></div>
                  <div class="banner-title-wrap">
                    <h1 class="header-title">PROGRAMA NUTRICIONAL</h1>
                    <div class="header-subtitle-row">
                      <span class="goal-tag">${goalUpper}</span>
                      <span class="arrow-circle">➔</span>
                      <span>LISTA DE MERCADO</span>
                    </div>
                  </div>
                </div>
                ${trainerLogoHtml}
              </div>

              <table>
                <thead>
                  <tr>
                    <th style="width: 36%;">Macro nutriente</th>
                    <th style="width: 64%;">Alimento</th>
                  </tr>
                </thead>
                <tbody>
                  ${marketRowsHtml || '<tr><td colspan="2" style="padding: 14px; text-align: center; color: #8B93A3;">No hay alimentos registrados en la lista.</td></tr>'}
                </tbody>
              </table>
            </div>

            <div class="bottom-section">
              ${
                planData.supplements && planData.supplements.length > 0
                  ? `
              <div class="info-card">
                <div class="info-card-title">SUPLEMENTACIÓN</div>
                <ul>
                  ${supplementsSummaryListHtml}
                </ul>
              </div>
              `
                  : '<div></div>'
              }

              <div class="trainer-signature">
                <div class="trainer-info">
                  <div class="trainer-name">${trainerName}</div>
                  <div class="trainer-role">${businessName}</div>
                  ${trainerDescription}
                  <div class="doc-meta">Cliente: ${client.full_name} · ${formattedDate}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ==================== PÁGINA 2: DISTRIBUCIÓN DE COMIDAS ==================== -->
          <div class="page-container page-break">
            <div>
              <div class="header-banner">
                <div class="banner-left">
                  <div class="banner-accent"></div>
                  <div class="banner-title-wrap">
                    <h1 class="header-title">PROGRAMA NUTRICIONAL</h1>
                    <div class="header-subtitle-row">
                      <span class="goal-tag">${goalUpper}</span>
                      <span class="arrow-circle">➔</span>
                      <span>${client.full_name} (${versionLabel})</span>
                    </div>
                  </div>
                </div>
                ${trainerLogoHtml}
              </div>

              <table>
                <thead>
                  <tr>
                    <th style="width: 26%;">Comida</th>
                    <th style="width: 37%;">Opción 1</th>
                    <th style="width: 37%;">Opción 2</th>
                  </tr>
                </thead>
                <tbody>
                  ${mealRowsHtml || '<tr><td colspan="3" style="padding: 14px; text-align: center; color: #8B93A3;">No hay comidas configuradas en el plan.</td></tr>'}
                </tbody>
              </table>
            </div>

            <div class="bottom-section">
              <div class="info-card" style="max-width: 58%;">
                <div class="info-card-title">RECUERDA</div>
                <ul>
                  <li>Mínimo <strong>${planData.waterLiters || '2.5'} Lts</strong> de agua al día.</li>
                  ${supplementsListHtml}
                </ul>
              </div>

              <div class="trainer-signature">
                <div class="trainer-info">
                  <div class="trainer-name">${trainerName}</div>
                  <div class="trainer-role">${businessName}</div>
                  ${trainerDescription}
                  <div class="doc-meta">Generado con CoplanFit · ${formattedDate}</div>
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
        dialogTitle: `Programa Nutricional - ${client.full_name}`,
      });
    } else {
      Alert.alert('PDF generado', `El archivo PDF ha sido generado en: ${uri}`);
    }
  } catch (error) {
    Alert.alert('Error al exportar PDF', (error as Error).message);
  }
}
