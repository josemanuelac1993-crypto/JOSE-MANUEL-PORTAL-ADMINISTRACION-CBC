import React from 'react';
import { TesaliaLogo, LidermanLogo } from './BrandingLogos';
import { Operator, Branch } from '../types';
import { 
  PlusCircle, 
  Sparkles, 
  ChevronDown, 
  ShieldAlert, 
  FileSpreadsheet,
  Building2,
  Calendar,
  RotateCcw,
  Bot
} from 'lucide-react';

interface HeaderProps {
  currentOperator: Operator;
  onOpenOperatorModal: () => void;
  onOpenNewIncident: () => void;
  onOpenAIUpload: () => void;
  onOpenAIChat?: () => void;
  onExportData: () => void;
  onClearReports?: () => void;
  selectedBranch: string;
  onChangeBranch: (b: string) => void;
  branches: Branch[];
  selectedMonth: string;
  onChangeMonth: (m: string) => void;
  months: string[];
}

export const Header: React.FC<HeaderProps> = ({
  currentOperator,
  onOpenOperatorModal,
  onOpenNewIncident,
  onOpenAIUpload,
  onOpenAIChat,
  onExportData,
  onClearReports,
  selectedBranch,
  onChangeBranch,
  branches,
  selectedMonth,
  onChangeMonth,
  months
}) => {
  const isAdmin = currentOperator.id === 'usr-admin';

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top Banner with Logos and Administrator recognition */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand logos & Title */}
          <div className="flex items-center gap-6 flex-wrap">
            <TesaliaLogo className="h-8" />
            <div className="h-7 w-[1px] bg-slate-300 hidden sm:block"></div>
            <LidermanLogo className="h-8" />
            
            <div className="hidden lg:flex flex-col border-l border-slate-200 pl-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                PROYECTO INTEGRAL DE SEGURIDAD
              </span>
              <span className="text-xs font-semibold text-red-600 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                ADMINISTRADO POR: <strong className="text-slate-900 font-bold">JOSÉ MANUEL ARGUELLO COLOMA</strong>
              </span>
            </div>
          </div>

          {/* User profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            
            {/* Operator info pill */}
            <button
              onClick={onOpenOperatorModal}
              className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 transition-all text-left shadow-xs group"
              title="Haz clic para cambiar de operador de consola o ingresar como Administrador"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                isAdmin ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-red-100 text-red-700 border border-red-300'
              }`}>
                {currentOperator.code.slice(0, 3)}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-red-600 truncate max-w-[140px] sm:max-w-[180px]">
                    {currentOperator.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-700" />
                </div>
                <span className="text-[10px] text-slate-500 leading-tight">
                  {currentOperator.role} • <span className="text-emerald-700 font-semibold">{currentOperator.shift.split(' ')[0]}</span>
                </span>
              </div>
            </button>

            {/* AI Assistant Chat Button */}
            {onOpenAIChat && (
              <button
                onClick={onOpenAIChat}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all hover:scale-[1.02] border border-slate-700 ring-2 ring-red-500/20"
                title="Consultar al Asistente Virtual Liderman / Tesalia CBC"
              >
                <Bot className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span>Chat IA</span>
              </button>
            )}

            {/* AI Document Upload Button */}
            <button
              onClick={onOpenAIUpload}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-100" />
              <span>Cargar con IA</span>
              <span className="hidden sm:inline text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-mono">Word/PDF/Excel</span>
            </button>

            {/* New Incident Button for Console Operators */}
            <button
              onClick={onOpenNewIncident}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Registrar Novedad</span>
            </button>

            {/* Export Button */}
            <button
              onClick={onExportData}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              title="Descargar matriz en Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>

            {/* Clear All Reports Button */}
            {onClearReports && (
              <button
                onClick={onClearReports}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-300 transition-colors"
                title="Limpiar todos los reportes para cargar nuevos desde cero"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

          </div>
        </div>

        {/* Global Filter Bar (Branch & Month) */}
        <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-semibold text-slate-800">Filtros Operativos:</span>
            
            {/* Branch filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              <select
                value={selectedBranch}
                onChange={(e) => onChangeBranch(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
              >
                <option value="TODAS" className="bg-white text-slate-800">Todas las Sucursales (6)</option>
                {branches.map(b => (
                  <option key={b} value={b} className="bg-white text-slate-800">{b}</option>
                ))}
              </select>
            </div>

            {/* Month selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <select
                value={selectedMonth}
                onChange={(e) => onChangeMonth(e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
              >
                <option value="TODOS" className="bg-white text-slate-800">Todo el Período 2026</option>
                {months.map(m => (
                  <option key={m} value={m} className="bg-white text-slate-800">{m} 2026</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-emerald-700 font-bold">Consola Central Activa</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="hidden md:inline">Período Operativo: <strong className="text-slate-700">2026</strong></span>
          </div>

        </div>

      </div>
    </header>
  );
};
