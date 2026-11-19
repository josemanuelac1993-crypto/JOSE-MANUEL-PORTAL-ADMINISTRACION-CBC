import React, { useState } from 'react';
import { 
  MainSection, 
  SubSection, 
  TAXONOMY, 
  BRANCHES, 
  Branch, 
  Operator, 
  Severity, 
  IncidentStatus,
  Incident
} from '../types';
import { 
  X, 
  ShieldAlert, 
  MapPin, 
  Camera, 
  Plus, 
  CheckCircle, 
  CheckCircle2
} from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor';

interface NewIncidentModalProps {
  currentOperator: Operator;
  onClose: () => void;
  onSubmit: (incidentData: Partial<Incident>) => void;
}

export const NewIncidentModal: React.FC<NewIncidentModalProps> = ({
  currentOperator,
  onClose,
  onSubmit
}) => {
  const [mainSection, setMainSection] = useState<MainSection>('SEGURIDAD_FISICA');
  const [selectedBranch, setSelectedBranch] = useState<Branch>(currentOperator.branch || 'Tesalia Planta Gye');
  const [specificLocation, setSpecificLocation] = useState('');
  
  // Filter taxonomies matching mainSection
  const availableTaxonomies = TAXONOMY.filter(t => t.mainSection === mainSection);
  const [selectedTaxonomyIndex, setSelectedTaxonomyIndex] = useState(0);

  const activeTaxonomy = availableTaxonomies[selectedTaxonomyIndex] || availableTaxonomies[0];
  const [selectedItem, setSelectedItem] = useState(activeTaxonomy.items[0]);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('MEDIA');
  const [status, setStatus] = useState<IncidentStatus>('ABIERTO');
  const [actionsTaken, setActionsTaken] = useState('');
  const [reportedToLegio, setReportedToLegio] = useState(false);
  const [legioTicketNumber, setLegioTicketNumber] = useState('');
  const [cctvCaseResolved, setCctvCaseResolved] = useState(false);
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);

  // Update item when taxonomy changes
  const handleTaxonomyChange = (idx: number) => {
    setSelectedTaxonomyIndex(idx);
    const tax = availableTaxonomies[idx];
    if (tax && tax.items.length > 0) {
      setSelectedItem(tax.items[0]);
    }
  };

  // Switch Main section
  const handleMainSectionChange = (section: MainSection) => {
    setMainSection(section);
    setSelectedTaxonomyIndex(0);
    const newTaxonomies = TAXONOMY.filter(t => t.mainSection === section);
    if (newTaxonomies.length > 0 && newTaxonomies[0].items.length > 0) {
      setSelectedItem(newTaxonomies[0].items[0]);
    }
  };

  // Image upload handler with client-side compression
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const optimized = await compressImageFile(file);
        setEvidenceImages(prev => [...prev, optimized]);
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    }
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Por favor complete el título y la descripción de la novedad.');
      return;
    }

    const currentMonth = new Date().toLocaleString('es-EC', { month: 'long' }).toUpperCase();

    const incidentData: Partial<Incident> = {
      mainSection,
      subSection: activeTaxonomy.subSection,
      classificationType: activeTaxonomy.classificationType,
      item: selectedItem,
      branch: selectedBranch,
      specificLocation: specificLocation.trim() || 'Área General de Planta/Agencia',
      title: title.trim(),
      description: description.trim(),
      timestamp: new Date().toISOString(),
      month: currentMonth,
      year: 2026,
      operator: {
        name: currentOperator.name,
        code: currentOperator.code,
        role: currentOperator.role,
        shift: currentOperator.shift
      },
      severity,
      status,
      actionsTaken: actionsTaken.trim() || 'Novedad puesta en conocimiento y monitoreo activo por CCTV.',
      reportedToLegio,
      legioTicketNumber: reportedToLegio ? legioTicketNumber.trim() : '',
      cctvCaseResolved,
      evidenceImages,
      sourceDocument: {
        name: `Parte de Consola - ${currentOperator.name}`,
        type: 'MANUAL',
        analyzedByAI: false
      }
    };

    onSubmit(incidentData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white border border-slate-300 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl text-slate-900 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-xl border border-red-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">
                Registro Oficial de Novedades e Incidentes
              </h3>
              <p className="text-xs text-slate-500">
                Operador de Consola: <strong className="text-slate-800">{currentOperator.name}</strong> ({currentOperator.code} • {currentOperator.shift})
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
          
          {/* Main Section Selection (Seguridad Física vs SSOMA) */}
          <div>
            <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-2">
              1. Seleccione la Sección Principal
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleMainSectionChange('SEGURIDAD_FISICA')}
                className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  mainSection === 'SEGURIDAD_FISICA'
                    ? 'bg-blue-50 border-blue-500 text-slate-900 shadow-sm ring-1 ring-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-blue-900">SEGURIDAD FÍSICA</span>
                  {mainSection === 'SEGURIDAD_FISICA' && <CheckCircle className="w-4 h-4 text-blue-600" />}
                </div>
                <span className="text-[11px] text-slate-600">
                  Security, Control de Accesos, Monitoreo CCTV y Gestión Interna
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleMainSectionChange('SSOMA')}
                className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  mainSection === 'SSOMA'
                    ? 'bg-emerald-50 border-emerald-500 text-slate-900 shadow-sm ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-emerald-900">SEGURIDAD INDUSTRIAL (SSOMA)</span>
                  {mainSection === 'SSOMA' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                </div>
                <span className="text-[11px] text-slate-600">
                  Safety, Sistema Medio Ambiental (SMA) y Salud Ocupacional (SSO)
                </span>
              </button>
            </div>
          </div>

          {/* Subcategoría y Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                2. Subdivisión / Tipo
              </label>
              <select
                value={selectedTaxonomyIndex}
                onChange={(e) => handleTaxonomyChange(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-medium focus:outline-none focus:border-red-500 focus:bg-white"
              >
                {availableTaxonomies.map((tax, idx) => (
                  <option key={idx} value={idx}>
                    {tax.subSectionLabel} - {tax.classificationType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                3. Ítem Oficial de la Matriz
              </label>
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-amber-900 font-bold focus:outline-none focus:border-red-500 focus:bg-white"
              >
                {activeTaxonomy.items.map((it) => (
                  <option key={it} value={it} className="bg-white text-slate-900 font-medium">
                    {it}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Localidad / Sucursal (The 6 required branches) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                4. Sucursal de Ocurrencia (Obligatorio)
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value as Branch)}
                className="w-full bg-red-50/50 border border-red-200 rounded-lg p-2.5 text-red-900 font-bold focus:outline-none focus:border-red-500 focus:bg-white"
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b} className="bg-white text-slate-900">
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Ubicación Específica en Planta
              </label>
              <input
                type="text"
                placeholder="Ej: Garita 2, Nave de Embotellado, Patio de Maniobras..."
                value={specificLocation}
                onChange={(e) => setSpecificLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Title and Description */}
          <div>
            <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
              5. Título del Reporte / Novedad
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Falla en reflector perimetral norte - Detección por cámara 05"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
              6. Descripción Detallada de los Hechos
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe detalladamente lo observado por consola, hora exacta, involucrados, números de cámaras o partes de rondas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white resize-y"
            ></textarea>
          </div>

          {/* Actions Taken */}
          <div>
            <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
              7. Acciones Inmediatas Tomadas
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Se despachó vigilante a pie de verificación, se notificó al supervisor de guardia..."
              value={actionsTaken}
              onChange={(e) => setActionsTaken(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
            ></textarea>
          </div>

          {/* Severity & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Severidad
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
              >
                <option value="BAJA">Baja (Riesgo Leve)</option>
                <option value="MEDIA">Media (Requiere Atención)</option>
                <option value="ALTA">Alta (Afecta Operación)</option>
                <option value="CRÍTICA">Crítica (Incidente Grave / Peligro Inminente)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Estado Inicial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as IncidentStatus)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white"
              >
                <option value="ABIERTO">Abierto</option>
                <option value="EN_GESTION">En Gestión</option>
                <option value="REPORTADO_LEGIO">Reportado a Legio</option>
                <option value="RESUELTO">Resuelto</option>
              </select>
            </div>
          </div>

          {/* Checkboxes: LEGIO & CCTV */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportedToLegio}
                  onChange={(e) => setReportedToLegio(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-0 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">¿Reportado a LEGIO?</span>
              </label>

              {reportedToLegio && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Nº Ticket Legio:</span>
                  <input
                    type="text"
                    placeholder="LEG-99123"
                    value={legioTicketNumber}
                    onChange={(e) => setLegioTicketNumber(e.target.value)}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cctvCaseResolved}
                onChange={(e) => setCctvCaseResolved(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-0 w-4 h-4"
              />
              <span className="font-semibold text-slate-800">¿Caso resuelto / verificado por CCTV?</span>
            </label>
          </div>

          {/* Evidence Attachments */}
          <div>
            <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-teal-600" />
              Adjuntar Evidencia Fotográfica o Captura de Cámara
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg border border-slate-300 font-semibold flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4 text-teal-600" />
                <span>Subir imágenes...</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageFile}
                  className="hidden"
                />
              </label>
              <span className="text-slate-500 text-[11px]">
                {evidenceImages.length} imagen(es) adjunta(s)
              </span>
            </div>

            {evidenceImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {evidenceImages.map((img, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-300 aspect-video shadow-xs">
                    <img src={img} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEvidenceImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit / Cancel buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-black shadow-md flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar en Matriz de Gestión</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
