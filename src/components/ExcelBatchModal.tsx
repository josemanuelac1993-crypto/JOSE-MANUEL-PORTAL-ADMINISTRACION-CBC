import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon, 
  Camera, 
  HardDrive, 
  Layers, 
  Filter, 
  Shield, 
  HardHat, 
  Trash2, 
  Check, 
  Eye, 
  Save, 
  RefreshCw,
  Plus,
  Download
} from 'lucide-react';
import { BRANCHES, Branch, MainSection, Severity, TAXONOMY } from '../types';
import { ParsedBatchRow, parseExcelWorkbookToIncidents } from '../utils/excelBatchParser';
import { extractImagesFromExcel, ExtractedImage } from '../utils/excelImageExtractor';
import { compressImageFile } from '../utils/imageCompressor';
import { downloadOfficialExcelTemplate } from '../utils/excelTemplateGenerator';

interface ExcelBatchModalProps {
  onClose: () => void;
  onImportBatch: (incidents: any[], keepExisting: boolean) => Promise<void>;
  onBackupToDrive?: () => Promise<void>;
  hasDriveAccess?: boolean;
}

export const ExcelBatchModal: React.FC<ExcelBatchModalProps> = ({
  onClose,
  onImportBatch,
  onBackupToDrive,
  hasDriveAccess = false,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ParsedBatchRow[]>([]);
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [selectedSheetFilter, setSelectedSheetFilter] = useState<string>('TODAS');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('TODAS');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [keepExistingData, setKeepExistingData] = useState<boolean>(true);
  const [importing, setImporting] = useState(false);
  const [activeImagePickerRowId, setActiveImagePickerRowId] = useState<string | null>(null);
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const rowImageInputRef = useRef<HTMLInputElement>(null);

  // Handle local Excel file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await processExcelFile(selectedFile);
  };

  const processExcelFile = async (uploadedFile: File) => {
    setLoading(true);
    setFile(uploadedFile);
    try {
      const buffer = await uploadedFile.arrayBuffer();
      // 1. Read workbook with SheetJS
      const workbook = XLSX.read(buffer, { type: 'array' });
      setSheetNames(workbook.SheetNames);

      // 2. Extract embedded images with their exact sheet and row coordinates
      const images = await extractImagesFromExcel(buffer, workbook.SheetNames);
      setExtractedImages(images);

      // 3. Extract discrete incidents row by row and automatically attach the photo of each row!
      const parsed = parseExcelWorkbookToIncidents(workbook, images);
      setRows(parsed);

      if (parsed.length === 0) {
        alert('No se encontraron filas con datos de novedades válidos en el archivo Excel.');
      }
    } catch (err: any) {
      console.error('Error parsing Excel file:', err);
      alert('Error al procesar el archivo Excel: ' + (err.message || 'Formato no soportado.'));
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection
  const handleToggleSelectAll = (checked: boolean) => {
    setRows(prev => prev.map(r => ({ ...r, selected: checked })));
  };

  const handleToggleSelectRow = (tempId: string) => {
    setRows(prev => prev.map(r => r.tempId === tempId ? { ...r, selected: !r.selected } : r));
  };

  // Update row field inline
  const handleUpdateRow = (tempId: string, field: keyof ParsedBatchRow, value: any) => {
    setRows(prev => prev.map(r => {
      if (r.tempId !== tempId) return r;
      return { ...r, [field]: value };
    }));
  };

  // Assign image to a row with immediate server persistence
  const handleAssignExtractedImage = async (tempId: string, dataUrl: string) => {
    try {
      let finalUrl = dataUrl;
      // If it's a base64 data URL, upload to static uploads folder right now
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
        const uploadRes = await fetch('/api/uploads/base64', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, prefix: 'batch' })
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.url) {
          finalUrl = uploadData.url;
        }
      }

      setRows(prev => prev.map(r => {
        if (r.tempId !== tempId) return r;
        const images = Array.isArray(r.evidenceImages) ? [...r.evidenceImages] : [];
        if (!images.includes(finalUrl)) {
          images.push(finalUrl);
        }
        return { ...r, evidenceImages: images };
      }));
    } catch (err) {
      console.error('Error persisting assigned image:', err);
      // Fallback: still attach image
      setRows(prev => prev.map(r => {
        if (r.tempId !== tempId) return r;
        return { ...r, evidenceImages: [...r.evidenceImages, dataUrl] };
      }));
    }
    setActiveImagePickerRowId(null);
  };

  // Remove image from row
  const handleRemoveImageFromRow = (tempId: string, imgIdx: number) => {
    setRows(prev => prev.map(r => {
      if (r.tempId !== tempId) return r;
      const images = [...r.evidenceImages];
      images.splice(imgIdx, 1);
      return { ...r, evidenceImages: images };
    }));
  };

  // Upload custom photo directly to a row
  const handleCustomPhotoToRow = async (e: React.ChangeEvent<HTMLInputElement>, tempId: string) => {
    const photoFile = e.target.files?.[0];
    if (!photoFile) return;

    try {
      const optimized = await compressImageFile(photoFile);
      let finalUrl = optimized;
      const uploadRes = await fetch('/api/uploads/base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: optimized, prefix: 'row-custom' })
      });
      const uploadData = await uploadRes.json();
      if (uploadData.success && uploadData.url) {
        finalUrl = uploadData.url;
      }

      setRows(prev => prev.map(r => {
        if (r.tempId !== tempId) return r;
        return { ...r, evidenceImages: [...r.evidenceImages, finalUrl] };
      }));
    } catch (err) {
      console.error('Error optimizing photo:', err);
    } finally {
      e.target.value = '';
    }
  };

  // Execute Batch Import
  const handleExecuteImport = async () => {
    const selectedRows = rows.filter(r => r.selected);
    if (selectedRows.length === 0) {
      alert('Seleccione al menos una novedad para importar.');
      return;
    }

    setImporting(true);
    try {
      // Automatic backup if Drive is available
      if (hasDriveAccess && onBackupToDrive) {
        setBackupStatus('Creando respaldo de seguridad en Google Drive...');
        await onBackupToDrive();
      }

      await onImportBatch(selectedRows, keepExistingData);
      onClose();
    } catch (err: any) {
      console.error('Error executing batch import:', err);
      alert('Error durante la importación: ' + (err.message || 'Verifique los datos.'));
    } finally {
      setImporting(false);
      setBackupStatus(null);
    }
  };

  // Filtered rows for display
  const filteredRows = rows.filter(r => {
    const matchSheet = selectedSheetFilter === 'TODAS' || r.sheetName === selectedSheetFilter;
    const matchSection = selectedSectionFilter === 'TODAS' || r.mainSection === selectedSectionFilter;
    return matchSheet && matchSection;
  });

  const selectedCount = rows.filter(r => r.selected).length;
  const securityCount = rows.filter(r => r.mainSection === 'SEGURIDAD_FISICA').length;
  const ssomaCount = rows.filter(r => r.mainSection === 'SSOMA').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-slate-900">
                  Actualización Batch desde Excel & Asignación de Imágenes
                </h2>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  Multi-Novedad
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Extrae múltiples novedades de un solo Excel, clasifica según taxonomía oficial y permite asociar capturas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadOfficialExcelTemplate}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs transition-colors"
              title="Descargar archivo modelo con ejemplos y guía"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Descargar Plantilla Base (.xlsx)</span>
              <span className="sm:hidden">Plantilla</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File Upload Zone */}
          {!file ? (
            <div className="space-y-4">
              {/* Template Download Recommendation Banner */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-blue-50 border border-emerald-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-slate-900">
                        Plantilla Oficial Excel (.xlsx) para Carga Masiva
                      </h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-300">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Diseñada para evitar errores de lectura. Incluye columnas estructuradas, las 6 sucursales oficiales de Tesalia CBC, catálogo de taxonomía y celda para pegar la foto de cada fila.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={downloadOfficialExcelTemplate}
                  className="shrink-0 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-transform hover:scale-102"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Plantilla Base</span>
                </button>
              </div>

              {/* Drag and Drop Box */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70 transition-all rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Selecciona o arrastra el archivo Excel (.xlsx, .xls, .csv)
                </h3>
                <p className="text-xs text-slate-500 max-w-md mb-4">
                  El sistema leerá automáticamente cada fila, extraerá la foto anclada a esa fila y asignará sucursal, taxonomía y fecha sin errores.
                </p>
                <span className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors">
                  Examinar Archivo Excel
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* File Info & Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{file.name}</span>
                    <span className="text-[11px] text-slate-500">
                      {rows.length} novedades detectadas • {extractedImages.length} imágenes encontradas
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFile(null);
                      setRows([]);
                      setExtractedImages([]);
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-xl font-bold transition-colors"
                  >
                    Cambiar archivo
                  </button>
                </div>
              </div>

              {/* Extracted Images Ribbon (if Excel contained photos) */}
              {extractedImages.length > 0 && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-amber-700" />
                      Imágenes detectadas en el Excel ({extractedImages.length})
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          extractedImages.forEach((img, idx) => {
                            if (rows[idx]) {
                              handleAssignExtractedImage(rows[idx].tempId, img.dataUrl);
                            }
                          });
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                      >
                        <span>⚡ Auto-asignar imágenes a novedades (1 a 1)</span>
                      </button>
                      <span className="text-[10px] text-amber-800 font-medium hidden sm:inline">
                        o usa "Vincular a..." en cada foto
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto pb-1.5">
                    {extractedImages.map((img) => (
                      <div 
                        key={img.id}
                        className="flex flex-col items-center gap-1.5 shrink-0 p-2 bg-white border border-amber-300 rounded-xl shadow-2xs"
                      >
                        <div className="relative group w-24 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                          <img 
                            src={img.dataUrl} 
                            alt={img.name} 
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewZoomImage(img.dataUrl)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                            title="Ampliar imagen"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>

                        <select
                          className="text-[10px] bg-slate-50 border border-slate-300 rounded px-1 py-1 w-24 font-bold text-slate-800"
                          defaultValue=""
                          onChange={(e) => {
                            const targetId = e.target.value;
                            if (targetId) {
                              handleAssignExtractedImage(targetId, img.dataUrl);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Vincular a...</option>
                          {rows.map((r, rIdx) => (
                            <option key={r.tempId} value={r.tempId}>
                              Fila {rIdx + 1}: {r.code} ({r.item.slice(0, 14)}...)
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters & Selection Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Filtros:</span>
                  
                  {/* Sheet Filter */}
                  {sheetNames.length > 1 && (
                    <select
                      value={selectedSheetFilter}
                      onChange={(e) => setSelectedSheetFilter(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-medium"
                    >
                      <option value="TODAS">Todas las hojas ({sheetNames.length})</option>
                      {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}

                  {/* Section Filter */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSelectedSectionFilter('TODAS')}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                        selectedSectionFilter === 'TODAS' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      Todas ({rows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSectionFilter('SEGURIDAD_FISICA')}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                        selectedSectionFilter === 'SEGURIDAD_FISICA' ? 'bg-white shadow-2xs text-red-600' : 'text-slate-600'
                      }`}
                    >
                      Seguridad Física ({securityCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSectionFilter('SSOMA')}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                        selectedSectionFilter === 'SSOMA' ? 'bg-white shadow-2xs text-emerald-600' : 'text-slate-600'
                      }`}
                    >
                      SSOMA ({ssomaCount})
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-[11px] text-teal-700 hover:text-teal-900 font-bold"
                  >
                    Seleccionar todas
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-700 font-bold"
                  >
                    Deseleccionar
                  </button>
                  <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold">
                    {selectedCount} seleccionadas para importar
                  </span>
                </div>
              </div>

              {/* Table of Extracted Incidents */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[460px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] sticky top-0 z-10">
                      <tr>
                        <th className="p-3 w-8 text-center">Sel.</th>
                        <th className="p-3 w-32">Unidad & Ubicación</th>
                        <th className="p-3 w-40">Tipo & Ítem Taxonomía</th>
                        <th className="p-3">Descripción del Incidente</th>
                        <th className="p-3 w-44">Informa & Acción Adoptada</th>
                        <th className="p-3 w-28">Estado / Severidad</th>
                        <th className="p-3 w-28 text-center">Foto Evidencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredRows.map((row) => (
                        <tr 
                          key={row.tempId}
                          className={`hover:bg-slate-50 transition-colors ${!row.selected ? 'opacity-40 bg-slate-50/50' : ''}`}
                        >
                          {/* Checkbox */}
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={() => handleToggleSelectRow(row.tempId)}
                              className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer w-4 h-4"
                            />
                          </td>

                          {/* Branch & Area */}
                          <td className="p-3 space-y-1">
                            <select
                              value={row.branch}
                              onChange={(e) => handleUpdateRow(row.tempId, 'branch', e.target.value as Branch)}
                              className="w-full text-[11px] font-bold rounded bg-slate-50 border border-slate-200 p-1"
                            >
                              {BRANCHES.map(b => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={row.specificLocation}
                              placeholder="Área / Piso"
                              onChange={(e) => handleUpdateRow(row.tempId, 'specificLocation', e.target.value)}
                              className="w-full text-[10px] text-slate-600 p-1 bg-white border border-slate-200 rounded"
                            />
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {row.month} • {new Date(row.timestamp).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>

                          {/* Taxonomy Section & Item */}
                          <td className="p-3 space-y-1">
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                row.mainSection === 'SEGURIDAD_FISICA' 
                                  ? 'bg-red-50 text-red-700 border border-red-200' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {row.mainSection === 'SEGURIDAD_FISICA' ? 'Seg. Física' : 'SSOMA'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {row.subSection}
                              </span>
                            </div>
                            <span className="text-xs font-black text-slate-900 block leading-tight">
                              {row.item}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {row.classificationType}
                            </span>
                          </td>

                          {/* Description */}
                          <td className="p-3 space-y-1">
                            <textarea
                              rows={2}
                              value={row.description}
                              onChange={(e) => handleUpdateRow(row.tempId, 'description', e.target.value)}
                              className="w-full text-xs text-slate-800 p-1.5 bg-slate-50/80 border border-slate-200 rounded resize-none"
                            />
                            <div className="text-[10px] text-slate-500 flex items-center justify-between">
                              <span className="font-mono">{row.code}</span>
                              {row.involved && row.involved !== 'N/A' && (
                                <span>Involucrado: <strong>{row.involved}</strong></span>
                              )}
                            </div>
                          </td>

                          {/* Informa (Operator) & Accion Adoptada */}
                          <td className="p-3 space-y-1">
                            <div className="text-[11px] font-semibold text-slate-900">
                              <span className="text-[10px] text-slate-500 block font-normal">Informa:</span>
                              <input
                                type="text"
                                value={row.operatorName || ''}
                                placeholder="Nombre informante"
                                onChange={(e) => handleUpdateRow(row.tempId, 'operatorName', e.target.value)}
                                className="w-full text-[11px] p-1 bg-white border border-slate-200 rounded font-medium"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block font-normal">Acción adoptada:</span>
                              <textarea
                                rows={2}
                                value={row.actionsTaken || ''}
                                placeholder="Medida o gestión tomada"
                                onChange={(e) => handleUpdateRow(row.tempId, 'actionsTaken', e.target.value)}
                                className="w-full text-[10px] p-1 bg-slate-50/70 border border-slate-200 rounded resize-none text-slate-700"
                              />
                            </div>
                          </td>

                          {/* Severity & Status */}
                          <td className="p-3 space-y-1">
                            <select
                              value={row.status}
                              onChange={(e) => handleUpdateRow(row.tempId, 'status', e.target.value)}
                              className="w-full text-[10px] font-bold rounded p-1 bg-slate-50 border border-slate-200"
                            >
                              <option value="ABIERTO">Abierto</option>
                              <option value="EN_GESTION">En Gestión</option>
                              <option value="RESUELTO">Resuelto</option>
                              <option value="REPORTADO_LEGIO">Reportado Legio</option>
                            </select>
                            <select
                              value={row.severity}
                              onChange={(e) => handleUpdateRow(row.tempId, 'severity', e.target.value as Severity)}
                              className="w-full text-[10px] font-bold rounded p-1 bg-slate-50 border border-slate-200"
                            >
                              <option value="BAJA">Baja</option>
                              <option value="MEDIA">Media</option>
                              <option value="ALTA">Alta</option>
                            </select>
                          </td>

                          {/* Evidence Photo Assignment */}
                          <td className="p-3 text-center">
                            {row.evidenceImages.length > 0 ? (
                              <div className="space-y-1.5">
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded-full shadow-2xs">
                                  ✓ Foto de fila
                                </span>
                                <div className="flex items-center justify-center gap-1">
                                  {row.evidenceImages.map((img, imgIdx) => (
                                    <div key={imgIdx} className="relative group w-14 h-12 rounded-lg overflow-hidden border-2 border-emerald-500 shadow-xs bg-slate-100">
                                      <img src={img} alt="Foto" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                                        <button
                                          type="button"
                                          onClick={() => setPreviewZoomImage(img)}
                                          className="p-1 bg-white text-slate-800 rounded hover:bg-slate-200"
                                          title="Ampliar foto"
                                        >
                                          <Eye className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveImageFromRow(row.tempId, imgIdx)}
                                          className="p-1 bg-rose-600 text-white rounded hover:bg-rose-700"
                                          title="Eliminar foto"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveImagePickerRowId(row.tempId)}
                                  className="text-[10px] text-teal-700 hover:text-teal-900 font-bold block mx-auto hover:underline"
                                >
                                  + Cambiar / Añadir
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => setActiveImagePickerRowId(row.tempId)}
                                  className="text-[10px] bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 border border-slate-300 hover:border-teal-400 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 mx-auto transition-colors"
                                >
                                  <Camera className="w-3 h-3 text-teal-600" />
                                  <span>Asignar foto</span>
                                </button>
                              </div>
                            )}

                            {/* Direct file input for this row */}
                            <label className="text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer block mt-1 font-medium">
                              <span>+ subir foto</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleCustomPhotoToRow(e, row.tempId)}
                                className="hidden"
                              />
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data Preservation & Safe Update Strategy Options */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-black text-slate-900">
                      Preservación y Resguardo de Información Previa
                    </span>
                  </div>
                  {hasDriveAccess && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                      <HardDrive className="w-3 h-3" /> Respaldo en Google Drive Activado
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className={`p-3 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                    keepExistingData 
                      ? 'border-emerald-600 bg-white shadow-2xs text-slate-900' 
                      : 'border-slate-200 bg-white/60 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="updateStrategy"
                      checked={keepExistingData}
                      onChange={() => setKeepExistingData(true)}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-black block">Mantener información previa (Modo Incremental)</span>
                      <span className="text-[11px] text-slate-500">
                        Conserva todas las novedades ya registradas en la plataforma y añade las {selectedCount} novedades de este Excel.
                      </span>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                    !keepExistingData 
                      ? 'border-amber-600 bg-white shadow-2xs text-slate-900' 
                      : 'border-slate-200 bg-white/60 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="updateStrategy"
                      checked={!keepExistingData}
                      onChange={() => setKeepExistingData(false)}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-black block">Reemplazar matriz con el nuevo archivo</span>
                      <span className="text-[11px] text-slate-500">
                        Establece las novedades del Excel como el dataset principal activo.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            {backupStatus && (
              <span className="text-xs font-bold text-emerald-700 animate-pulse flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {backupStatus}
              </span>
            )}

            <button
              onClick={handleExecuteImport}
              disabled={rows.length === 0 || selectedCount === 0 || importing}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all hover:scale-102 active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>
                {importing ? 'Procesando e Importando...' : `Importar ${selectedCount} Novedades a la Matriz`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal to pick extracted image for a specific row */}
      {activeImagePickerRowId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900">
                Seleccionar foto para la novedad
              </h4>
              <button 
                onClick={() => setActiveImagePickerRowId(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {extractedImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                {extractedImages.map(img => (
                  <button
                    key={img.id}
                    onClick={() => handleAssignExtractedImage(activeImagePickerRowId, img.dataUrl)}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 hover:border-teal-500 aspect-4/3 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                  >
                    <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-teal-600/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-[10px]">
                      Vincular
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">
                El archivo Excel no contenía imágenes incrustadas. Puede subir una foto directamente desde su dispositivo en la fila correspondiente.
              </p>
            )}

            <button
              onClick={() => setActiveImagePickerRowId(null)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Full screen image preview zoom */}
      {previewZoomImage && (
        <div 
          onClick={() => setPreviewZoomImage(null)}
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={previewZoomImage} 
              alt="Vista previa" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" 
            />
            <button 
              onClick={() => setPreviewZoomImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
