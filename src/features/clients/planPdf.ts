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

    // 1. Filas de Comidas de 3 columnas (Comida / Opción 1 / Opción 2)
    const mealRowsHtml = (planData.mealSlots ?? [])
      .map((slot) => {
        const assignment = planData.meals?.[slot.id] ?? { option1: '', option2: '' };
        const isMerienda = slot.type === 'merienda';
        const subtitle = isMerienda ? 'Merienda' : 'Comida principal';

        return `
          <tr>
            <td style="width: 24%; vertical-align: middle; text-align: center; padding: 10px 8px; border: 1px solid #DDE2EA; background: #FAFBFD;">
              <div style="font-size: 12px; font-weight: 800; color: #1B2A4A;">${slot.name}</div>
              <div style="font-size: 10px; color: #5A6270; font-weight: 600; margin-top: 2px;">${slot.time} · ${subtitle}</div>
            </td>
            <td style="width: 38%; vertical-align: middle; padding: 10px 12px; border: 1px solid #DDE2EA; background: #FFFFFF; font-size: 11.5px; color: #2E2E2E; line-height: 1.45;">
              ${assignment.option1 || '—'}
            </td>
            <td style="width: 38%; vertical-align: middle; padding: 10px 12px; border: 1px solid #DDE2EA; background: #FFFFFF; font-size: 11.5px; color: #2E2E2E; line-height: 1.45;">
              ${assignment.option2 || '—'}
            </td>
          </tr>
        `;
      })
      .join('');

    // 2. Filas de Lista de Mercado por Categoría (Macro nutriente vs Alimento)
    const marketRowsHtml = CATEGORY_DISPLAY_ORDER.map(({ key, label }) => {
      const items = (planData.suggestions?.[key] ?? []).filter((f) => f && f.checked);
      if (items.length === 0) return '';

      const itemsListHtml = items
        .map((item) => `<li style="margin-bottom: 3px; color: #2E2E2E; font-size: 11.5px; font-weight: 500;">${item.name}</li>`)
        .join('');

      return `
        <tr>
          <td style="width: 30%; vertical-align: middle; text-align: center; font-weight: 700; font-size: 12px; color: #1B2A4A; background: #FAFBFD; padding: 10px 10px; border: 1px solid #DDE2EA;">
            ${label}
          </td>
          <td style="width: 70%; vertical-align: middle; background: #FFFFFF; padding: 10px 14px; border: 1px solid #DDE2EA;">
            <ul style="margin: 0; padding-left: 16px; line-height: 1.4;">
              ${itemsListHtml}
            </ul>
          </td>
        </tr>
      `;
    })
      .filter(Boolean)
      .join('');

    // 3. Suplementación
    const supplementsListHtml = (planData.supplements ?? [])
      .map((s) => `<li style="margin-bottom: 3px;"><strong>${s.name}</strong>: ${s.dose} · ${s.scheduleDetail || s.schedule}</li>`)
      .join('');

    const trainerName = (profile?.full_name || 'Entrenador Personal').toUpperCase();
    const businessName = (profile?.business_name || 'CoplanFit Coach').toUpperCase();
    const trainerDescription = profile?.description
      ? `<p style="font-size: 10px; color: #5A6270; margin: 2px 0 0 0; line-height: 1.35;">${profile.description}</p>`
      : '';

    const trainerLogoHtml = profile?.logo_url
      ? `<img src="${profile.logo_url}" style="width: 48px; height: 48px; border-radius: 24px; object-fit: cover; border: 2px solid #8BC53F;" />`
      : `<div style="width: 44px; height: 44px; border-radius: 22px; background: #1B2A4A; color: #8BC53F; border: 2px solid #8BC53F; font-size: 16px; font-weight: 900; display: flex; align-items: center; justify-content: center; letter-spacing: 0.5px;">${trainerName.slice(0, 2)}</div>`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Plan Nutricional - ${client.full_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Manrope:wght@700;800;900&display=swap');

            @page {
              margin: 10mm 12mm;
              size: A4 portrait;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #2E2E2E;
              background-color: #FFFFFF;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .document-container {
              width: 100%;
              display: block;
            }
            
            /* Salto de página forzado */
            .page-break {
              page-break-before: always !important;
              break-before: page !important;
              clear: both !important;
              display: block !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            /* Banner superior con Navy CoplanFit (#1B2A4A) */
            .header-banner {
              background: #1B2A4A;
              color: #FFFFFF;
              padding: 14px 18px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 12px;
              page-break-inside: avoid;
            }
            .banner-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .banner-accent {
              width: 4px;
              height: 42px;
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
              font-size: 20px;
              font-weight: 900;
              letter-spacing: 0.6px;
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
              letter-spacing: 0.4px;
              color: #B9C2D6;
              margin-top: 2px;
            }
            .goal-tag {
              background: rgba(139, 197, 63, 0.25);
              color: #8BC53F;
              padding: 2px 7px;
              border-radius: 4px;
              font-weight: 800;
            }

            /* Meta Card Cliente */
            .client-meta-card {
              display: flex;
              justify-content: space-between;
              background: #F4F6F9;
              border: 1px solid #DDE2EA;
              border-radius: 8px;
              padding: 8px 14px;
              margin-bottom: 14px;
              font-size: 11.5px;
              page-break-inside: avoid;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .meta-label {
              font-size: 9.5px;
              font-weight: 700;
              color: #717D96;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .meta-val {
              font-size: 12.5px;
              font-weight: 800;
              color: #1B2A4A;
            }

            /* Títulos de sección */
            .section-title {
              font-family: 'Manrope', 'Inter', sans-serif;
              font-size: 11.5px;
              font-weight: 900;
              color: #1B2A4A;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              margin: 14px 0 6px 0;
              display: flex;
              align-items: center;
              gap: 6px;
              page-break-after: avoid;
            }
            .section-title::before {
              content: '';
              display: inline-block;
              width: 4px;
              height: 12px;
              background: #8BC53F;
              border-radius: 2px;
            }
            
            /* Tablas de contenido */
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
              border: 1px solid #DDE2EA;
              background: #FFFFFF;
              page-break-inside: auto;
            }
            thead {
              display: table-header-group;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            th {
              background-color: #1B2A4A;
              color: #FFFFFF;
              font-family: 'Manrope', 'Inter', sans-serif;
              font-size: 11px;
              font-weight: 800;
              padding: 7px 10px;
              text-align: center;
              border: 1px solid #1B2A4A;
              text-transform: uppercase;
              letter-spacing: 0.4px;
            }
            
            /* Bloques de información y suplementación */
            .info-card {
              background: #FAFBFD;
              border: 1px solid #DDE2EA;
              border-left: 4px solid #8BC53F;
              border-radius: 6px;
              padding: 10px 14px;
              margin-top: 10px;
              margin-bottom: 14px;
              page-break-inside: avoid;
            }
            .info-card-title {
              font-family: 'Manrope', 'Inter', sans-serif;
              font-size: 11px;
              font-weight: 900;
              color: #1B2A4A;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .info-card ul {
              margin: 0;
              padding-left: 18px;
              font-size: 11px;
              color: #2E2E2E;
              line-height: 1.45;
            }
            
            .market-page {
              page-break-before: always !important;
              break-before: page !important;
              display: flex !important;
              flex-direction: column !important;
              min-height: 236mm;
              box-sizing: border-box;
              padding-top: 6px;
            }
            .market-content {
              flex-shrink: 0;
            }
            
            /* Bloque de firma y marca del entrenador (Pie de página único al final de la hoja) */
            .bottom-section {
              margin-top: auto !important;
              padding-top: 14px;
              border-top: 1px dashed #CBD2E0;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              gap: 16px;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
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
              letter-spacing: 0.3px;
            }
            .trainer-role {
              font-size: 10.5px;
              font-weight: 800;
              color: #4B7A1F;
              letter-spacing: 0.5px;
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
          <div class="document-container">
            <!-- ==================== ENCABEZADO ÚNICO ==================== -->
            <div class="header-banner">
              <div class="banner-left">
                <div class="banner-accent"></div>
                <div class="banner-title-wrap">
                  <h1 class="header-title">PROGRAMA NUTRICIONAL</h1>
                  <div class="header-subtitle-row">
                    <span class="goal-tag">${goalUpper}</span>
                    <span>·</span>
                    <span>PLAN DE ALIMENTACIÓN Y MERCADO</span>
                  </div>
                </div>
              </div>
              ${trainerLogoHtml}
            </div>

            <!-- META DATOS DEL CLIENTE -->
            <div class="client-meta-card">
              <div class="meta-item">
                <span class="meta-label">Asesorado</span>
                <span class="meta-val">${client.full_name}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Versión</span>
                <span class="meta-val">${versionLabel}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Fecha de Emisión</span>
                <span class="meta-val">${formattedDate}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Objetivo</span>
                <span class="meta-val">${goalUpper}</span>
              </div>
            </div>

            <!-- ==================== PÁGINA 1: DISTRIBUCIÓN DE COMIDAS ==================== -->
            <div class="section-title">Distribución de Comidas y Menú</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 24%;">Comida</th>
                  <th style="width: 38%;">Opción 1</th>
                  <th style="width: 38%;">Opción 2</th>
                </tr>
              </thead>
              <tbody>
                ${mealRowsHtml || '<tr><td colspan="3" style="padding: 12px; text-align: center; color: #8B93A3;">No hay comidas configuradas en el plan.</td></tr>'}
              </tbody>
            </table>

            <!-- PAUTAS Y SUPLEMENTACIÓN (EN PÁGINA 1) -->
            <div class="info-card">
              <div class="info-card-title">PAUTAS CLAVE Y SUPLEMENTACIÓN</div>
              <ul>
                <li>Hidratación: Mínimo <strong>${planData.waterLiters || '2.5'} Lts</strong> de agua al día.</li>
                ${supplementsListHtml}
              </ul>
            </div>

            <!-- ==================== PÁGINA 2: LISTA DE MERCADO Y PIE AL FINAL ==================== -->
            ${
              marketRowsHtml
                ? `
              <div class="market-page">
                <div class="market-content">
                  <div class="section-title">Lista de Mercado Recomendada</div>
                  <table>
                    <thead>
                      <tr>
                        <th style="width: 30%;">Macro nutriente</th>
                        <th style="width: 70%;">Alimentos Sugeridos</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${marketRowsHtml}
                    </tbody>
                  </table>
                </div>

                <div class="bottom-section">
                  <div class="doc-meta">
                    Generado con CoplanFit Pro · Cliente: ${client.full_name} · ${formattedDate}
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
            `
                : `
              <div class="bottom-section">
                <div class="doc-meta">
                  Generado con CoplanFit Pro · Cliente: ${client.full_name} · ${formattedDate}
                </div>

                <div class="trainer-signature">
                  <div class="trainer-info">
                    <div class="trainer-name">${trainerName}</div>
                    <div class="trainer-role">${businessName}</div>
                    ${trainerDescription}
                  </div>
                </div>
              </div>
            `
            }
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
