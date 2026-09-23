import React, { useState } from 'react';
import { Incident, IncidentStatus } from '../types';
import { 
  X, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Send, 
  Printer, 
  Upload, 
  Maximize2, 
  ShieldAlert,
  Layers,
  User,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface IncidentModalProps {
  incident: Incident | null;
  onClose: () => void;
  onUpdateStatus?: (id: string, newStatus: IncidentStatus, followUpNote?: string) => void;
  onAddEvidenceImage?: (id: string, imageUrl: string) => void;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({
  incident,
  onClose,
  onUpdateStatus,
  onAddEvidenceImage
}) => {
  if (!incident) return null;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeImageZoom, setActiveImageZoom] = useState<string | null>(null);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus>(incident.status);
  const [uploadingImage, setUploadingImage] = useState(false);

  const images = incident.evidenceImages || [];
  const currentImage = images[selectedImageIndex] || images[0];

  const handleStatusChange = (status: IncidentStatus) => {
    setSelectedStatus(status);
    if (onUpdateStatus) {
      onUpdateStatus(incident.id, status);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !onUpdateStatus) return;
    onUpdateStatus(incident.id, selectedStatus, newNote.trim());
    setNewNote('');
  };

  const handleAttachImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      if (onAddEvidenceImage) {
        onAddEvidenceImage(incident.id, dataUrl);
      } else {
        // Direct API call fallback
        try {
          await fetch(`/api/incidents/${incident.id}/evidence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: dataUrl })
          });
          if (!incident.evidenceImages) incident.evidenceImages = [];
          incident.evidenceImages.push(dataUrl);
        } catch (err) {
          console.error('Error attaching image:', err);
        }
      }
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'RESUELTO':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Resuelto
          </span>
        );
      case 'REPORTADO_LEGIO':
        return (
          <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-2xs">
            <Send className="w-3.5 h-3.5 text-indigo-600" /> Reportado a Legio
          </span>
        );
      case 'EN_GESTION':
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> En Gestión
          </span>
        );
      case 'ABIERTO':
      default:
        return (
          <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Abierto
          </span>
        );
    }
  };

  const formattedDate = new Date(incident.timestamp).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Simple & Clean Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Prominent Sucursal badge */}
            <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full text-xs font-black tracking-wide">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              {incident.branch}
            </span>

            {/* Main Section */}
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              incident.mainSection === 'SEGURIDAD_FISICA'
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {incident.mainSection === 'SEGURIDAD_FISICA' ? '🛡️ Seguridad Física' : '🌿 SSOMA'}
            </span>

            {getStatusBadge(incident.status)}

            <span className="font-mono text-xs text-slate-600 font-bold">
              #{incident.id}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => window.print()}
              className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              title="Imprimir ficha de novedad"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Simple, focused, visual layout */}
        <div className="px-6 py-5 overflow-y-auto space-y-6">
          
          {/* Top Title & Subheading */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              {incident.title}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-600 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                {formattedDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-600" />
                Operador: <strong className="text-slate-700">{incident.operator?.name || 'Consola Liderman'}</strong>
              </span>
              {incident.specificLocation && (
                <>
                  <span>•</span>
                  <span>Ubicación: <strong className="text-slate-700">{incident.specificLocation}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* TWO MAIN CARDS: 1. ¿QUÉ PASÓ? | 2. CAPTURA O FOTO DEL EVENTO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT / MAIN COLUMN: ¿QUÉ PASÓ? (7 cols on desktop) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Box: Detalle de los hechos */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    ¿Qué pasó en el evento?
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">
                    Severidad: <strong className="text-slate-800 font-bold">{incident.severity}</strong>
                  </span>
                </div>

                <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line font-normal">
                  {incident.description || 'Sin descripción detallada registrada para esta novedad.'}
                </p>
              </div>

              {/* Box: Acciones Inmediatas Tomadas */}
              {incident.actionsTaken && (
                <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Acciones tomadas / Medidas correctivas
                  </span>
                  <p className="text-xs text-emerald-950 leading-relaxed font-medium">
                    {incident.actionsTaken}
                  </p>
                </div>
              )}

              {/* Classification Tag Row (Compact & Clean) */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <div className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 flex items-center gap-1.5 font-medium">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ítem: <strong className="text-slate-900">{incident.item}</strong></span>
                </div>
                <span className="text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                  {incident.classificationType}
                </span>
                {incident.reportedToLegio && (
                  <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg font-bold">
                    Ticket Legio: {incident.legioTicketNumber || 'Generado'}
                  </span>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: FOTO O CAPTURA DEL EVENTO (5 cols on desktop) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-teal-600" />
                  Foto o Captura del Evento
                </span>
                
                {/* Upload photo button */}
                <label className="text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer flex items-center gap-1 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition-colors">
                  <Upload className="w-3 h-3" />
                  <span>{uploadingImage ? 'Subiendo...' : '+ Adjuntar foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAttachImage}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              </div>

              {/* Image Preview or Clean Empty State */}
              {images.length > 0 ? (
                <div className="space-y-2">
                  <div 
                    onClick={() => setActiveImageZoom(currentImage)}
                    className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-4/3 cursor-pointer shadow-sm hover:shadow-md transition-all"
                  >
                    <img
                      src={currentImage}
                      alt={incident.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                      <Maximize2 className="w-4 h-4" />
                      <span>Clic para ampliar pantalla completa</span>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded font-mono">
                      Captura {selectedImageIndex + 1} de {images.length}
                    </div>
                  </div>

                  {/* Thumbnail bar if more than 1 image */}
                  {images.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`w-14 h-11 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                            selectedImageIndex === idx ? 'border-red-600 ring-1 ring-red-500' : 'border-slate-200 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt="mini" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Clean Empty State when no photo exists */
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-700 block">
                      Sin captura fotográfica registrada
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Puedes adjuntar una foto o captura de consola ahora mismo
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer shadow-2xs transition-colors">
                    <Upload className="w-3.5 h-3.5 text-teal-600" />
                    <span>Seleccionar foto o captura</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAttachImage}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

            </div>

          </div>

          {/* Quick Status Bar & Bitácora toggle */}
          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-medium">Actualizar estado:</span>
              {(['ABIERTO', 'EN_GESTION', 'REPORTADO_LEGIO', 'RESUELTO'] as IncidentStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    selectedStatus === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowFollowUps(!showFollowUps)}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Bitácora de seguimiento ({incident.followUps?.length || 0})</span>
              {showFollowUps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Collapsible Follow-up Section */}
          {showFollowUps && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200 text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                Historial de notas del operador
              </span>

              {incident.followUps && incident.followUps.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {incident.followUps.map((fu) => (
                    <div key={fu.id} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs space-y-0.5">
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <strong className="text-slate-900">{fu.author}</strong>
                        <span>{new Date(fu.date).toLocaleString('es-EC')}</span>
                      </div>
                      <p className="text-slate-700">{fu.note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">No hay notas registradas aún.</p>
              )}

              {/* Add follow up form */}
              <form onSubmit={handleAddNote} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Escribir nota de seguimiento..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                >
                  Agregar
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="text-xs text-slate-600 font-medium">
            Tesalia CBC • Administrado por José Manuel Arguello Coloma
          </div>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            Cerrar Detalle
          </button>
        </div>

      </div>

      {/* Fullscreen Image Lightbox Zoom */}
      {activeImageZoom && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setActiveImageZoom(null)}
        >
          <img
            src={activeImageZoom}
            alt="Captura ampliada"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          />
          <button
            onClick={() => setActiveImageZoom(null)}
            className="absolute top-5 right-5 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

    </div>
  );
};
