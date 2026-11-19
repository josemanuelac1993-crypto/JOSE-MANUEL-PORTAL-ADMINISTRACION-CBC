import { Incident } from '../types';

export interface SheetMetadata {
  id: string;
  title: string;
  sheetNames: string[];
  spreadsheetUrl: string;
}

/**
 * Creates or syncs all incidents to a Google Sheet in the user's Google Drive
 */
export async function exportToGoogleSheet(
  accessToken: string,
  incidents: Incident[],
  title?: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; rowsCount: number }> {
  const sheetTitle = title || `Matriz Novedades Tesalia CBC - ${new Date().toLocaleDateString('es-EC')}`;

  // 1. Create a new Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: sheetTitle,
      },
      sheets: [
        {
          properties: {
            title: 'NOVEDADES_CONSOLIDADAS',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Error al crear Google Sheet: ${err}`);
  }

  const createdSheet = await createRes.json();
  const spreadsheetId = createdSheet.spreadsheetId;
  const spreadsheetUrl = createdSheet.spreadsheetUrl;

  // 2. Prepare tabular data rows
  const headers = [
    'ID Registro',
    'Código',
    'Sección Principal',
    'Sub-Sección',
    'Clasificación',
    'Item Específico',
    'Sucursal',
    'Ubicación Detallada',
    'Título de Novedad',
    'Descripción',
    'Fecha Registro',
    'Mes',
    'Año',
    'Severidad',
    'Estado',
    'Operador Responsable',
    'Turno Operador',
    'Reportado a Legio',
    'Ticket Legio',
    'Caso Resuelto CCTV',
    'Total Fotos Evidencia',
  ];

  const rows = incidents.map(inc => [
    inc.id,
    inc.code,
    inc.mainSection === 'SEGURIDAD_FISICA' ? 'SEGURIDAD FÍSICA' : 'SSOMA',
    inc.subSection,
    inc.classificationType,
    inc.item,
    inc.branch,
    inc.specificLocation,
    inc.title,
    inc.description,
    inc.timestamp,
    inc.month,
    inc.year,
    inc.severity,
    inc.status,
    inc.operator?.name || 'Operador',
    inc.operator?.shift || '',
    inc.reportedToLegio ? 'SÍ' : 'NO',
    inc.legioTicketNumber || '',
    inc.cctvCaseResolved ? 'SÍ' : 'NO',
    inc.evidenceImages?.length || 0,
  ]);

  const values = [headers, ...rows];

  // 3. Write data to sheet
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/NOVEDADES_CONSOLIDADAS!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.text();
    throw new Error(`Error al insertar datos en Google Sheet: ${err}`);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    rowsCount: incidents.length,
  };
}

/**
 * Fetches sheet names and metadata for an existing Google Sheet
 */
export async function getSpreadsheetDetails(
  accessToken: string,
  spreadsheetId: string
): Promise<SheetMetadata> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties,sheets.properties`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Error al leer metadata del Google Sheet: ${res.statusText}`);
  }

  const data = await res.json();
  const sheetNames = (data.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);

  return {
    id: spreadsheetId,
    title: data.properties?.title || 'Google Sheet',
    sheetNames,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

/**
 * Reads row values from a Google Sheet to convert into raw tabular rows for batch processing
 */
export async function readGoogleSheetRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName?: string
): Promise<string[][]> {
  const targetSheet = sheetName || 'Sheet1';
  const range = encodeURIComponent(`${targetSheet}!A1:Z500`);
  
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    // Try without sheet prefix if failed
    const fallbackRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z500`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!fallbackRes.ok) {
      throw new Error(`Error al leer celdas del Google Sheet: ${res.statusText}`);
    }
    const fbData = await fallbackRes.json();
    return fbData.values || [];
  }

  const data = await res.json();
  return data.values || [];
}
