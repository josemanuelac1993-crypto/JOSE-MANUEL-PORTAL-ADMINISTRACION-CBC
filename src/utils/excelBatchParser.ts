import * as XLSX from 'xlsx';
import { BRANCHES, Branch, Incident, MainSection, Severity, TAXONOMY } from '../types';
import { ExtractedImage } from './excelImageExtractor';

export interface ParsedBatchRow {
  tempId: string;
  selected: boolean;
  rowNumber: number;
  sheetName: string;
  code: string;
  mainSection: MainSection;
  subSection: string;
  classificationType: string;
  item: string;
  branch: Branch;
  specificLocation: string;
  title: string;
  description: string;
  timestamp: string;
  month: string;
  year: number;
  severity: Severity;
  status: 'ABIERTO' | 'EN_GESTION' | 'RESUELTO' | 'REPORTADO_LEGIO';
  reportedToLegio: boolean;
  legioTicketNumber?: string;
  cctvCaseResolved: boolean;
  operatorName?: string;
  actionsTaken?: string;
  involved?: string;
  evidenceImages: string[];
}

// Exact taxonomy lookup by TIPO and NT as defined in Tesalia CBC / Liderman matrices
const CSESE_NT_MAP: Record<number, string> = {
  1: 'FALLA DE PUERTAS Y VENTANAS (CHAPAS, OTROS)',
  2: 'FALLA DE COMUNICACIÓN',
  3: 'FALLA DE ILUMINACIÓN (INTERNA Y EXTERNA)',
  4: 'FALLA DE ALARMAS (CERCO ELÉCTRICO, SENSORES, OTROS)',
  5: 'FALLA DE CCTV (CAMARA, MONITOR, GRABACIÓN)',
  6: 'FALLA DE PESAJE, BALANZA',
  7: 'OTROS 2',
};

const ASESE_NT_MAP: Record<number, string> = {
  1: 'ROBOS, PÉRDIDAS / SUSTRACCIONES / DECOMISOS DEVOLUCIONES',
  2: 'PRENDAS PRODUCTOS Y EQUIPOS ABANDONADOS',
  3: 'VEHICULOS / PERSONAS SOSPECHOSAS',
  4: 'AUTORIZACIÓN DE SALIDA DE MATERIAL EN FORMA VERBAL',
  5: 'SINTOMAS DE EMBRIAGUEZ, ESTADO ETÍLICO',
  6: 'ERROR DE DOCUMENTO, MAL DESPACHO',
  7: 'PUERTAS Y VENTANAS ABIERTAS O SIN SEGURO',
  8: 'VEHICULOS ABIERTOS O SIN SEGURO',
  9: 'OTROS 1',
};

const CSESA_NT_MAP: Record<number, string> = {
  1: 'ESTIBAS MAL UBICADAS O MAL REALIZADAS',
  2: 'BLOQUEO DE EQUIPOS DE CONTRA INCENDIO',
  3: 'DAÑOS MATERIALES (CAIDA O DAÑOS DE ACTIVOS DEL CLIENTE)',
  4: 'FALTA DE EXTINTORES O FECHAS VENCIDAS',
  5: 'FALTA DE SEÑALIZACIÓN O INADECUADA',
  6: 'FALTA DE SEÑALIZACIÓN O INADECUADA', // Pasos de seguridad despintados
  7: 'BLOQUEO DE PUERTAS DE EMERGENCIA',
  8: 'CABLES EXPUESTOS',
  9: 'PISOS MOJADOS / RESBALOSOS',
  10: 'OTROS CONDICIONES / SAFETY',
};

const MONTH_NAMES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

/**
 * Intelligent branch matching for Tesalia CBC 6 official branches
 */
export function matchBranch(text?: string): Branch {
  if (!text) return 'Tesalia Planta Gye';
  const clean = text.toLowerCase().trim();

  if (clean.includes('milagro')) return 'Planta Milagro';
  if (clean.includes('sur') || clean.includes('gye sur')) return 'Ag. Gye Sur';
  if (clean.includes('norte') || clean.includes('gye norte')) return 'Ag. Gye Norte';
  if (clean.includes('manta')) return 'Ag. Manta';
  if (clean.includes('machala')) return 'Planta Machala';
  if (clean.includes('planta') || clean.includes('guayaquil') || clean.includes('gye')) return 'Tesalia Planta Gye';

  return 'Tesalia Planta Gye';
}

/**
 * Match month from text or number
 */
export function normalizeMonth(monthVal: any): string {
  if (typeof monthVal === 'number' && monthVal >= 1 && monthVal <= 12) {
    return MONTH_NAMES[monthVal - 1];
  }
  const clean = String(monthVal || '').toUpperCase().trim();
  if (clean.includes('ENE')) return 'ENERO';
  if (clean.includes('FEB')) return 'FEBRERO';
  if (clean.includes('MAR')) return 'MARZO';
  if (clean.includes('ABR')) return 'ABRIL';
  if (clean.includes('MAY')) return 'MAYO';
  if (clean.includes('JUN')) return 'JUNIO';
  if (clean.includes('JUL')) return 'JULIO';
  if (clean.includes('AGO')) return 'AGOSTO';
  if (clean.includes('SEP') || clean.includes('SET')) return 'SEPTIEMBRE';
  if (clean.includes('OCT')) return 'OCTUBRE';
  if (clean.includes('NOV')) return 'NOVIEMBRE';
  if (clean.includes('DIC')) return 'DICIEMBRE';

  return new Date().toLocaleString('es-EC', { month: 'long' }).toUpperCase();
}

export function getMonthIndex(monthName: string): number {
  const norm = normalizeMonth(monthName);
  const idx = MONTH_NAMES.indexOf(norm);
  return idx >= 0 ? idx : new Date().getMonth();
}

/**
 * Parses exact taxonomy from TIPO, NT, and Description
 */
export function resolveTaxonomyFromReport(
  rawTipo?: string,
  rawNT?: number | string,
  description?: string,
  rawItem?: string,
  rawSeccion?: string
): {
  mainSection: MainSection;
  subSection: string;
  classificationType: string;
  item: string;
} {
  // If an exact taxonomy item was selected from the dropdown, honor it directly!
  if (rawItem) {
    const cleanItem = rawItem.toUpperCase().trim();
    for (const group of TAXONOMY) {
      const found = group.items.find(it => it.toUpperCase() === cleanItem || cleanItem.includes(it.toUpperCase()));
      if (found) {
        const section: MainSection = (rawSeccion && (rawSeccion.includes('SSOMA') || rawSeccion.includes('SEGURIDAD')))
          ? (rawSeccion.includes('SSOMA') ? 'SSOMA' : 'SEGURIDAD_FISICA')
          : group.mainSection;
        return {
          mainSection: section,
          subSection: group.subSection,
          classificationType: group.classificationType,
          item: found,
        };
      }
    }
  }

  const tipo = String(rawTipo || '').trim().toUpperCase();
  const nt = Number(rawNT) || 0;
  const desc = (description || '').toLowerCase();

  // 1. Check for corte de energía / fluido eléctrico (Priority keyword match)
  if (
    desc.includes('energía') || 
    desc.includes('energia') || 
    desc.includes('fluido eléctrico') || 
    desc.includes('fluido electrico') || 
    desc.includes('generador') || 
    desc.includes('sin suministro eléctrico') || 
    desc.includes('eléctrica pública')
  ) {
    return {
      mainSection: 'SSOMA',
      subSection: 'SAFETY',
      classificationType: 'Condiciones Subestándares',
      item: 'CORTE DE FLUIDO ELÉCTRICO INT./ EXT.',
    };
  }

  // 2. Exact match for CSESE (Condiciones Subestándares Security)
  if (tipo.includes('CSESE') || (tipo.includes('CONDICION') && (tipo.includes('SEC') || tipo.includes('FISIC')))) {
    const item = CSESE_NT_MAP[nt] || matchTaxonomyByKeywords(desc, 'CSESE');
    return {
      mainSection: 'SEGURIDAD_FISICA',
      subSection: 'SECURITY',
      classificationType: 'Condiciones Subestándares',
      item,
    };
  }

  // 3. Exact match for ASESE (Actos Subestándares Security)
  if (tipo.includes('ASESE') || (tipo.includes('ACTO') && (tipo.includes('SEC') || tipo.includes('FISIC')))) {
    const item = ASESE_NT_MAP[nt] || matchTaxonomyByKeywords(desc, 'ASESE');
    return {
      mainSection: 'SEGURIDAD_FISICA',
      subSection: 'SECURITY',
      classificationType: 'Actos Subestándares',
      item,
    };
  }

  // 4. Exact match for CSESA (Condiciones Subestándares Safety / SSOMA)
  if (tipo.includes('CSESA') || (tipo.includes('CONDICION') && (tipo.includes('SSOMA') || tipo.includes('SAFE')))) {
    let item = CSESA_NT_MAP[nt];
    if (!item) {
      if (desc.includes('paso') || desc.includes('pint') || desc.includes('señal')) {
        item = 'FALTA DE SEÑALIZACIÓN O INADECUADA';
      } else if (desc.includes('hueco') || desc.includes('pared') || desc.includes('daño') || desc.includes('malla')) {
        item = 'DAÑOS MATERIALES (CAIDA O DAÑOS DE ACTIVOS DEL CLIENTE)';
      } else {
        item = matchTaxonomyByKeywords(desc, 'CSESA');
      }
    }
    return {
      mainSection: 'SSOMA',
      subSection: 'SAFETY',
      classificationType: 'Condiciones Subestándares',
      item,
    };
  }

  // 5. Exact match for ASESA (Actos Subestándares Safety / SSOMA)
  if (tipo.includes('ASESA') || (tipo.includes('ACTO') && (tipo.includes('SSOMA') || tipo.includes('SAFE')))) {
    return {
      mainSection: 'SSOMA',
      subSection: 'SAFETY',
      classificationType: 'Actos Subestándares',
      item: matchTaxonomyByKeywords(desc, 'ASESA'),
    };
  }

  // Fallback keyword matching
  const matched = matchTaxonomyByGeneral(desc);
  return matched;
}

function matchTaxonomyByKeywords(desc: string, scope: 'CSESE' | 'ASESE' | 'CSESA' | 'ASESA'): string {
  if (scope === 'CSESE') {
    if (desc.includes('puerta') || desc.includes('porton') || desc.includes('chapa') || desc.includes('candado') || desc.includes('esclusa')) {
      return 'FALLA DE PUERTAS Y VENTANAS (CHAPAS, OTROS)';
    }
    if (desc.includes('alarma') || desc.includes('cerco') || desc.includes('sensor')) {
      return 'FALLA DE ALARMAS (CERCO ELÉCTRICO, SENSORES, OTROS)';
    }
    if (desc.includes('cctv') || desc.includes('camara') || desc.includes('grab')) {
      return 'FALLA DE CCTV (CAMARA, MONITOR, GRABACIÓN)';
    }
    if (desc.includes('luz') || desc.includes('iluminac')) {
      return 'FALLA DE ILUMINACIÓN (INTERNA Y EXTERNA)';
    }
    if (desc.includes('comunic') || desc.includes('radio')) {
      return 'FALLA DE COMUNICACIÓN';
    }
    return 'OTROS 2';
  }

  if (scope === 'CSESA') {
    if (desc.includes('energía') || desc.includes('fluido') || desc.includes('generador')) {
      return 'CORTE DE FLUIDO ELÉCTRICO INT./ EXT.';
    }
    if (desc.includes('paso') || desc.includes('señal') || desc.includes('pint')) {
      return 'FALTA DE SEÑALIZACIÓN O INADECUADA';
    }
    if (desc.includes('extintor') || desc.includes('fuego')) {
      return 'BLOQUEO DE EQUIPOS DE CONTRA INCENDIO';
    }
    if (desc.includes('estiba')) {
      return 'ESTIBAS MAL UBICADAS O MAL REALIZADAS';
    }
    if (desc.includes('cable')) {
      return 'CABLES EXPUESTOS';
    }
    if (desc.includes('mojad') || desc.includes('resbal')) {
      return 'PISOS MOJADOS / RESBALOSOS';
    }
    return 'DAÑOS MATERIALES (CAIDA O DAÑOS DE ACTIVOS DEL CLIENTE)';
  }

  return 'OTROS 1';
}

function matchTaxonomyByGeneral(desc: string): {
  mainSection: MainSection;
  subSection: string;
  classificationType: string;
  item: string;
} {
  const ssomaKeywords = ['extintor', 'evacuacion', 'estiba', 'epp', 'casco', 'guante', 'bota', 'humedo', 'cable', 'derrame', 'desecho', 'conato', 'fuego', 'incendio', 'accidente', 'salud', 'paso', 'pintado', 'hueco', 'energía', 'fluido', 'generador'];
  const isSsoma = ssomaKeywords.some(k => desc.includes(k));

  if (isSsoma) {
    if (desc.includes('energía') || desc.includes('fluido') || desc.includes('generador')) {
      return {
        mainSection: 'SSOMA',
        subSection: 'SAFETY',
        classificationType: 'Condiciones Subestándares',
        item: 'CORTE DE FLUIDO ELÉCTRICO INT./ EXT.',
      };
    }
    return {
      mainSection: 'SSOMA',
      subSection: 'SAFETY',
      classificationType: 'Condiciones Subestándares',
      item: 'FALTA DE SEÑALIZACIÓN O INADECUADA',
    };
  }

  return {
    mainSection: 'SEGURIDAD_FISICA',
    subSection: 'SECURITY',
    classificationType: 'Condiciones Subestándares',
    item: 'FALLA DE PUERTAS Y VENTANAS (CHAPAS, OTROS)',
  };
}

/**
 * Parses an Excel Workbook into discrete individual incident rows.
 * Automatically attaches any photo anchored to that EXACT ROW in Excel drawings!
 */
export function parseExcelWorkbookToIncidents(
  workbook: XLSX.WorkBook,
  extractedImages: ExtractedImage[] = []
): ParsedBatchRow[] {
  const parsedRows: ParsedBatchRow[] = [];
  const currentYear = new Date().getFullYear();

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, blankrows: false });
    if (!rawData || rawData.length < 2) return;

    // Detect Sheet-level metadata (e.g. LUGAR Y FECHA, OPERADOR, CLIENTE, MES)
    let sheetCliente: string | null = null;
    let sheetMes: string | null = null;
    let sheetDia: number | null = null;
    let sheetYear: number = currentYear;
    let sheetOperador: string | null = null;

    for (let r = 0; r < Math.min(8, rawData.length); r++) {
      const row = rawData[r];
      if (!Array.isArray(row)) continue;
      const rowText = row.map(c => String(c || '')).join(' ');

      const clienteMatch = rowText.match(/(?:CLIENTE|LOCALIDAD)\s*:\s*([^,;\n]+)/i);
      if (clienteMatch) sheetCliente = clienteMatch[1].trim();

      const mesMatch = rowText.match(/MES\s*:\s*([^,;\n]+)/i);
      if (mesMatch) sheetMes = mesMatch[1].trim();

      // e.g. "LUGAR Y FECHA: GUAYAQUIL, DOMINGO 27 DE SEPTIEMBRE DEL 2026."
      const dateMatch = rowText.match(/(\d{1,2})\s+DE\s+([A-ZÁÉÍÓÚ]+)\s+DEL?\s+(\d{4})/i);
      if (dateMatch) {
        sheetDia = parseInt(dateMatch[1], 10);
        sheetMes = dateMatch[2].toUpperCase();
        sheetYear = parseInt(dateMatch[3], 10);
      }

      // e.g. "OPERADOR: RONALD REYES."
      const opMatch = rowText.match(/OPERADOR\s*:\s*([^,;\n.]+)/i);
      if (opMatch) sheetOperador = opMatch[1].trim();
    }

    // Detect Header Row
    let headerRowIndex = -1;
    for (let r = 0; r < Math.min(10, rawData.length); r++) {
      const row = rawData[r];
      if (!Array.isArray(row)) continue;
      const rowStrings = row.map(c => String(c || '').trim().toLowerCase());
      
      const hasReportHeaders = rowStrings.some(h => 
        h.includes('unidad') || 
        h.includes('planta') || 
        h.includes('localidad') || 
        h.includes('área') || 
        h.includes('area') || 
        h.includes('tipo') || 
        h.includes('descripci') || 
        h.includes('seguimiento') || 
        h.includes('imagen')
      );
      if (hasReportHeaders && rowStrings.filter(Boolean).length >= 3) {
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Check for Monthly Matrix format (Image 1: CONDICIONES SUB ESTANDARES ... ENE, FEB, MAR)
      parseMonthlyMatrixFormat(rawData, sheetName, sheetCliente, currentYear, parsedRows);
      return;
    }

    const headers = (rawData[headerRowIndex] || []).map(h => String(h || '').trim().toLowerCase());

    const findCol = (keywords: string[]) => {
      return headers.findIndex(h => keywords.some(k => h === k || h.includes(k)));
    };

    const numCol = findCol(['n.º', 'nº', 'no.', 'n.', 'item', '#']);
    const localidadCol = findCol(['localidad', 'ciudad']);
    const unidadCol = findCol(['planta / agencia', 'planta/agencia', 'planta', 'agencia', 'unidad', 'sucursal', 'cliente']);
    const mesCol = findCol(['mes']);
    const diaCol = findCol(['fecha', 'date', 'dia', 'día']);
    const horaCol = findCol(['hora', 'time']);
    const areaCol = findCol(['área', 'area', 'lugar', 'puesto', 'ubicación', 'ubicacion']);
    const pisoCol = findCol(['piso', 'nivel']);
    const ntCol = findCol(['nt', 'nro tipo', 'no tipo']);
    const tipoCol = findCol(['tipo', 'sección', 'seccion', 'clasificacion']);
    const descCol = findCol(['descripción del incidente', 'descripcion del incidente', 'descripción', 'descripcion', 'novedad', 'detalle']);
    const seguimientoCol = findCol(['seguimiento', 'estado', 'status']);
    const seccionCol = findCol(['sección', 'seccion', 'departamento']);
    const itemCol = findCol(['item_taxonomia', 'item taxonomia', 'ítem de la matriz', 'ítem', 'item']);
    const involucradoCol = findCol(['involucrado']);
    const informaCol = findCol(['informa', 'operador', 'reporta', 'guardia', 'responsable']);
    const accionCol = findCol(['acción adoptada', 'accion adoptada', 'accion', 'acciones']);

    // Parse data rows
    for (let r = headerRowIndex + 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rawNum = numCol >= 0 ? row[numCol] : r - headerRowIndex;
      const rawLocalidad = localidadCol >= 0 ? String(row[localidadCol] || '').trim() : '';
      const rawUnidad = unidadCol >= 0 ? String(row[unidadCol] || '').trim() : '';
      const rawMes = mesCol >= 0 ? row[mesCol] : null;
      const rawDia = diaCol >= 0 ? row[diaCol] : null;
      const rawHora = horaCol >= 0 ? row[horaCol] : null;
      const rawArea = areaCol >= 0 ? String(row[areaCol] || '').trim() : '';
      const rawPiso = pisoCol >= 0 ? String(row[pisoCol] || '').trim() : '';
      const rawNT = ntCol >= 0 ? row[ntCol] : '';
      const rawTipo = tipoCol >= 0 ? String(row[tipoCol] || '').trim() : '';
      const rawDesc = descCol >= 0 ? String(row[descCol] || '').trim() : '';
      const rawSeguimiento = seguimientoCol >= 0 ? String(row[seguimientoCol] || '').trim().toUpperCase() : '';
      const rawSeccion = seccionCol >= 0 ? String(row[seccionCol] || '').trim().toUpperCase() : '';
      const rawItem = itemCol >= 0 ? String(row[itemCol] || '').trim() : '';
      const rawInvolucrado = involucradoCol >= 0 ? String(row[involucradoCol] || '').trim() : 'N/A';
      const rawInforma = informaCol >= 0 ? String(row[informaCol] || '').trim() : '';
      const rawAccion = accionCol >= 0 ? String(row[accionCol] || '').trim() : '';

      // Skip row if empty
      if (!rawDesc && !rawArea && !rawTipo && !rawUnidad && !rawLocalidad) continue;

      // Resolve branch from Unidad, Localidad, or Sheet metadata
      const branchText = rawUnidad || rawLocalidad || sheetCliente || sheetName;
      const matchedBranch = matchBranch(branchText);

      // Resolve month & date in LOCAL SYSTEM TIME
      let monthName = normalizeMonth(rawMes || sheetMes);
      let monthIdx = getMonthIndex(monthName);
      let dayNum = Number(rawDia) || sheetDia || 1;
      let yearNum = sheetYear || currentYear;
      let hours = 12;
      let minutes = 0;
      let seconds = 0;

      // Handle multi-format dates per row (allowing multiple dates in a single uploaded file)
      if (typeof rawDia === 'number' && rawDia > 1000) {
        const d = XLSX.SSF.parse_date_code(rawDia);
        if (d) {
          if (d.y) yearNum = d.y;
          dayNum = d.d;
          monthIdx = d.m - 1;
          monthName = MONTH_NAMES[monthIdx];
          if (d.H !== undefined) hours = d.H;
          if (d.M !== undefined) minutes = d.M;
          if (d.S !== undefined) seconds = Math.floor(d.S);
        }
      } else if (typeof rawDia === 'string') {
        const s = rawDia.trim();
        if (s.includes('/') || s.includes('-')) {
          const sep = s.includes('/') ? '/' : '-';
          const parts = s.split(sep);
          if (parts.length === 3) {
            let y = currentYear;
            let m = 0;
            let d = 1;
            if (parts[0].length === 4) {
              // YYYY-MM-DD or YYYY/MM/DD
              y = parseInt(parts[0], 10);
              m = parseInt(parts[1], 10) - 1;
              d = parseInt(parts[2], 10);
            } else {
              // DD/MM/YYYY or DD-MM-YYYY
              d = parseInt(parts[0], 10);
              m = parseInt(parts[1], 10) - 1;
              y = parseInt(parts[2], 10);
            }
            if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m < 12 && d >= 1 && d <= 31) {
              yearNum = y;
              monthIdx = m;
              dayNum = d;
              monthName = MONTH_NAMES[monthIdx];
            }
          } else {
            const parsed = new Date(s);
            if (!isNaN(parsed.getTime())) {
              yearNum = parsed.getFullYear();
              dayNum = parsed.getDate();
              monthIdx = parsed.getMonth();
              monthName = MONTH_NAMES[monthIdx];
            }
          }
        }
      }

      // Resolve time
      if (rawHora !== null && rawHora !== undefined) {
        if (typeof rawHora === 'string') {
          const timeStr = rawHora.trim().toLowerCase();
          const isPM = timeStr.includes('pm') || timeStr.includes('p.m.') || timeStr.includes('p. m.');
          const isAM = timeStr.includes('am') || timeStr.includes('a.m.') || timeStr.includes('a. m.');
          const cleanTime = timeStr.replace(/[^\d:]/g, '');
          const parts = cleanTime.split(':').map(Number);
          if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            hours = parts[0];
            if (isPM && hours < 12) hours += 12;
            if (isAM && hours === 12) hours = 0;
            minutes = parts[1];
            seconds = parts[2] || 0;
          }
        } else if (typeof rawHora === 'number') {
          if (rawHora < 1) {
            const totalSeconds = Math.round(rawHora * 86400);
            hours = Math.floor(totalSeconds / 3600) % 24;
            minutes = Math.floor((totalSeconds % 3600) / 60);
            seconds = totalSeconds % 60;
          } else {
            const d = XLSX.SSF.parse_date_code(rawHora);
            if (d) {
              if (d.H !== undefined) hours = d.H;
              if (d.M !== undefined) minutes = d.M;
              if (d.S !== undefined) seconds = Math.floor(d.S);
            }
          }
        }
      }

      // Create DATE IN LOCAL SYSTEM TIME
      const safeDay = Math.min(Math.max(1, dayNum), 31);
      const incidentDate = new Date(yearNum, monthIdx, safeDay, hours, minutes, seconds);

      // Resolve exact taxonomy (honoring direct dropdown selection if present)
      const taxonomy = resolveTaxonomyFromReport(rawTipo || rawSeccion, rawNT, rawDesc, rawItem, rawSeccion);

      // Specific Location
      const locationParts = [rawArea || rawLocalidad || rawUnidad];
      if (rawPiso) locationParts.push(`Piso: ${rawPiso}`);
      const specificLocation = locationParts.filter(Boolean).join(' - ') || 'Área Operativa';

      // Status
      let status: 'ABIERTO' | 'EN_GESTION' | 'RESUELTO' | 'REPORTADO_LEGIO' = 'ABIERTO';
      if (rawSeguimiento.includes('PROCESO') || rawSeguimiento.includes('GESTION')) {
        status = 'EN_GESTION';
      } else if (rawSeguimiento.includes('RESUELTO') || rawSeguimiento.includes('CERRADO')) {
        status = 'RESUELTO';
      } else if (rawSeguimiento.includes('LEGIO')) {
        status = 'REPORTADO_LEGIO';
      }

      // Title
      let title = taxonomy.item;
      if (rawDesc) {
        const cleanDesc = rawDesc.replace(/^buenas noches[.,\s]*/i, '').replace(/^estimado[^:\n]+[:\n]*/i, '').trim();
        const firstSentence = cleanDesc.split(/[.\n]/)[0]?.trim();
        title = firstSentence && firstSentence.length > 10 && firstSentence.length < 70 
          ? firstSentence 
          : `${taxonomy.item} - ${rawArea || matchedBranch}`;
      }

      // Operator Name
      const operatorName = rawInforma || sheetOperador || 'Operador Liderman / Consola';

      // 🎯 EXACT ROW IMAGE ANCHORING:
      // Match any image that is anchored to THIS exact row in this sheet
      const rowImages = extractedImages.filter(img => 
        (img.sheetName === sheetName || !img.sheetName) &&
        img.isAnchoredToRow &&
        (img.rowIndex === r || (img.rowIndex !== undefined && Math.abs(img.rowIndex - r) <= 1))
      ).map(img => img.dataUrl);

      parsedRows.push({
        tempId: `row-${sheetName}-${r}-${Date.now()}`,
        selected: true,
        rowNumber: r + 1,
        sheetName,
        code: `NOV-${String(rawNum || r).padStart(3, '0')}`,
        mainSection: taxonomy.mainSection,
        subSection: taxonomy.subSection,
        classificationType: taxonomy.classificationType,
        item: taxonomy.item,
        branch: matchedBranch,
        specificLocation,
        title,
        description: rawDesc || title,
        timestamp: incidentDate.toISOString(),
        month: monthName,
        year: yearNum,
        severity: taxonomy.item.includes('CORTE') || taxonomy.item.includes('ROBO') ? 'ALTA' : 'MEDIA',
        status,
        reportedToLegio: false,
        cctvCaseResolved: rowImages.length > 0,
        operatorName,
        actionsTaken: rawAccion || rawSeguimiento || '',
        involved: rawInvolucrado,
        evidenceImages: rowImages,
      });
    }
  });

  return parsedRows;
}

/**
 * Parses monthly matrix format (Image 1) with columns ENE, FEB, MAR, ABRL, etc.
 */
function parseMonthlyMatrixFormat(
  rawData: any[][],
  sheetName: string,
  sheetCliente: string | null,
  currentYear: number,
  outputRows: ParsedBatchRow[]
) {
  for (let r = 0; r < rawData.length; r++) {
    const row = rawData[r];
    if (!Array.isArray(row)) continue;
    const rowStrings = row.map(c => String(c || '').trim().toUpperCase());

    const eneIdx = rowStrings.findIndex(h => h.includes('ENE'));
    if (eneIdx === -1) continue;

    const monthCols: { monthName: string; colIdx: number }[] = [];
    rowStrings.forEach((colStr, idx) => {
      if (idx >= eneIdx) {
        const m = normalizeMonth(colStr);
        if (m) monthCols.push({ monthName: m, colIdx: idx });
      }
    });

    const matchedBranch = matchBranch(sheetCliente || sheetName);

    for (let rData = r + 1; rData < rawData.length; rData++) {
      const dataRow = rawData[rData];
      if (!Array.isArray(dataRow) || dataRow.length === 0) continue;

      const itemName = String(dataRow[1] || dataRow[0] || '').trim();
      if (!itemName || itemName.toUpperCase().includes('TOTAL') || itemName.length < 3) continue;

      monthCols.forEach(({ monthName, colIdx }) => {
        const count = Number(dataRow[colIdx]) || 0;
        if (count > 0) {
          const taxonomy = resolveTaxonomyFromReport('CSESE', undefined, itemName);

          for (let c = 0; c < count; c++) {
            const mIdx = getMonthIndex(monthName);
            const date = new Date(currentYear, mIdx, 15, 14, 0, 0);

            outputRows.push({
              tempId: `matrix-${sheetName}-${rData}-${monthName}-${c}-${Date.now()}`,
              selected: true,
              rowNumber: rData + 1,
              sheetName,
              code: `MAT-${outputRows.length + 1}`,
              mainSection: taxonomy.mainSection,
              subSection: taxonomy.subSection,
              classificationType: taxonomy.classificationType,
              item: itemName.toUpperCase(),
              branch: matchedBranch,
              specificLocation: 'Área General de Planta',
              title: `${itemName} (${monthName})`,
              description: `Registro consolidado de ${itemName} para ${monthName} en ${matchedBranch}.`,
              timestamp: date.toISOString(),
              month: monthName,
              year: currentYear,
              severity: 'MEDIA',
              status: 'ABIERTO',
              reportedToLegio: false,
              cctvCaseResolved: false,
              operatorName: 'Consola Liderman / Tesalia',
              evidenceImages: [],
            });
          }
        }
      });
    }
    break;
  }
}
