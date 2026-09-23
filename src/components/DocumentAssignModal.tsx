import React, { useState } from 'react';
import { 
  StoredDocument, 
  Operator, 
  MainSection, 
  Severity, 
  IncidentStatus, 
  BRANCHES,
  MONTHS,
  Incident,
  Branch
} from '../types';
import { 
  X, 
  Sparkles, 
  Shield, 
  HardHat, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  FileText,
  Building2,
  Wand2
} from 'lucide-react';

interface DocumentAssignModalProps {
  document: StoredDocument | null;
  currentOperator: Operator;
  onClose: () => void;
  onIncidentCreated: (incident: Incident, updatedDoc: StoredDocument) => void;
}

// Taxonomy mapping for manual assignment
const TAXONOMY_OPTIONS: Record<string, { label: string; items: string[] }> = {
  // SEGURIDAD FISICA
  SECURITY: {
    label: 'Incidentes Security',
    items: [
      'FALLA DE CERRADURAS',
      'ACCESO DE PERSONAL NO AUTORIZADO',
      'INGRESO NO AUTORIZADO DE VEHÍCULOS',
      'LLAVES EXTRAVIADAS',
      'INTRUSIÓN / ESCALAMIENTO',
      'DAÑO A LAS INSTALACIONES',
      'ROBO / HURTO',
      'ALARMA DE INTRUSIÓN ACTIVADA',
      'OTROS 1'
    ]
  },
  KPI_MEJORA_SERVICIO: {
    label: 'KPI Mejora de Servicio',
    items: [
      'FALLAS SISTEMA CCTV',
      'MANTENIMIENTO DE CÁMARAS',
      'REVISIÓN DE CÁMARAS',
      'N/A',
      'CAMBIOS DE EQUIPOS',
      'PRUEBAS DE EQUIPOS',
      'OTROS 2'
    ]
  },
  GESTION_INTERNA: {
    label: 'Gestión Interna',
    items: [
      'ASISTENCIA',
      'UNIFORMIDAD',
      'EQUIPAMIENTO',
      'DESCANSO',
      'RELEVO',
      'RONDA',
      'SUPERVISIÓN',
      'CONSIGNA',
      'CAPACITACIÓN',
      'OTROS 3'
    ]
  },
  // SSOMA
  SAFETY: {
    label: 'Condiciones de Seguridad (Safety)',
    items: [
      'ESTIBAS MAL UBICADAS O MAL REALIZADAS',
      'BLOQUEO DE EQUIPOS DE CONTRA INCENDIO',
      'FALTA DE SEÑALÉTICA',
      'BLOQUEO DE PUERTAS DE EMERGENCIA',
      'DERRIVES O DESBORDES DE PRODUCTO',
      'CABLES EXPUESTOS',
      'PISOS MOJADOS / RESBALOSOS',
      'TRABAJOS DE ALTO RIESGO SIN PERMISO',
      'OTROS CONDICIONES'
    ]
  },
  SMA: {
    label: 'Incidentes Ambientales (SMA)',
    items: [
      'DERRAME DE COMBUSTIBLE / QUÍMICOS',
      'DESECHOS INORGÁNICOS (PAPEL, MADERA, PLASTICO, OTROS RECICLADOS)',
      'ANIEGOS E INUNDACIONES',
      'PLAGAS: ROEDORES / AVES / INSECTOS Y OTROS',
      'FUGAS / DERRAMES / EMANACIONES',
      'OTROS 4'
    ]
  },
  SSO: {
    label: 'Actos de Seguridad y Salud Ocupacional (SSO)',
    items: [
      'NO USO DE EPP',
      'MANIOBRAS PELIGROSAS',
      'RIESGOS OCUPACIONALES (HERIDAS, FRACTURAS, OTROS)',
      'ENFERMEDADES OCUPACIONALES (ERGONOMIA, INHALACIÓN, OTROS)',
      'OTROS 5'
    ]
  }
};

export const DocumentAssignModal: React.FC<DocumentAssignModalProps> = ({
  document: doc,
  currentOperator,
  onClose,
  onIncidentCreated
}) => {
  if (!doc) return null;

  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

  // Form states initialized with doc defaults
  const [mainSection, setMainSection] = useState<MainSection>('SEGURIDAD_FISICA');
  const [subSection, setSubSection] = useState<string>('SECURITY');
  const [classificationType, setClassificationType] = useState<string>('Incidentes Security');
  const [item, setItem] = useState<string>('FALLA DE CERRADURAS');
  const [branch, setBranch] = useState<string>(doc.branch || 'Tesalia Planta Gye');
  const [specificLocation, setSpecificLocation] = useState<string>('Área de Operaciones / Garita Principal');
  const [title, setTitle] = useState<string>(
    doc.name ? `Novedad de: ${doc.name.replace(/\.[^/.]+$/, '')}` : 'Novedad vinculada'
  );
  const [description, setDescription] = useState<string>(
    doc.description || `Reporte u oportunidad registrada en la carpeta ${doc.folderName}. Archivo adjunto: ${doc.name}.`
  );
  const [actionsTaken, setActionsTaken] = useState<string>(
    'Verificación e inspección en sitio por personal Liderman. Novedad ingresada a consola.'
  );
  const [severity, setSeverity] = useState<Severity>('MEDIA');
  const [status, setStatus] = useState<IncidentStatus>('EN_GESTION');
  const [month, setMonth] = useState<string>('AGOSTO');

  // When main section changes, adapt subSection and item
  const handleMainSectionChange = (sec: MainSection) => {
    setMainSection(sec);
    if (sec === 'SEGURIDAD_FISICA') {
      setSubSection('SECURITY');
      setClassificationType('Incidentes Security');
      setItem('FALLA DE CERRADURAS');
    } else {
      setSubSection('SAFETY');
      setClassificationType('Condiciones de Seguridad (Safety)');
      setItem('ESTIBAS MAL UBICADAS O MAL REALIZADAS');
    }
  };

  const handleSubSectionChange = (sub: string) => {
    setSubSection(sub);
    const tax = TAXONOMY_OPTIONS[sub];
    if (tax) {
      setClassificationType(tax.label);
      setItem(tax.items[0]);
    }
  };

  // Run AI analysis on the document
  const handleRunAIAnalysis = async () => {
    setAnalyzing(true);
    setAiAnalysisResult(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/analyze`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success && data.result) {
        const result = data.result;
        setAiAnalysisResult(result.summary || 'Análisis completado con éxito.');

        if (Array.isArray(result.incidents) && result.incidents.length > 0) {
          const first = result.incidents[0];
          if (first.title) setTitle(first.title);
          if (first.description) setDescription(first.description);
          if (first.actionsTaken) setActionsTaken(first.actionsTaken);
          if (first.severity) setSeverity(first.severity);
          if (first.status) setStatus(first.status);
          if (first.branch) setBranch(first.branch);
          if (first.specificLocation) setSpecificLocation(first.specificLocation);
          if (first.mainSection) {
            setMainSection(first.mainSection);
            if (first.subSection) {
              setSubSection(first.subSection);
              const tax = TAXONOMY_OPTIONS[first.subSection];
              if (tax) setClassificationType(tax.label);
            }
            if (first.item) setItem(first.item);
          }
        }
      } else {
        setAiAnalysisResult('El análisis automático no encontró datos específicos. Puedes asignar la novedad de forma manual a continuación.');
      }
    } catch (err) {
      console.error('Error analyzing document:', err);
      setAiAnalysisResult('No se pudo completar el análisis automático. Puedes completar los campos manualmente a continuación.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Submit and assign to Matrix
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Por favor especifica un título para la novedad.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/assign-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          mainSection,
          subSection,
          classificationType,
          item,
          branch,
          specificLocation,
          description,
          actionsTaken,
          severity,
          status,
          month,
          year: 2026,
          operator: currentOperator
        })
      });

      const data = await res.json();
      if (data.success && data.incident) {
        onIncidentCreated(data.incident, data.document || doc);
        onClose();
      } else {
        alert(data.error || 'Error al asignar el archivo a la novedad.');
      }
    } catch (err: any) {
      console.error('Error assigning document to incident:', err);
      alert('Error de conexión al asignar el archivo.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableSubSections = mainSection === 'SEGURIDAD_FISICA' 
    ? [
        { key: 'SECURITY', label: 'Security' },
        { key: 'KPI_MEJORA_SERVICIO', label: 'KPI Mejora de Servicio' },
        { key: 'GESTION_INTERNA', label: 'Gestión Interna' }
      ]
    : [
        { key: 'SAFETY', label: 'Safety (Condiciones)' },
        { key: 'SMA', label: 'SMA (Medio Ambiente)' },
        { key: 'SSO', label: 'SSO (Salud Ocupacional)' }
      ];

  const currentItems = TAXONOMY_OPTIONS[subSection]?.items || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/30 border border-red-500/50 rounded-xl text-red-400">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Analizar o Asignar a Novedad de la Matriz
              </h2>
              <p className="text-xs text-slate-300">
                Vincula este archivo a una clasificación específica para Tesalia CBC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* File Card Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-red-600 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {doc.name}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>Carpeta: <strong className="text-slate-700 font-semibold">{doc.folderName}</strong></span>
                  <span>•</span>
                  <span>Sucursal: <strong className="text-slate-700 font-semibold">{doc.branch || 'General'}</strong></span>
                </div>
              </div>
            </div>

            {doc.assignedIncidentId && (
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                ✓ Ya asignado ({doc.assignedIncidentId})
              </span>
            )}
          </div>

          {/* Option 1: AI Auto-Analyze Button */}
          <div className="bg-gradient-to-r from-amber-50/70 via-rose-50/50 to-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Análisis Automático con Inteligencia Artificial</span>
              </div>
              <p className="text-[11px] text-amber-800/80 leading-relaxed">
                Extrae el texto del archivo con <strong>Gemini 3.8 Flash</strong> y propone automáticamente la clasificación y sucursal.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunAIAnalysis}
              disabled={analyzing}
              className="shrink-0 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Analizando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Analizar Archivo</span>
                </>
              )}
            </button>
          </div>

          {/* AI Result Notice */}
          {aiAnalysisResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Resultado de IA:</strong>
                <p className="mt-0.5 text-blue-800">{aiAnalysisResult}</p>
              </div>
            </div>
          )}

          {/* Option 2: Full Manual Assignment (In case auto-analysis failed or custom fine-tuning) */}
          <form id="assign-form" onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-red-600" />
                  <span>Asignación y Clasificación en la Matriz</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-medium">
                  Supervisado por: {currentOperator.name}
                </span>
              </div>
            </div>

            {/* 1. Main Section: Seguridad Física vs SSOMA */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                1. SECCIÓN PRINCIPAL
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleMainSectionChange('SEGURIDAD_FISICA')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    mainSection === 'SEGURIDAD_FISICA'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Shield className={`w-5 h-5 ${mainSection === 'SEGURIDAD_FISICA' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-black">SEGURIDAD FÍSICA</div>
                    <div className="text-[10px] text-slate-500">Security • CCTV • Consola</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleMainSectionChange('SSOMA')}
                  className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    mainSection === 'SSOMA'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <HardHat className={`w-5 h-5 ${mainSection === 'SSOMA' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-black">SEGURIDAD INDUSTRIAL (SSOMA)</div>
                    <div className="text-[10px] text-slate-500">Safety • Ambiental • Salud</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Sub-Section & Specific Matrix Item */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. SUBSECCIÓN
                </label>
                <select
                  value={subSection}
                  onChange={(e) => handleSubSectionChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {availableSubSections.map((sub) => (
                    <option key={sub.key} value={sub.key}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. ÍTEM EXACTO DE LA MATRIZ
                </label>
                <select
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {currentItems.map((itm, idx) => (
                    <option key={idx} value={itm}>
                      {itm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Branch & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. SUCURSAL OFICIAL
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  UBICACIÓN ESPECÍFICA
                </label>
                <input
                  type="text"
                  value={specificLocation}
                  onChange={(e) => setSpecificLocation(e.target.value)}
                  placeholder="Ej: Garita Norte, Patio de Carga, Bodega 3"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* 4. Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                TÍTULO DE LA NOVEDAD
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título descriptivo y conciso"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            {/* 5. Description "¿QUÉ PASÓ?" */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                DESCRIPCIÓN DETALLADA (¿QUÉ PASÓ?)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el incidente, condición o hallazgo del archivo..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 leading-relaxed"
                required
              />
            </div>

            {/* 6. Actions Taken */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ACCIONES TOMADAS / RECOMENDACIONES
              </label>
              <input
                type="text"
                value={actionsTaken}
                onChange={(e) => setActionsTaken(e.target.value)}
                placeholder="Ej: Se coordinó con jefe de agencia y se cerró ticket..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* 7. Severity, Status & Month */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SEVERIDAD
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="BAJA">Baja</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                  <option value="CRÍTICA">Crítica</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ESTADO
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as IncidentStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="ABIERTO">Abierto</option>
                  <option value="EN_GESTION">En Gestión</option>
                  <option value="REPORTADO_LEGIO">Reportado a Legio</option>
                  <option value="RESUELTO">Resuelto</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  MES CORRESPONDIENTE
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

          </form>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>

          <button
            form="assign-form"
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md hover:scale-[1.01] transition-all flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Guardando en Matriz...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-white" />
                <span>Confirmar y Asignar a Matriz</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
