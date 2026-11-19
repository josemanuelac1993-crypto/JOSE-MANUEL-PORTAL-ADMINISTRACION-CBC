import React from 'react';
import { TesaliaLogo, LidermanLogo } from './BrandingLogos';
import { Operator, Branch } from '../types';
import { User } from 'firebase/auth';
import { 
  PlusCircle, 
  Sparkles, 
  ChevronDown, 
  ShieldAlert, 
  FileSpreadsheet,
  Building2,
  Calendar,
  FileText,
  HardDrive,
  Download,
  CloudCheck,
  CheckCircle2
} from 'lucide-react';
import { downloadOfficialExcelTemplate } from '../utils/excelTemplateGenerator';

interface HeaderProps {
  currentOperator: Operator;
  googleUser?: User | null;
  onOpenOperatorModal: () => void;
  onOpenNewIncident: () => void;
  onOpenAIUpload: () => void;
  onOpenExcelBatch?: () => void;
  onOpenGoogleWorkspace?: () => void;
  isGoogleConnected?: boolean;
  onOpenAIChat?: () => void;
  onExportData: () => void;
  onOpenExecutiveReport?: () => void;
  selectedBranch: string;
  onChangeBranch: (b: string) => void;
  branches: Branch[];
  selectedMonth: string;
  onChangeMonth: (m: string) => void;
  months: string[];
}

export const Header: React.FC<HeaderProps> = ({
  currentOperator,
  googleUser,
  onOpenOperatorModal,
  onOpenNewIncident,
  onOpenAIUpload,
  onOpenExcelBatch,
  onOpenGoogleWorkspace,
  isGoogleConnected = false,
  onOpenAIChat,
  onExportData,
  onOpenExecutiveReport,
  selectedBranch,
  onChangeBranch,
  branches,
  selectedMonth,
  onChangeMonth,
  months
}) => {
  const isAdmin = currentOperator.id === 'usr-admin';

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-sky-100 sticky top-0 z-40 shadow-[0_4px_20px_-4px_rgba(14,165,233,0.06)]">
      {/* Top Banner with Logos and Administrator recognition - Ultra-compact layout for maximum vertical workspace */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1 sm:py-1.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 sm:gap-2">
          
          {/* Brand logos & Title */}
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
            <TesaliaLogo className="h-5 sm:h-6" />
            <div className="h-4 sm:h-5 w-[1px] bg-slate-300 hidden sm:block"></div>
            <LidermanLogo className="h-5 sm:h-6" />
            
            <div className="hidden lg:flex flex-col border-l border-slate-200 pl-2.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                PROYECTO INTEGRAL DE SEGURIDAD
              </span>
              <span className="text-[10px] font-semibold text-red-600 flex items-center gap-1 leading-tight">
                <ShieldAlert className="w-2.5 h-2.5 text-red-600" />
                ADMINISTRADO POR: <strong className="text-slate-900 font-bold">JOSÉ MANUEL ARGUELLO COLOMA</strong>
              </span>
            </div>
          </div>

          {/* User profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
            
            {/* Operator info pill */}
            <button
              onClick={onOpenOperatorModal}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-300 hover:border-slate-400 transition-all text-left shadow-xs group"
              title="Haz clic para cambiar de operador de consola o ingresar como Administrador"
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] ${
                isAdmin ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-red-100 text-red-700 border border-red-300'
              }`}>
                {currentOperator.code.slice(0, 3)}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-red-600 truncate max-w-[130px] sm:max-w-[170px]">
                    {currentOperator.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-700" />
                </div>
                <span className="text-[9.5px] text-slate-500 leading-tight">
                  {currentOperator.role} • <span className="text-emerald-700 font-semibold">{currentOperator.shift.split(' ')[0]}</span>
                </span>
              </div>
            </button>

            {/* Download Official Template Base */}
            <button
              onClick={downloadOfficialExcelTemplate}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs hover:scale-[1.02]"
              title="Descargar Plantilla Oficial Excel (.xlsx) estructurada para carga sin errores"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden lg:inline">Plantilla Base Excel</span>
              <span className="lg:hidden">Plantilla</span>
            </button>

            {/* Google Account & Cloud Sync Status Button with Pulsing Status Beacon */}
            {onOpenGoogleWorkspace && (
              <button
                onClick={onOpenGoogleWorkspace}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-2xs group ${
                  googleUser
                    ? 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-950 border-emerald-300'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
                title={googleUser ? `Conectado permanentemente como ${googleUser.email}. Luz verde intermitente indica conexión activa en tiempo real.` : 'Iniciar sesión con cuenta de Google Workspace'}
              >
                {/* Luz intermitente indicadora de estado en vivo */}
                {googleUser ? (
                  <span className="relative flex h-2.5 w-2.5 shrink-0" title="Sesión activa y conectada">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]"></span>
                  </span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" title="Sin sesión de Google"></span>
                )}

                <HardDrive className={`w-3.5 h-3.5 ${googleUser ? 'text-emerald-700' : 'text-slate-500'}`} />
                {googleUser ? (
                  <span className="max-w-[130px] sm:max-w-[180px] truncate text-emerald-950 font-bold">
                    {googleUser.email?.split('@')[0]}
                  </span>
                ) : (
                  <>
                    <span className="hidden md:inline">Iniciar Sesión Google</span>
                    <span className="md:hidden">Google</span>
                  </>
                )}
              </button>
            )}

            {/* AI Document Upload Button */}
            <button
              onClick={onOpenAIUpload}
              className="flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-100" />
              <span>Cargar con IA</span>
              <span className="hidden sm:inline text-[9.5px] bg-black/20 px-1 py-0.5 rounded font-mono">Word/Excel</span>
            </button>

            {/* New Incident Button for Console Operators */}
            <button
              onClick={onOpenNewIncident}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Registrar Novedad</span>
            </button>

            {/* Batch Button (en reemplazo de Descargar Matriz Excel) */}
            {onOpenExcelBatch && (
              <button
                onClick={onOpenExcelBatch}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Actualizar en Batch desde Excel y asignar fotos a novedades"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Batch</span>
              </button>
            )}

            {/* Official Word Report Button */}
            {onOpenExecutiveReport && (
              <button
                onClick={onOpenExecutiveReport}
                className="flex items-center gap-1.5 px-2.5 py-1 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 text-xs font-bold transition-colors shadow-2xs"
                title="Generar reporte ejecutivo oficial en Microsoft Word (.doc)"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Reporte Word</span>
              </button>
            )}

          </div>
        </div>

        {/* Global Filter Bar (Branch & Month) - Compact Height */}
        <div className="mt-1 pt-1 border-t border-sky-100/80 flex flex-wrap items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-semibold text-slate-800 text-[11px]">Filtros:</span>
            
            {/* Branch filter */}
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">
              <Building2 className="w-3 h-3 text-teal-600" />
              <select
                value={selectedBranch}
                onChange={(e) => onChangeBranch(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-[11px]"
              >
                <option value="TODAS" className="bg-white text-slate-800">Todas las Sucursales (6)</option>
                {branches.map(b => (
                  <option key={b} value={b} className="bg-white text-slate-800">{b}</option>
                ))}
              </select>
            </div>

            {/* Month selector */}
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">
              <Calendar className="w-3 h-3 text-amber-600" />
              <select
                value={selectedMonth}
                onChange={(e) => onChangeMonth(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-[11px]"
              >
                <option value="TODOS" className="bg-white text-slate-800">Todo el Período 2026</option>
                {months.map(m => (
                  <option key={m} value={m} className="bg-white text-slate-800">{m} 2026</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-[10.5px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-emerald-700 font-bold">Consola Activa</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="hidden md:inline">Período: <strong className="text-slate-700">2026</strong></span>
          </div>

        </div>

      </div>
    </header>
  );
};
