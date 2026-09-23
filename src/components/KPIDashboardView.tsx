import React, { useState } from 'react';
import { Incident, Branch, BRANCHES, TAXONOMY, MainSection } from '../types';
import { 
  BarChart3, 
  Building2, 
  Eye,
  FileSpreadsheet
} from 'lucide-react';

interface KPIDashboardViewProps {
  incidents: Incident[];
  selectedBranch: string;
  selectedMonth: string;
  activeMainSection: MainSection;
  onSelectIncident: (inc: Incident) => void;
}

export const KPIDashboardView: React.FC<KPIDashboardViewProps> = ({
  incidents,
  selectedBranch,
  selectedMonth,
  activeMainSection,
  onSelectIncident
}) => {
  const [selectedSubTab, setSelectedSubTab] = useState<'MATRIZ' | 'GRAFICOS' | 'SUCURSALES'>('MATRIZ');

  // Filter incidents by section, branch, month
  const filteredIncidents = incidents.filter(inc => {
    if (activeMainSection && inc.mainSection !== activeMainSection) return false;
    if (selectedBranch !== 'TODAS' && inc.branch !== selectedBranch) return false;
    if (selectedMonth !== 'TODOS' && inc.month !== selectedMonth) return false;
    return true;
  });

  // Calculate counts per item for the current active section
  const relevantTaxonomies = TAXONOMY.filter(t => t.mainSection === activeMainSection);

  // Group metrics by Taxonomy
  const taxonomyStats = relevantTaxonomies.map(tax => {
    const itemsCount = tax.items.map(item => {
      const matching = filteredIncidents.filter(inc => inc.item === item);
      return {
        name: item,
        count: matching.length,
        incidents: matching
      };
    });

    const totalSectionCount = itemsCount.reduce((acc, curr) => acc + curr.count, 0);

    return {
      subSection: tax.subSection,
      subSectionLabel: tax.subSectionLabel,
      classificationType: tax.classificationType,
      items: itemsCount,
      total: totalSectionCount
    };
  });

  const grandTotal = taxonomyStats.reduce((acc, curr) => acc + curr.total, 0);

  // Calculate branch distribution
  const branchStats = BRANCHES.map(branch => {
    const count = incidents.filter(inc => 
      inc.branch === branch && 
      (activeMainSection ? inc.mainSection === activeMainSection : true) &&
      (selectedMonth !== 'TODOS' ? inc.month === selectedMonth : true)
    ).length;
    return { branch, count };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Subtabs for Matrix view vs Charts vs Branches */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedSubTab('MATRIZ')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedSubTab === 'MATRIZ'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Matriz Oficial de Indicadores</span>
          </button>

          <button
            onClick={() => setSelectedSubTab('GRAFICOS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedSubTab === 'GRAFICOS'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Gráficos de Barras y Tendencias</span>
          </button>

          <button
            onClick={() => setSelectedSubTab('SUCURSALES')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedSubTab === 'SUCURSALES'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Comparativa por Sucursales</span>
          </button>
        </div>

        <div className="text-xs text-slate-600 flex items-center gap-2">
          <span>Total Novedades en Vista:</span>
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
            {filteredIncidents.length}
          </span>
        </div>
      </div>

      {/* VIEW 1: OFFICIAL MATRIX (Replicating exact PDF tables) */}
      {selectedSubTab === 'MATRIZ' && (
        <div className="space-y-6">
          {taxonomyStats.map((group, gIdx) => (
            <div 
              key={gIdx} 
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
            >
              {/* Table Header Header */}
              <div className={`p-4 border-b border-slate-200 flex items-center justify-between ${
                activeMainSection === 'SEGURIDAD_FISICA'
                  ? 'bg-gradient-to-r from-blue-50 to-white'
                  : 'bg-gradient-to-r from-emerald-50 to-white'
              }`}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    {group.subSectionLabel}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {group.classificationType.toUpperCase()}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">Subtotal:</span>
                  <span className="font-mono font-extrabold text-red-600 text-sm bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
                    {group.total}
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold">
                      <th className="py-2.5 px-4 w-12 text-center">Nº</th>
                      <th className="py-2.5 px-4">Ítem de Indicador / Novedad</th>
                      <th className="py-2.5 px-4 text-center w-24">Total</th>
                      <th className="py-2.5 px-4 text-center w-28">Porcentaje</th>
                      <th className="py-2.5 px-4 text-right w-32">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.items.map((it, idx) => {
                      const percentage = grandTotal > 0 ? ((it.count / grandTotal) * 100).toFixed(1) : '0.0';
                      const hasIncidents = it.count > 0;

                      return (
                        <tr 
                          key={idx}
                          className={`hover:bg-slate-50 transition-colors ${
                            hasIncidents ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 text-center text-slate-400 font-mono font-semibold">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            {it.name}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold">
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              hasIncidents ? 'bg-red-100 text-red-700 border border-red-200' : 'text-slate-400'
                            }`}>
                              {it.count}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-semibold">{hasIncidents ? `${percentage}%` : '0%'}</span>
                              {hasIncidents && (
                                <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                  <div 
                                    className="bg-red-600 h-full rounded-full"
                                    style={{ width: `${Math.min(100, Number(percentage) * 2)}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {hasIncidents ? (
                              <button
                                onClick={() => {
                                  if (it.incidents[0]) onSelectIncident(it.incidents[0]);
                                }}
                                className="text-teal-700 hover:text-teal-900 font-bold inline-flex items-center gap-1 hover:underline text-[11px]"
                              >
                                <Eye className="w-3 h-3" />
                                Ver detalle ({it.count})
                              </button>
                            ) : (
                              <span className="text-slate-300 text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                      <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider text-[11px] text-slate-600">
                        SUBTOTAL {group.classificationType.toUpperCase()}:
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-red-600 text-sm font-black">
                        {group.total}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-700">
                        {grandTotal > 0 ? `${((group.total / grandTotal) * 100).toFixed(0)}%` : '0%'}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: BAR CHARTS & TRENDS (Replicating exact PDF visual charts) */}
      {selectedSubTab === 'GRAFICOS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {taxonomyStats.map((group, gIdx) => {
            const maxVal = Math.max(...group.items.map(i => i.count), 1);

            return (
              <div 
                key={gIdx}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        {group.subSectionLabel}
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900">
                        {group.classificationType}
                      </h4>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-800 font-mono px-2 py-0.5 rounded border border-slate-200 font-bold">
                      Total: {group.total}
                    </span>
                  </div>

                  {/* Horizontal Bar Visualizer */}
                  <div className="space-y-3">
                    {group.items.map((it, idx) => {
                      const barWidth = maxVal > 0 ? (it.count / maxVal) * 100 : 0;

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className={`truncate max-w-[260px] sm:max-w-[340px] ${
                              it.count > 0 ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'
                            }`}>
                              {it.name}
                            </span>
                            <span className={`font-mono text-xs font-black ${
                              it.count > 0 ? 'text-red-600' : 'text-slate-400'
                            }`}>
                              {it.count}
                            </span>
                          </div>
                          
                          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                it.count > 0 
                                  ? 'bg-gradient-to-r from-red-600 to-amber-500' 
                                  : 'bg-transparent'
                              }`}
                              style={{ width: `${Math.max(barWidth, it.count > 0 ? 8 : 0)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Valores consolidados - Período 2026</span>
                  <span className="text-teal-700 font-bold">Consola Liderman - Tesalia CBC</span>
                </div>
              </div>
            );
          })}

        </div>
      )}

      {/* VIEW 3: SUCURSALES COMPARISON */}
      {selectedSubTab === 'SUCURSALES' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-red-600" />
                Distribución de Incidentes por Sucursales (6 Localidades)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Seguimiento por planta y agencia en el Proyecto Tesalia CBC
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Total en Sucursales:</span>
              <span className="font-mono font-black text-lg text-slate-900">
                {branchStats.reduce((a, b) => a + b.count, 0)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchStats.map((bs, i) => {
              const maxBranch = Math.max(...branchStats.map(b => b.count), 1);
              const branchPercentage = ((bs.count / maxBranch) * 100);

              return (
                <div 
                  key={i}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        LOCALIDAD OFICIAL
                      </span>
                      <h4 className="font-extrabold text-base text-slate-900 mt-0.5">
                        {bs.branch}
                      </h4>
                    </div>
                    <span className="text-lg font-mono font-black text-red-600 bg-red-50 px-2.5 py-0.5 rounded border border-red-200">
                      {bs.count}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Carga operativa</span>
                      <span className="font-bold">{bs.count} novedades</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-teal-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(branchPercentage, bs.count > 0 ? 10 : 2)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};
