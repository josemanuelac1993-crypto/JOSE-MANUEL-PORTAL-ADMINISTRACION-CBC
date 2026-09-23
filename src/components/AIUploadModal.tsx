import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, 
  Sparkles, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  HelpCircle,
  FileCheck
} from 'lucide-react';

interface AIUploadModalProps {
  onClose: () => void;
  onImportIncidents: (incidents: any[]) => void;
}

export const AIUploadModal: React.FC<AIUploadModalProps> = ({
  onClose,
  onImportIncidents
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    summary: string;
    detectedMonth: string;
    detectedYear: number;
    incidents: any[];
  } | null>(null);

  // Read file and send to backend Gemini endpoint
  const handleProcessFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setAnalyzing(true);
    setAnalysisError(null);
    setResult(null);

    try {
      let fileData = '';
      let fileText = '';
      const fileName = uploadedFile.name;

      if (
        fileName.endsWith('.xlsx') || 
        fileName.endsWith('.xls') || 
        fileName.endsWith('.csv')
      ) {
        // Parse with SheetJS to extract clean tabular text without trailing empty commas
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let textChunks: string[] = [];
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const rawCsv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
          const cleanLines = rawCsv.split('\n').filter(line => {
            const stripped = line.replace(/[,;\s\t]/g, '');
            return stripped.length > 0;
          });
          if (cleanLines.length > 0) {
            textChunks.push(`--- HOJA EXCEL: ${sheetName} ---\n${cleanLines.slice(0, 400).join('\n')}`);
          }
        });
        fileText = textChunks.join('\n\n');
      } else {
        // Read as base64 for Word (.docx/.doc), PDF or Images
        fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(uploadedFile);
        });
      }

      const response = await fetch('/api/ai/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          fileMimeType: uploadedFile.type,
          fileData,
          fileText
        })
      });

      const data = await response.json();

      if (!data.success) {
        let errMessage = data.error || 'Error al procesar el archivo con IA';
        try {
          if (typeof errMessage === 'string' && errMessage.includes('{')) {
            const parsed = JSON.parse(errMessage);
            if (parsed?.error?.message) {
              errMessage = parsed.error.message;
            }
          }
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }

      setResult(data.result);
    } catch (err: any) {
      console.error('AI error:', err);
      let msg = err.message || 'Ocurrió un error al procesar el documento con IA.';
      if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        msg = 'El servidor de IA experimentó alta demanda momentánea. Por favor haz clic en "Reintentar ahora" para procesarlo con los modelos de respaldo.';
      }
      setAnalysisError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  // Quick Demo Simulator
  const handleLoadSample = (sampleType: 'WORD_SECURITY' | 'PDF_MATRIZ' | 'EXCEL_SSOMA') => {
    let mockContent = '';
    let mockName = '';
    let mockType = 'application/pdf';

    if (sampleType === 'WORD_SECURITY') {
      mockName = 'Reporte_Semanal_Novedades_Tesalia.docx';
      mockType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      mockContent = `
        INFORME DE NOVEDADES OPERATIVAS - TESALIA CBC
        ADMINISTRADOR: JOSÉ MANUEL ARGUELLO COLOMA
        PERÍODO: 10 AL 16 DE AGOSTO 2026
        
        1. SUCURSAL: Ag. Gye Norte
        HECHO: Vehículo distribuidor furgón blanco sin candado de seguridad en bahía de despacho.
        CLASIFICACIÓN: Actos Subestándares - VEHICULOS ABIERTOS O SIN SEGURO.
        MEDIDA TOMADA: Guardia notificó a conductor y colocó precinto de seguridad.
        
        2. SUCURSAL: Tesalia Planta Gye
        HECHO: Chapa antipánico con traba rota en puerta de emergencia de Nave Envasado B.
        CLASIFICACIÓN: Condiciones Subestándares - FALLA DE PUERTAS Y VENTANAS (CHAPAS, OTROS).
        MEDIDA TOMADA: Se envió personal de cerrajería y se levantó ticket LEGIO LEG-88201.
        
        3. SUCURSAL: Planta Milagro
        HECHO: Falla en reflector perimetral norte por cableado sulfatado.
        CLASIFICACIÓN: Condiciones Subestándares - FALLA DE ILUMINACIÓN (INTERNA Y EXTERNA).
        MEDIDA TOMADA: Reparado por técnico eléctrico el mismo día.
      `;
    } else if (sampleType === 'EXCEL_SSOMA') {
      mockName = 'Inspeccion_SSOMA_Plantas_CBC_2026.xlsx';
      mockType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      mockContent = `
        Sucursal, Área, Clasificación, Novedad, Acciones
        Planta Machala, Envasado Línea 1, Actos de Seguridad y Salud Ocupacional, Operario operando faja transportadora sin guantes ni casco de seguridad, Se detuvo actividad y se le entregó EPP normativo.
        Tesalia Planta Gye, Bodega Químicos, Condiciones Subestándares Safety, Extintor PQS de 10kg vencido y sin tarjeta de inspección mensual, Reportado con ticket LEGIO para cambio urgente.
        Ag. Gye Sur, Patio de Carga, Actos de Sistema Medio Ambiental, Derrame de lubricante de montacargas en piso de concreto sin kit antiderrame, Se aplicó aserrín y se limpió el área.
        Planta Milagro, Calderas, Condiciones Subestándares Safety, Falla en sensor de temperatura y conato de recalentamiento, Se activó protocolo de enfriamiento y brigada interna.
      `;
    } else {
      mockName = 'Reporte_Mensual_Security_Tesalia_Agosto.pdf';
      mockType = 'application/pdf';
      mockContent = `
        UNIDAD: TESALIA CBC - PERIODO 2026 - AGOSTO
        RESPONSABLE: JOSÉ MANUEL ARGUELLO COLOMA
        INCIDENTES DE SECURITY:
        1. Sucursal: Ag. Gye Norte - Falla de alumbrado exterior en zona de carga. Reflectores averiados por cortocircuito. Condición Subestándar: FALLA DE ILUMINACIÓN (INTERNA Y EXTERNA).
        2. Sucursal: Planta Milagro - Portón perimetral con chapa destrabada y sin candado de seguridad al cambio de turno 22:00. Condición Subestándar: FALLA DE PUERTAS Y VENTANAS (CHAPAS, OTROS).
        3. Sucursal: Tesalia Planta Gye - Personal transportista externo ingresó sin pase de seguridad verbalmente autorizado por chofer. Acto Subestándar: AUTORIZACIÓN DE SALIDA DE MATERIAL EN FORMA VERBAL.
        4. Sucursal: Ag. Manta - Camión distribuidor con cerradura de furgón abierta en bahía 2. Acto Subestándar: VEHICULOS ABIERTOS O SIN SEGURO.
      `;
    }

    setFile(new File([mockContent], mockName, { type: mockType }));
    setAnalyzing(true);
    setAnalysisError(null);

    fetch('/api/ai/analyze-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: mockName,
        fileMimeType: mockType,
        fileText: mockContent
      })
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error(data.error);
        setResult(data.result);
      })
      .catch(err => setAnalysisError(err.message))
      .finally(() => setAnalyzing(false));
  };

  const handleConfirmImport = () => {
    if (!result || !result.incidents || result.incidents.length === 0) return;

    const formattedIncidents = result.incidents.map((inc) => ({
      ...inc,
      month: result.detectedMonth || 'AGOSTO',
      year: result.detectedYear || 2026,
      sourceDocument: {
        name: file?.name || 'Documento procesado por IA',
        type: file?.name.match(/\.(docx|doc)$/i) ? 'WORD' : file?.name.endsWith('.pdf') ? 'PDF' : file?.name.match(/\.(xlsx|xls|csv)$/) ? 'EXCEL' : 'IMAGEN',
        analyzedByAI: true
      }
    }));

    onImportIncidents(formattedIncidents);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white border border-slate-300 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl text-slate-900 my-auto flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-teal-600 to-emerald-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                Ingesta Inteligente de Documentos
                <span className="text-[10px] bg-teal-100 text-teal-800 font-mono px-2 py-0.5 rounded border border-teal-200 font-bold">
                  Word • PDF • Excel • Fotos
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Sube reportes en formato <strong>Word (.docx)</strong>, <strong>PDF</strong>, <strong>Excel (.xlsx)</strong> o fotografías para clasificarlos automáticamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              analyzing
                ? 'border-teal-500 bg-teal-50/50'
                : 'border-slate-300 hover:border-teal-600 bg-slate-50 hover:bg-teal-50/30'
            }`}
          >
            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
                <div className="text-sm font-bold text-slate-900">
                  Analizando y organizando información del reporte...
                </div>
                <p className="text-slate-600 text-xs max-w-md">
                  Extrayendo fecha, sucursal, categorías de Seguridad Física y SSOMA, clasificando según la matriz de Tesalia CBC e identificando acciones correctivas.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 text-blue-700 rounded-xl border border-blue-200" title="Word (.docx, .doc)">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="p-3 bg-red-100 text-red-600 rounded-xl border border-red-200" title="PDF">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-200" title="Excel">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-xl border border-purple-200" title="Fotos">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                </div>

                <div>
                  <span className="font-bold text-sm text-slate-900 block">
                    Arrastra aquí tu archivo Word (.docx), PDF, Excel (.xlsx, .csv) o Foto
                  </span>
                  <span className="text-slate-500 text-xs mt-1 block">
                    o haz clic en el botón para buscar en tus carpetas
                  </span>
                </div>

                <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-xs transition-all">
                  Seleccionar Archivo (Word / PDF / Excel)
                  <input
                    type="file"
                    accept=".docx,.doc,.pdf,.xlsx,.xls,.csv,image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>

                {file && (
                  <div className="mt-2 text-xs text-teal-800 font-semibold flex items-center gap-1.5 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    <FileCheck className="w-4 h-4 text-teal-600" />
                    Archivo cargado: <strong>{file.name}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Demo Preloaded Samples */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              ¿Quieres probar un reporte de ejemplo? Selecciona una plantilla:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleLoadSample('WORD_SECURITY')}
                className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors flex items-center gap-2 group shadow-2xs"
              >
                <FileText className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                <div className="overflow-hidden">
                  <span className="font-bold text-slate-900 block truncate">Reporte_Novedades.docx</span>
                  <span className="text-[10px] text-slate-500">Ejemplo en formato Word</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSample('PDF_MATRIZ')}
                className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors flex items-center gap-2 group shadow-2xs"
              >
                <FileText className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
                <div className="overflow-hidden">
                  <span className="font-bold text-slate-900 block truncate">Reporte_Security.pdf</span>
                  <span className="text-[10px] text-slate-500">4 Novedades Security & KPI</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSample('EXCEL_SSOMA')}
                className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-colors flex items-center gap-2 group shadow-2xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                <div className="overflow-hidden">
                  <span className="font-bold text-slate-900 block truncate">Inspeccion_SSOMA.xlsx</span>
                  <span className="text-[10px] text-slate-500">4 Novedades Safety & SMA</span>
                </div>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {analysisError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-rose-900">Aviso en el procesamiento:</span>
                  <span className="text-xs text-rose-700 block mt-0.5">{analysisError}</span>
                </div>
              </div>
              {file && (
                <button
                  type="button"
                  onClick={() => handleProcessFile(file)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-2xs"
                >
                  Reintentar ahora
                </button>
              )}
            </div>
          )}

          {/* Analysis Results View */}
          {result && (
            <div className="space-y-4 pt-2 border-t border-slate-200 animate-in fade-in duration-300">
              
              {/* Summary Bar */}
              <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
                    Resumen de Análisis Inteligente
                  </span>
                  <p className="text-xs text-slate-800 mt-1 font-medium leading-relaxed">
                    {result.summary}
                  </p>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <span className="bg-teal-100 text-teal-900 border border-teal-300 text-xs px-2.5 py-1 rounded-full font-bold">
                    {result.incidents?.length || 0} Novedad(es) Detectada(s)
                  </span>
                  <span className="text-[11px] text-slate-600 font-mono">
                    Período: {result.detectedMonth} {result.detectedYear}
                  </span>
                </div>
              </div>

              {/* Incidents preview list */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Novedades listas para clasificación e importación:
                </span>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {result.incidents?.map((inc: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inc.mainSection === 'SEGURIDAD_FISICA'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {inc.mainSection === 'SEGURIDAD_FISICA' ? 'Seguridad Física' : 'SSOMA'}
                          </span>

                          <span className="bg-white text-slate-700 text-[10px] px-2 py-0.5 rounded font-semibold border border-slate-200">
                            {inc.subSection}
                          </span>

                          <span className="text-red-700 font-bold flex items-center gap-1 text-[11px] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            <MapPin className="w-3 h-3 text-red-600" />
                            {inc.branch}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-slate-900">{inc.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-2">{inc.description}</p>
                        
                        <div className="text-[11px] text-amber-900 font-mono font-medium">
                          Ítem: <strong>{inc.item}</strong>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-bold">
                          {inc.severity}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          {inc.actionsTaken ? 'Acción sugerida ✓' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg font-semibold"
          >
            Cancelar
          </button>

          {result && result.incidents && result.incidents.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-black shadow-md flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Importar {result.incidents.length} Novedades a la Plataforma</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
