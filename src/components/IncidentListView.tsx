import React, { useState } from 'react';
import { Incident, MainSection, IncidentStatus } from '../types';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  ChevronRight,
  Sparkles,
  Layers
} from 'lucide-react';

interface IncidentListViewProps {
  incidents: Incident[];
  activeMainSection: MainSection;
  selectedBranch: string;
  selectedMonth: string;
  onSelectIncident: (inc: Incident) => void;
}

export const IncidentListView: React.FC<IncidentListViewProps> = ({
  incidents,
  activeMainSection,
  selectedBranch,
  selectedMonth,
  onSelectIncident
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [subSectionFilter, setSubSectionFilter] = useState<string>('TODOS');

  // Filter incidents
  const filtered = incidents.filter(inc => {
    if (activeMainSection && inc.mainSection !== activeMainSection) return false;
    if (selectedBranch !== 'TODAS' && inc.branch !== selectedBranch) return false;
    if (selectedMonth !== 'TODOS' && inc.month !== selectedMonth) return false;
    if (statusFilter !== 'TODOS' && inc.status !== statusFilter) return false;
    if (subSectionFilter !== 'TODOS' && inc.subSection !== subSectionFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = inc.title?.toLowerCase().includes(q);
      const matchDesc = inc.description?.toLowerCase().includes(q);
      const matchItem = inc.item?.toLowerCase().includes(q);
      const matchLoc = inc.specificLocation?.toLowerCase().includes(q);
      const matchBranch = inc.branch?.toLowerCase().includes(q);
      const matchOp = inc.operator?.name?.toLowerCase().includes(q);
      const matchCode = inc.id?.toLowerCase().includes(q) || inc.code?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchItem || matchLoc || matchBranch || matchOp || matchCode;
    }

    return true;
  });

  const getStatusPill = (status: IncidentStatus) => {
    switch (status) {
      case 'RESUELTO':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Resuelto
          </span>
        );
      case 'REPORTADO_LEGIO':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Send className="w-3 h-3 text-indigo-600" /> Reportado a Legio
          </span>
        );
      case 'EN_GESTION':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> En Gestión
          </span>
        );
      case 'ABIERTO':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> Abierto
          </span>
        );
    }
  };

  const getSeverityPill = (sev: string) => {
    switch (sev) {
      case 'CRÍTICA':
        return <span className="text-[10px] px-2 py-0.5 rounded font-black bg-red-600 text-white uppercase">Crítica</span>;
      case 'ALTA':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-orange-600 text-white uppercase">Alta</span>;
      case 'MEDIA':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500 text-white uppercase">Media</span>;
      case 'BAJA':
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-300 uppercase">Baja</span>;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por novedad, ítem, sucursal, operador o código..."
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-red-500 font-medium"
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="ABIERTO">Abiertos</option>
            <option value="EN_GESTION">En Gestión</option>
            <option value="REPORTADO_LEGIO">Reportados a Legio</option>
            <option value="RESUELTO">Resueltos</option>
          </select>

          {/* SubSection Filter */}
          <select
            value={subSectionFilter}
            onChange={(e) => setSubSectionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-red-500 font-medium"
          >
            <option value="TODOS">Todas las Subsecciones</option>
            {activeMainSection === 'SEGURIDAD_FISICA' ? (
              <>
                <option value="SECURITY">Incidentes de Security</option>
                <option value="KPI_MEJORA_SERVICIO">KPI Mejora de Servicio</option>
                <option value="GESTION_INTERNA">Gestión Interna</option>
              </>
            ) : (
              <>
                <option value="SAFETY">Incidentes de Safety</option>
                <option value="SMA">Incidentes de SMA (Medio Ambiente)</option>
                <option value="SSO">Incidentes de SSO (Salud Ocupacional)</option>
              </>
            )}
          </select>
        </div>

      </div>

      {/* Incident Cards / Rows List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-3 shadow-xs">
            <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="font-bold text-base text-slate-800">
              No se encontraron novedades con los filtros seleccionados
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Intenta cambiar los filtros de sucursal, mes o estado, o registra una nueva novedad desde el botón "Registrar Novedad".
            </p>
          </div>
        ) : (
          filtered.map((incident) => {
            const dateStr = new Date(incident.timestamp).toLocaleDateString('es-EC', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });

            return (
              <div
                key={incident.id}
                onClick={() => onSelectIncident(incident)}
                className="bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-red-500/60 rounded-xl p-4 transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md group flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left side details */}
                <div className="space-y-2 flex-1">
                  
                  {/* Tags row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {incident.id}
                    </span>

                    {/* Prominent Sucursal badge with map pin */}
                    <span className="inline-flex items-center gap-1 text-xs font-black text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-md">
                      <MapPin className="w-3.5 h-3.5 text-red-600" />
                      {incident.branch}
                    </span>

                    <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium border border-slate-200">
                      {incident.subSection}
                    </span>

                    {getStatusPill(incident.status)}
                    {getSeverityPill(incident.severity)}

                    {incident.sourceDocument?.analyzedByAI && (
                      <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                        <Sparkles className="w-2.5 h-2.5 text-teal-600" /> IA
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-red-600 transition-colors">
                    {incident.title}
                  </h3>

                  {/* Matrix Item & Location */}
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <span className="text-amber-800 font-bold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Layers className="w-3.5 h-3.5 text-amber-600" />
                      {incident.item}
                    </span>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <span className="text-slate-600">
                      Ubicación: <strong className="text-slate-900">{incident.specificLocation}</strong>
                    </span>
                  </div>

                  {/* Description preview */}
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {incident.description}
                  </p>

                </div>

                {/* Right side metadata & action button */}
                <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-2 md:pt-0 border-slate-200 gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-slate-600 font-medium flex items-center md:justify-end gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {dateStr}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Operador: <strong className="text-slate-800 font-semibold">{incident.operator?.name?.split(' ')[0] || 'Consola'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-red-600 group-hover:translate-x-0.5 transition-all">
                    <span>Ver detalle</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
