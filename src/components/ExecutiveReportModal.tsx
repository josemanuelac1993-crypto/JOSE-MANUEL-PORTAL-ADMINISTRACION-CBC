import React, { useState, useMemo } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  FileDown, 
  Shield, 
  HardHat, 
  Building2, 
  Calendar, 
  FileText,
  Camera,
  Maximize2
} from 'lucide-react';
import { Incident, MainSection, BRANCHES } from '../types';
import { generateWordBlob } from '../utils/wordExportHelper';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: Incident[];
  selectedBranch: string;
  selectedMonth: string;
  activeMainSection: MainSection;
}

const MONTHS_LIST = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  incidents,
  selectedBranch: initialBranch,
  selectedMonth: initialMonth,
  activeMainSection: _activeMainSection
}) => {
  const [copied, setCopied] = useState(false);
  const [filterSection, setFilterSection] = useState<'ALL' | MainSection>('ALL');
  
  // Internal filter state so the user can easily select any branch/month inside the modal
  const [filterBranch, setFilterBranch] = useState<string>(() => {
    // If the passed branch has incidents, keep it; otherwise default to 'TODAS'
    if (initialBranch && initialBranch !== 'TODAS') {
      const match = incidents.some(i => i.branch === initialBranch);
      if (match) return initialBranch;
    }
    return 'TODAS';
  });

  const [filterMonth, setFilterMonth] = useState<string>(() => {
    // If the passed month has incidents, keep it; otherwise default to 'TODOS'
    if (initialMonth && initialMonth !== 'TODOS') {
      const match = incidents.some(i => (i.month || '').toUpperCase() === initialMonth.toUpperCase());
      if (match) return initialMonth;
    }
    return 'TODOS';
  });

  const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);

  // Filtered dataset for the report
  const reportIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (filterSection !== 'ALL' && inc.mainSection !== filterSection) return false;
      if (filterBranch !== 'TODAS' && inc.branch !== filterBranch) return false;
      if (filterMonth !== 'TODOS') {
        const incMonth = (inc.month || '').toUpperCase();
        if (incMonth !== filterMonth.toUpperCase()) return false;
      }
      return true;
    });
  }, [incidents, filterSection, filterBranch, filterMonth]);

  // Target dataset for export (falls back to all incidents if filter has 0 records)
  const exportDataset = reportIncidents.length > 0 ? reportIncidents : incidents;

  const total = reportIncidents.length;
  const resueltos = reportIncidents.filter(i => i.status === 'RESUELTO').length;
  const enGestion = reportIncidents.filter(i => i.status === 'EN_GESTION' || i.status === 'ABIERTO').length;
  const legio = reportIncidents.filter(i => i.reportedToLegio || i.status === 'REPORTADO_LEGIO').length;
  const resPercent = total > 0 ? Math.round((resueltos / total) * 100) : 0;

  const secCount = reportIncidents.filter(i => i.mainSection === 'SEGURIDAD_FISICA').length;
  const ssomaCount = reportIncidents.filter(i => i.mainSection === 'SSOMA').length;

  if (!isOpen) return null;

  // Copy clean plain-text format to clipboard for Word
  const handleCopyForWord = () => {
    let text = `INFORME EJECUTIVO DE NOVEDADES OPERATIVAS - LIDERMAN\n`;
    text += `CLIENTE: TESALIA CBC\n`;
    text += `ADMINISTRADOR DEL PROYECTO: JOSÉ MANUEL ARGUELLO COLOMA\n`;
    text += `PERÍODO: ${filterMonth} 2026 | SUCURSAL: ${filterBranch}\n`;
    text += `FECHA DE GENERACIÓN: ${new Date().toLocaleDateString('es-EC')}\n`;
    text += `------------------------------------------------------------\n`;
    text += `RESUMEN EJECUTIVO:\n`;
    text += `• Total Novedades Registradas: ${total}\n`;
    text += `• Casos Resueltos: ${resueltos} (${resPercent}% de efectividad)\n`;
    text += `• Casos En Gestión / Abiertos: ${enGestion}\n`;
    text += `• Casos Reportados a Legio: ${legio}\n`;
    text += `• Distribución: Seguridad Física (${secCount}) | SSOMA (${ssomaCount})\n`;
    text += `------------------------------------------------------------\n\n`;
    text += `DETALLE CONSOLIDADO DE NOVEDADES:\n\n`;

    exportDataset.forEach((inc, index) => {
      text += `[${index + 1}] CÓDIGO: ${inc.code || inc.id}\n`;
      text += `FECHA: ${new Date(inc.timestamp).toLocaleDateString('es-EC')} | SUCURSAL: ${inc.branch}\n`;
      text += `SECCIÓN: ${inc.mainSection === 'SEGURIDAD_FISICA' ? 'Seguridad Física' : 'Seguridad Industrial (SSOMA)'} > ${inc.subSection}\n`;
      text += `ÍTEM CLASIFICADO: ${inc.item}\n`;
      text += `UBICACIÓN ESPECÍFICA: ${inc.specificLocation || 'Instalaciones Generales'}\n`;
      text += `ESTADO OPERATIVO: ${inc.status} | SEVERIDAD: ${inc.severity}\n`;
      text += `¿QUÉ PASÓ? (DESCRIPCIÓN):\n${inc.description}\n`;
      if (inc.actionsTaken) {
        text += `ACCIONES TOMADAS:\n${inc.actionsTaken}\n`;
      }
      text += `RESPONSABLE: ${inc.operator?.name || 'José Manuel Arguello Coloma'}\n`;
      text += `------------------------------------------------------------\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Download clean .doc (Microsoft Word document with embedded photos and 1 page per novelty)
  const handleDownloadWordDoc = () => {
    if (exportDataset.length === 0) {
      alert('No hay novedades disponibles en la base de datos para exportar.');
      return;
    }

    const blob = generateWordBlob({
      title: 'INFORME CONSOLIDADO DE NOVEDADES OPERATIVAS',
      selectedMonth: filterMonth,
      selectedBranch: filterBranch,
      incidents: exportDataset,
      isSingleIncident: false
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanMonth = filterMonth !== 'TODOS' ? filterMonth : 'CONSOLIDADO';
    const cleanBranch = filterBranch !== 'TODAS' ? filterBranch.replace(/\s+/g, '_') : 'TODAS_SUCURSALES';
    link.download = `Informe_Novedades_Tesalia_${cleanBranch}_${cleanMonth}_2026.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 border border-blue-500/50 rounded-xl">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                Reporte Ejecutivo de Novedades (Microsoft Word)
              </h2>
              <p className="text-xs text-slate-300">
                Liderman • Tesalia CBC • Administrador: José Manuel Arguello Coloma
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar with Filter Dropdowns & Quick Export Actions */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Section Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setFilterSection('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterSection === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({incidents.length})
            </button>
            <button
              onClick={() => setFilterSection('SEGURIDAD_FISICA')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                filterSection === 'SEGURIDAD_FISICA'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3 h-3" />
              <span>Seguridad Física</span>
            </button>
            <button
              onClick={() => setFilterSection('SSOMA')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                filterSection === 'SSOMA'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HardHat className="w-3 h-3" />
              <span>SSOMA</span>
            </button>
          </div>

          {/* Quick In-Modal Filters for Branch and Month */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 text-xs shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
              >
                <option value="TODAS">Todas las Sucursales (6)</option>
                {BRANCHES.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 text-xs shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
              >
                <option value="TODOS">Todo el Período 2026</option>
                {MONTHS_LIST.map(m => (
                  <option key={m} value={m}>{m} 2026</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyForWord}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors"
              title="Copiar texto estructurado para pegar en Word"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleDownloadWordDoc}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Descargar reporte completo en Microsoft Word (.doc) con texto y fotos en 1 página por novedad"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Descargar Reporte Word (.doc)</span>
            </button>
          </div>
        </div>

        {/* Printable & Scrollable Document Preview Area */}
        <div id="printable-report" className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-white text-slate-900">
          
          {/* Document Header Banner */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
                  LIDERMAN • SEGURIDAD Y CONFIANZA
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                  INFORME CONSOLIDADO DE NOVEDADES OPERATIVAS
                </h1>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  PROYECTO CLIENTE: <strong className="text-slate-900">TESALIA CBC</strong> • ADMINISTRADOR: <strong className="text-slate-900">JOSÉ MANUEL ARGUELLO COLOMA</strong>
                </p>
              </div>

              <div className="text-left sm:text-right text-xs text-slate-500 space-y-1">
                <div>Período: <strong className="text-slate-800 font-bold">{filterMonth !== 'TODOS' ? `${filterMonth} 2026` : 'CONSOLIDADO ANUAL 2026'}</strong></div>
                <div>Sucursal: <strong className="text-slate-800 font-bold">{filterBranch !== 'TODAS' ? filterBranch : 'TODAS LAS SUCURSALES (6)'}</strong></div>
                <div>Fecha emisión: <strong className="text-slate-800 font-bold">{new Date().toLocaleDateString('es-EC')}</strong></div>
              </div>
            </div>
          </div>

          {/* Executive KPI Summary Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
              Resumen Ejecutivo de Indicadores Clave
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-500 block">Total Novedades</span>
                <span className="text-2xl font-black text-slate-900">{total}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-500 block">Resueltas</span>
                <span className="text-2xl font-black text-emerald-600">{resueltos}</span>
                <span className="text-[10px] text-emerald-700 font-semibold">{resPercent}% efectividad</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-500 block">En Gestión / Abiertas</span>
                <span className="text-2xl font-black text-amber-600">{enGestion}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-500 block">Seg. Física / SSOMA</span>
                <span className="text-lg font-black text-slate-800">{secCount} / {ssomaCount}</span>
              </div>
            </div>
          </div>

          {/* Incidents Structured Clean List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Listado Limpio de Novedades ({reportIncidents.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Al descargar el reporte de Word, cada novedad sale en su propia página con bloque completo
              </span>
            </div>

            {reportIncidents.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <p className="text-sm font-bold text-slate-700">
                  No hay novedades registradas para los filtros seleccionados ({filterBranch} • {filterMonth}).
                </p>
                <p className="text-xs text-slate-500">
                  Hay un total de <strong>{incidents.length} novedades</strong> disponibles en la base de datos.
                </p>
                <button
                  onClick={() => {
                    setFilterBranch('TODAS');
                    setFilterMonth('TODOS');
                    setFilterSection('ALL');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-xs"
                >
                  Mostrar todas las {incidents.length} novedades
                </button>
              </div>
            ) : (
              reportIncidents.map((inc, idx) => (
                <div 
                  key={inc.id || idx}
                  className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {inc.code || inc.id}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {inc.branch}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(inc.timestamp).toLocaleDateString('es-EC')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        inc.mainSection === 'SEGURIDAD_FISICA'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {inc.mainSection === 'SEGURIDAD_FISICA' ? 'Seguridad Física' : 'SSOMA'} &gt; {inc.subSection}
                      </span>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inc.status === 'RESUELTO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inc.status === 'EN_GESTION'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {inc.status}
                      </span>
                    </div>
                  </div>

                  {/* Title & Classification */}
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      {inc.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Ítem de Matriz: <strong className="text-slate-700">{inc.item}</strong> • Ubicación: <strong className="text-slate-700">{inc.specificLocation || 'Instalaciones Generales'}</strong>
                    </p>
                  </div>

                  {/* Clean ¿QUÉ PASÓ? */}
                  <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-700 border border-slate-100 space-y-1">
                    <span className="font-bold text-slate-900 block text-[10px] uppercase tracking-wider text-red-600">
                      ¿Qué Pasó? (Descripción de los hechos):
                    </span>
                    <p className="leading-relaxed">
                      {inc.description}
                    </p>
                  </div>

                  {/* Clean Acciones Tomadas */}
                  {inc.actionsTaken && (
                    <div className="text-xs text-slate-600 pl-1">
                      <span className="font-bold text-slate-800">Acciones Tomadas: </span>
                      <span>{inc.actionsTaken}</span>
                    </div>
                  )}

                  {/* Photographic Evidence Gallery */}
                  {Array.isArray(inc.evidenceImages) && inc.evidenceImages.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mt-2 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1.5 text-red-700">
                          <Camera className="w-3.5 h-3.5 text-red-600" />
                          Evidencia Fotográfica y Capturas CCTV ({inc.evidenceImages.length})
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Clic en imagen para ampliar
                        </span>
                      </div>
                      <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-0.5">
                        {inc.evidenceImages.map((img, imgIdx) => (
                          <div
                            key={imgIdx}
                            onClick={() => setSelectedZoomImage(img)}
                            className="group relative w-36 h-24 rounded-lg overflow-hidden border border-slate-300 bg-white shrink-0 shadow-2xs cursor-pointer hover:border-red-500 hover:shadow-md transition-all"
                          >
                            <img src={img} alt={`Evidencia ${imgIdx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                              <Maximize2 className="w-3.5 h-3.5" />
                              Ampliar
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer note */}
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>Operador: {inc.operator?.name || 'José Manuel Arguello Coloma'} ({inc.operator?.shift || 'Turno Consola'})</span>
                    {inc.reportedToLegio && (
                      <span className="font-semibold text-teal-700">
                        ✓ Reportado a Legio ({inc.legioTicketNumber || 'Con ticket'})
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer signature line for Word */}
          <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
            <div>
              <div className="border-t border-slate-400 w-48 mx-auto mb-1"></div>
              <p className="font-bold text-slate-900">José Manuel Arguello Coloma</p>
              <p className="text-[11px] text-slate-500">Coordinador y Administrador del Proyecto Liderman</p>
            </div>
            <div>
              <div className="border-t border-slate-400 w-48 mx-auto mb-1"></div>
              <p className="font-bold text-slate-900">Supervisión Tesalia CBC</p>
              <p className="text-[11px] text-slate-500">Recepción y Conformidad Operativa</p>
            </div>
          </div>

        </div>

      </div>

      {/* Full-Screen Zoom Viewer for Report Evidence Images */}
      {selectedZoomImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedZoomImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden p-2 shadow-2xl border border-slate-700" 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedZoomImage(null)}
              className="absolute top-4 right-4 z-10 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
              title="Cerrar vista ampliada"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={selectedZoomImage} 
              alt="Evidencia fotográfica ampliada" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg mx-auto" 
            />
          </div>
        </div>
      )}

    </div>
  );
};
