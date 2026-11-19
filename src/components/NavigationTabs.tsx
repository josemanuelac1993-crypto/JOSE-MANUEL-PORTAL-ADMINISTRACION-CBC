import React from 'react';
import { MainSection } from '../types';
import { 
  Shield, 
  HardHat, 
  ListFilter, 
  Activity, 
  HardDrive
} from 'lucide-react';

interface NavigationTabsProps {
  activeModule: 'NOVEDADES' | 'DRIVE';
  onChangeActiveModule: (m: 'NOVEDADES' | 'DRIVE') => void;
  activeMainSection: MainSection;
  onChangeMainSection: (s: MainSection) => void;
  activeViewMode: 'MATRIZ' | 'LISTADO';
  onChangeViewMode: (v: 'MATRIZ' | 'LISTADO') => void;
  totalSecurityCount: number;
  totalSSOMACount: number;
  totalDocsCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeModule,
  onChangeActiveModule,
  activeMainSection,
  onChangeMainSection,
  activeViewMode,
  onChangeViewMode,
  totalSecurityCount,
  totalSSOMACount,
  totalDocsCount
}) => {
  return (
    <div className="space-y-4">
      
      {/* Top Module Switcher: Matriz de Novedades vs Repositorio Documental Tipo Drive */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1 border-b border-sky-100">
        <div className="flex items-center gap-1.5 p-1 bg-white/80 backdrop-blur-md rounded-2xl border border-sky-150 shadow-xs">
          <button
            type="button"
            onClick={() => onChangeActiveModule('NOVEDADES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeModule === 'NOVEDADES'
                ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4 h-4 text-rose-400" />
            <span>Matriz & Novedades Operativas</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/20 text-white">
              {totalSecurityCount + totalSSOMACount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChangeActiveModule('DRIVE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeModule === 'DRIVE'
                ? 'bg-gradient-to-r from-teal-700 to-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <HardDrive className="w-4 h-4 text-teal-400" />
            <span>Repositorio Digital Tipo Drive</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
              {totalDocsCount} Archivos
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium hidden sm:block">
          {activeModule === 'NOVEDADES' 
            ? 'Monitoreo de CCTV y Clasificación de Matriz' 
            : 'Oportunidades de Mejora • Capacitaciones • Informes Realizados'}
        </div>
      </div>

      {/* When in NOVEDADES module: Show Sección & Subtab switchers */}
      {activeModule === 'NOVEDADES' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Primary Section Tabs: SEGURIDAD FÍSICA vs SEGURIDAD INDUSTRIAL (SSOMA) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            
            {/* Tab 1: SEGURIDAD FÍSICA */}
            <button
              type="button"
              onClick={() => onChangeMainSection('SEGURIDAD_FISICA')}
              className={`relative p-4 sm:p-5 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between group ${
                activeMainSection === 'SEGURIDAD_FISICA'
                  ? 'bg-gradient-to-r from-sky-50 via-blue-50/70 to-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                  : 'bg-white/80 backdrop-blur-xs border-sky-100 hover:border-blue-300 hover:bg-white shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`p-3 rounded-xl transition-colors ${
                  activeMainSection === 'SEGURIDAD_FISICA'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-100 text-slate-600 group-hover:text-slate-900'
                }`}>
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                      SEGURIDAD FÍSICA
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      {totalSecurityCount} Registros
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    Incidentes Security • KPI Mejora de Servicio • Gestión Interna
                  </p>
                </div>
              </div>

              <div className="hidden sm:block">
                <div className={`w-3.5 h-3.5 rounded-full ${
                  activeMainSection === 'SEGURIDAD_FISICA' ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-300'
                }`}></div>
              </div>
            </button>

            {/* Tab 2: SEGURIDAD INDUSTRIAL (SSOMA) */}
            <button
              type="button"
              onClick={() => onChangeMainSection('SSOMA')}
              className={`relative p-4 sm:p-5 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between group ${
                activeMainSection === 'SSOMA'
                  ? 'bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-white/80 backdrop-blur-xs border-sky-100 hover:border-emerald-300 hover:bg-white shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`p-3 rounded-xl transition-colors ${
                  activeMainSection === 'SSOMA'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-100 text-slate-600 group-hover:text-slate-900'
                }`}>
                  <HardHat className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                      SEGURIDAD INDUSTRIAL (SSOMA)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {totalSSOMACount} Registros
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    Safety (Condiciones) • Medio Ambiente (SMA) • Salud Ocupacional (SSO)
                  </p>
                </div>
              </div>

              <div className="hidden sm:block">
                <div className={`w-3.5 h-3.5 rounded-full ${
                  activeMainSection === 'SSOMA' ? 'bg-emerald-600 ring-4 ring-emerald-100' : 'bg-slate-300'
                }`}></div>
              </div>
            </button>

          </div>

          {/* Secondary View Switcher: Matrix/KPIs vs Novedades List */}
          <div className="flex items-center justify-between border-b border-sky-100 pb-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChangeViewMode('MATRIZ')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeViewMode === 'MATRIZ'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm'
                    : 'bg-white/80 backdrop-blur-xs text-slate-700 hover:text-slate-900 hover:bg-white border border-sky-100 shadow-2xs'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Matriz de Indicadores y Gráficos</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeViewMode('LISTADO')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeViewMode === 'LISTADO'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm'
                    : 'bg-white/80 backdrop-blur-xs text-slate-700 hover:text-slate-900 hover:bg-white border border-sky-100 shadow-2xs'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Listado Detallado de Novedades (Ventana Flotante)</span>
              </button>
            </div>

            <span className="text-xs text-slate-500 hidden sm:inline">
              Sección activa: <strong className="text-slate-900 font-bold">{activeMainSection === 'SEGURIDAD_FISICA' ? 'Seguridad Física' : 'SSOMA'}</strong>
            </span>
          </div>

        </div>
      )}

    </div>
  );
};
