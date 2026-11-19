import ExcelJS from 'exceljs';
import { BRANCHES, TAXONOMY } from '../types';

/**
 * Generates and downloads the official Excel Batch Template with native Data Validation Dropdowns
 * ("pestañas de selección en cada celda") linked to GUIA_TAXONOMIA.
 * Structure:
 * 1. FECHA (Primer ítem para permitir múltiples fechas en un solo archivo)
 * 2. PLANTA / AGENCIA (Lista desplegable de las 6 sucursales oficiales)
 * 3. HORA (Formato 24h, ej: 20:00)
 * 4. IMAGEN (Celda para pegar la captura o foto de cada fila)
 * 5. DESCRIPCION (Detalle completo del evento)
 * 6. SEGUIMIENTO (Lista desplegable: EN PROCESO, ABIERTO, RESUELTO, REPORTADO A LEGIO)
 * 7. SECCION (Lista desplegable: SEGURIDAD_FISICA, SSOMA)
 * 8. ITEM_TAXONOMIA (Lista desplegable del catálogo oficial de taxonomía)
 */
export async function downloadOfficialExcelTemplate(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tesalia CBC - Consola Liderman';
  wb.lastModifiedBy = 'Tesalia CBC';
  wb.created = new Date();
  wb.modified = new Date();

  // ----------------------------------------------------
  // Sheet 2: GUIA_TAXONOMIA (Validation Lists Source)
  // ----------------------------------------------------
  const wsGuia = wb.addWorksheet('GUIA_TAXONOMIA', {
    views: [{ showGridLines: true }]
  });

  wsGuia.columns = [
    { header: 'PLANTA / AGENCIA', key: 'branch', width: 28 },
    { header: 'SECCION', key: 'section', width: 22 },
    { header: 'SEGUIMIENTO', key: 'status', width: 22 },
    { header: 'ITEM_TAXONOMIA', key: 'item', width: 55 },
  ];

  // Header styling for GUIA
  wsGuia.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  wsGuia.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Slate 800
  };

  const branches = [...BRANCHES];
  const sections = ['SEGURIDAD_FISICA', 'SSOMA'];
  const statuses = ['EN PROCESO', 'ABIERTO', 'RESUELTO', 'REPORTADO A LEGIO'];
  
  // Extract unique taxonomy items
  const allItems = Array.from(new Set(TAXONOMY.flatMap(t => t.items)));

  const maxRows = Math.max(branches.length, sections.length, statuses.length, allItems.length);
  for (let i = 0; i < maxRows; i++) {
    wsGuia.addRow({
      branch: branches[i] || '',
      section: sections[i] || '',
      status: statuses[i] || '',
      item: allItems[i] || '',
    });
  }

  // ----------------------------------------------------
  // Sheet 1: BITACORA_NOVEDADES (Data Entry Sheet)
  // ----------------------------------------------------
  const wsMain = wb.addWorksheet('BITACORA_NOVEDADES', {
    views: [{ showGridLines: true }]
  });

  // Row 1: Top Metadata Banner
  wsMain.mergeCells('A1:H1');
  const cellA1 = wsMain.getCell('A1');
  cellA1.value = 'BITÁCORA GENERAL DE NOVEDADES - TESALIA CBC & CONSOLA LIDERMAN.    OPERADOR: RONALD REYES.';
  cellA1.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  cellA1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Dark Slate
  };
  cellA1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsMain.getRow(1).height = 28;

  // Row 2: Table Columns Header (FECHA FIRST, then PLANTA / AGENCIA)
  const headers = [
    'FECHA',
    'PLANTA / AGENCIA',
    'HORA',
    'IMAGEN',
    'DESCRIPCION',
    'SEGUIMIENTO',
    'SECCION',
    'ITEM_TAXONOMIA'
  ];
  wsMain.getRow(2).values = headers;
  wsMain.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  wsMain.getRow(2).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF047857' } // Emerald 700
  };
  wsMain.getRow(2).height = 26;

  // Column Widths
  wsMain.columns = [
    { key: 'fecha', width: 14 },
    { key: 'planta', width: 26 },
    { key: 'hora', width: 12 },
    { key: 'imagen', width: 28 },
    { key: 'descripcion', width: 60 },
    { key: 'seguimiento', width: 18 },
    { key: 'seccion', width: 20 },
    { key: 'item', width: 48 },
  ];

  // Sample Rows with multiple different dates across the month/year
  const sampleData = [
    [
      '2026-09-27',
      'Planta Milagro',
      '20:00',
      '[Pegar captura CCTV aquí]',
      'Buenas noches. Estimado Coord. Byron Carrera: Por medio del presente, se informa que el personal de seguridad Liderman reporta que, al momento, Planta Tesalia Milagro se encuentra sin energía eléctrica pública. El Sr. Jordi Maldonado, operador de Envasadora, se encuentra realizando una revisión del área eléctrica a fin de identificar la novedad.',
      'EN PROCESO',
      'SSOMA',
      'CORTE DE FLUIDO ELÉCTRICO INT./ EXT.'
    ],
    [
      '2026-08-03',
      'Ag. Gye Norte',
      '15:26',
      '[Pegar foto aquí]',
      'Pasos de seguridad despintados en patio de maniobras, lo que dificulta su visibilidad y aumenta el riesgo de accidentes peatonales.',
      'EN PROCESO',
      'SSOMA',
      'FALTA DE SEÑALIZACIÓN O INADECUADA'
    ],
    [
      '2026-08-14',
      'Tesalia Planta Gye',
      '08:45',
      '[Pegar foto aquí]',
      'Brazos mecánicos del portón de malla principal no funcionan, se mantiene cerrado de forma manual con cadena y candado temporal.',
      'ABIERTO',
      'SEGURIDAD_FISICA',
      'FALLA DE PUERTAS Y VENTANAS (CHAPAS, OTROS)'
    ],
    [
      '2026-08-18',
      'Ag. Gye Sur',
      '11:15',
      '[Pegar foto aquí]',
      'Cámara de seguridad domo PTZ 04 de perímetro exterior presenta intermitencia y pérdida de señal de video en consola.',
      'EN PROCESO',
      'SEGURIDAD_FISICA',
      'FALLA DE CCTV (CAMARA, MONITOR, GRABACIÓN)'
    ],
    [
      '2026-08-25',
      'Ag. Manta',
      '17:30',
      '[Pegar foto aquí]',
      'Extintor de polvo químico seco PQS de 10 lbs ubicado en área de bodega presenta manómetro en zona de recarga vencida.',
      'RESUELTO',
      'SSOMA',
      'FALTA DE EXTINTORES O FECHAS VENCIDAS'
    ]
  ];

  sampleData.forEach((rowValues) => {
    const row = wsMain.addRow(rowValues);
    row.height = 42;
    row.alignment = { vertical: 'middle', wrapText: true };
  });

  // Apply native Excel Data Validation Dropdowns (pestaña desplegable) to rows 3 to 100
  const branchRange = `=GUIA_TAXONOMIA!$A$2:$A$${branches.length + 1}`;
  const sectionRange = `=GUIA_TAXONOMIA!$B$2:$B$${sections.length + 1}`;
  const statusRange = `=GUIA_TAXONOMIA!$C$2:$C$${statuses.length + 1}`;
  const itemRange = `=GUIA_TAXONOMIA!$D$2:$D$${allItems.length + 1}`;

  for (let r = 3; r <= 100; r++) {
    // Column A: FECHA (Format & Alignment)
    const cellFecha = wsMain.getCell(`A${r}`);
    cellFecha.alignment = { vertical: 'middle', horizontal: 'center' };

    // Column B: PLANTA / AGENCIA
    wsMain.getCell(`B${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [branchRange],
      showErrorMessage: true,
      errorTitle: 'Sucursal no válida',
      error: 'Seleccione una de las 6 sucursales oficiales de Tesalia CBC en la lista desplegable.'
    };

    // Column F: SEGUIMIENTO
    wsMain.getCell(`F${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [statusRange],
      showErrorMessage: true,
      errorTitle: 'Estado no válido',
      error: 'Seleccione uno de los estados permitidos: EN PROCESO, ABIERTO, RESUELTO o REPORTADO A LEGIO.'
    };

    // Column G: SECCION
    wsMain.getCell(`G${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [sectionRange],
      showErrorMessage: true,
      errorTitle: 'Sección no válida',
      error: 'Seleccione SEGURIDAD_FISICA o SSOMA.'
    };

    // Column H: ITEM_TAXONOMIA
    wsMain.getCell(`H${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [itemRange],
      showErrorMessage: false
    };

    // Text wrapping and vertical alignment
    wsMain.getRow(r).alignment = { vertical: 'middle', wrapText: true };
  }

  // Generate buffer and trigger browser download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Plantilla_Oficial_Novedades_Liderman_Tesalia.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
