import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Incident, 
  Operator, 
  OPERATOR_PROFILES, 
  BRANCHES, 
  MONTHS, 
  MainSection,
  IncidentStatus,
  DocumentFolder,
  StoredDocument
} from './types';
import { Header } from './components/Header';
import { NavigationTabs } from './components/NavigationTabs';
import { KPIDashboardView } from './components/KPIDashboardView';
import { IncidentListView } from './components/IncidentListView';
import { IncidentModal } from './components/IncidentModal';
import { NewIncidentModal } from './components/NewIncidentModal';
import { AIUploadModal } from './components/AIUploadModal';
import { OperatorSwitchModal } from './components/OperatorSwitchModal';
import { DocumentDriveView } from './components/DocumentDriveView';
import { AIChatDrawer } from './components/AIChatDrawer';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Sparkles,
  PlusCircle,
  FileText,
  Bot
} from 'lucide-react';

export default function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active User / Operator
  const [currentOperator, setCurrentOperator] = useState<Operator>(OPERATOR_PROFILES[0]); // José Manuel Arguello Coloma

  // Top Module Switcher: Novedades & Matriz vs Repositorio Digital Tipo Drive
  const [activeModule, setActiveModule] = useState<'NOVEDADES' | 'DRIVE'>('NOVEDADES');

  // Navigation & Filter States for Novedades
  const [activeMainSection, setActiveMainSection] = useState<MainSection>('SEGURIDAD_FISICA');
  const [activeViewMode, setActiveViewMode] = useState<'MATRIZ' | 'LISTADO'>('MATRIZ');
  const [selectedBranch, setSelectedBranch] = useState<string>('TODAS');
  const [selectedMonth, setSelectedMonth] = useState<string>('AGOSTO');

  // Drive Repository Data
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);

  // Modals
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);
  const [showAIUploadModal, setShowAIUploadModal] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [showAIChatDrawer, setShowAIChatDrawer] = useState(false);

  // Fetch initial incidents
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/incidents');
      const data = await res.json();
      if (data.success && Array.isArray(data.incidents)) {
        setIncidents(data.incidents);
      }
    } catch (err: any) {
      console.error('Error fetching incidents:', err);
      setErrorMessage('No se pudieron cargar los datos del servidor. Verifique su conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch repository folders and documents
  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        setFolders(data.folders || []);
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchDocuments();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Clear all reports data to start fresh
  const handleClearReports = async () => {
    if (!window.confirm('¿Deseas limpiar todos los reportes actuales para cargar nuevos documentos (Word o PDF) desde cero?')) {
      return;
    }
    try {
      const res = await fetch('/api/incidents/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIncidents([]);
        setSelectedIncident(null);
        showToast('✓ Se han limpiado todos los reportes. Plataforma lista para recibir tus nuevos archivos.');
      }
    } catch (err) {
      console.error('Error clearing:', err);
    }
  };

  // Create manual incident from operator
  const handleCreateIncident = async (newIncidentData: Partial<Incident>) => {
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIncidentData)
      });
      const data = await res.json();
      if (data.success && data.incident) {
        setIncidents(prev => [data.incident, ...prev]);
        setShowNewIncidentModal(false);
        showToast(`✓ Novedad ${data.incident.id} registrada exitosamente`);
        setSelectedIncident(data.incident);
      } else {
        alert(data.error || 'Error al guardar la novedad');
      }
    } catch (err: any) {
      console.error('Error saving incident:', err);
      alert('Error de conexión al registrar la novedad.');
    }
  };

  // Update incident status or add follow-up note
  const handleUpdateIncidentStatus = async (id: string, newStatus: IncidentStatus, followUpNoteText?: string) => {
    const target = incidents.find(i => i.id === id);
    if (!target) return;

    const followUps = [...(target.followUps || [])];
    if (followUpNoteText) {
      followUps.push({
        id: `flw-${Date.now()}`,
        date: new Date().toISOString(),
        author: currentOperator.name,
        note: followUpNoteText,
        statusChange: newStatus
      });
    }

    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          followUps
        })
      });
      const data = await res.json();
      if (data.success && data.incident) {
        setIncidents(prev => prev.map(item => item.id === id ? data.incident : item));
        setSelectedIncident(data.incident);
        showToast(`✓ Estado actualizado a "${newStatus.replace('_', ' ')}"`);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Add evidence image to incident
  const handleAddEvidenceImage = async (id: string, imageUrl: string) => {
    try {
      const res = await fetch(`/api/incidents/${id}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl })
      });
      const data = await res.json();
      if (data.success && data.incident) {
        setIncidents(prev => prev.map(item => item.id === id ? data.incident : item));
        setSelectedIncident(data.incident);
        showToast('✓ Captura de foto adjuntada a la novedad');
      }
    } catch (err) {
      console.error('Error attaching image:', err);
    }
  };

  // Import batch incidents analyzed by AI
  const handleImportAIIncidents = async (importedItems: any[]) => {
    try {
      const res = await fetch('/api/incidents/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: importedItems })
      });
      const data = await res.json();
      if (data.success) {
        await fetchIncidents();
        setShowAIUploadModal(false);
        showToast(`✨ Se importaron y categorizaron ${importedItems.length} novedades con éxito.`);
      }
    } catch (err) {
      console.error('Error importing AI batch:', err);
    }
  };

  // Export current filtered dataset to Excel (.xlsx)
  const handleExportExcel = () => {
    if (incidents.length === 0) {
      alert('No hay novedades registradas para exportar en este momento.');
      return;
    }

    const exportRows = incidents.map(inc => ({
      'ID Novedad': inc.id,
      'Código Interno': inc.code,
      'Sección Principal': inc.mainSection === 'SEGURIDAD_FISICA' ? 'Seguridad Física' : 'SSOMA',
      'Subsección': inc.subSection,
      'Tipo Clasificación': inc.classificationType,
      'Ítem de Matriz': inc.item,
      'Sucursal': inc.branch,
      'Ubicación Específica': inc.specificLocation,
      'Título': inc.title,
      'Descripción Detallada': inc.description,
      'Acciones Tomadas': inc.actionsTaken,
      'Severidad': inc.severity,
      'Estado': inc.status,
      'Fecha': new Date(inc.timestamp).toLocaleDateString('es-EC'),
      'Mes': inc.month,
      'Año': inc.year,
      'Operador Responsable': inc.operator?.name,
      'Código Operador': inc.operator?.code,
      'Turno Operador': inc.operator?.shift,
      'Reportado a Legio': inc.reportedToLegio ? 'SÍ' : 'NO',
      'Ticket Legio': inc.legioTicketNumber || '',
      'Caso Resuelto CCTV': inc.cctvCaseResolved ? 'SÍ' : 'NO',
      'Origen Información': inc.sourceDocument?.name || 'Consola Liderman'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Novedades_Tesalia_CBC');
    XLSX.writeFile(workbook, `Matriz_Novedades_Tesalia_CBC_${selectedMonth}_2026.xlsx`);
    showToast('✓ Archivo Excel descargado exitosamente');
  };

  // Counts for main tabs
  const securityCount = incidents.filter(i => i.mainSection === 'SEGURIDAD_FISICA').length;
  const ssomaCount = incidents.filter(i => i.mainSection === 'SSOMA').length;

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-emerald-500 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        currentOperator={currentOperator}
        onOpenOperatorModal={() => setShowOperatorModal(true)}
        onOpenNewIncident={() => setShowNewIncidentModal(true)}
        onOpenAIUpload={() => setShowAIUploadModal(true)}
        onOpenAIChat={() => setShowAIChatDrawer(true)}
        onExportData={handleExportExcel}
        onClearReports={handleClearReports}
        selectedBranch={selectedBranch}
        onChangeBranch={setSelectedBranch}
        branches={BRANCHES}
        selectedMonth={selectedMonth}
        onChangeMonth={setSelectedMonth}
        months={MONTHS}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Navigation Tabs (Matriz vs Repositorio Drive, and Seguridad Física vs SSOMA) */}
        <NavigationTabs
          activeModule={activeModule}
          onChangeActiveModule={setActiveModule}
          activeMainSection={activeMainSection}
          onChangeMainSection={setActiveMainSection}
          activeViewMode={activeViewMode}
          onChangeViewMode={setActiveViewMode}
          totalSecurityCount={securityCount}
          totalSSOMACount={ssomaCount}
          totalDocsCount={documents.length}
        />

        {/* MODULE 1: NOVEDADES & MATRIZ OPERATIVA */}
        {activeModule === 'NOVEDADES' && (
          <>
            {/* Clean Ready Banner if database is empty */}
            {incidents.length === 0 && !loading && (
              <div className="bg-gradient-to-r from-slate-50 via-teal-50/40 to-slate-50 border border-teal-200/80 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs animate-in fade-in duration-300">
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 bg-teal-100/80 text-teal-800 px-3 py-1 rounded-full text-xs font-bold border border-teal-200">
                    <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                    Base de datos limpia y lista
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    Plataforma lista para nuevos reportes de Tesalia CBC
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                    Los reportes anteriores se han limpiado. Puedes subir tu nuevo documento en formato <strong>Word (.docx)</strong>, <strong>PDF</strong> o <strong>Excel</strong> para que la IA lo organice y distribuya en la matriz por sucursal y categoría.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 flex-wrap justify-center">
                  <button
                    onClick={() => setShowAIUploadModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-md hover:scale-[1.02] transition-all flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-teal-400" />
                    <span>Subir Word / PDF con IA</span>
                  </button>
                  <button
                    onClick={() => setShowNewIncidentModal(true)}
                    className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4 text-red-600" />
                    <span>Registrar Novedad Manual</span>
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-16 text-center space-y-4 shadow-xs">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin mx-auto" />
                <div className="text-sm font-bold text-slate-800">
                  Cargando matriz de indicadores y novedades operativas...
                </div>
                <p className="text-xs text-slate-500">
                  Conectando con la base de datos de gestión Liderman - Tesalia CBC
                </p>
              </div>
            ) : errorMessage ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800 space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                <h3 className="font-bold text-base">{errorMessage}</h3>
                <button
                  onClick={fetchIncidents}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <>
                {/* View Mode 1: Matriz de Indicadores y Gráficos */}
                {activeViewMode === 'MATRIZ' && (
                  <KPIDashboardView
                    incidents={incidents}
                    selectedBranch={selectedBranch}
                    selectedMonth={selectedMonth}
                    activeMainSection={activeMainSection}
                    onSelectIncident={(inc) => setSelectedIncident(inc)}
                  />
                )}

                {/* View Mode 2: Listado de Novedades Reportadas (Floating Modal upon click) */}
                {activeViewMode === 'LISTADO' && (
                  <IncidentListView
                    incidents={incidents}
                    activeMainSection={activeMainSection}
                    selectedBranch={selectedBranch}
                    selectedMonth={selectedMonth}
                    onSelectIncident={(inc) => setSelectedIncident(inc)}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* MODULE 2: REPOSITORIO DOCUMENTAL TIPO DRIVE */}
        {activeModule === 'DRIVE' && (
          <DocumentDriveView
            folders={folders}
            documents={documents}
            currentOperator={currentOperator}
            selectedBranch={selectedBranch}
            onRefresh={fetchDocuments}
            showToast={showToast}
            onIncidentCreated={(newIncident, updatedDoc) => {
              setIncidents(prev => [newIncident, ...prev]);
              setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
              setSelectedIncident(newIncident);
            }}
          />
        )}

      </main>

      {/* Simplified, Clean Floating Modal for Novedades with "¿QUÉ PASÓ?" & Foto / Captura */}
      <IncidentModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdateStatus={handleUpdateIncidentStatus}
        onAddEvidenceImage={handleAddEvidenceImage}
      />

      {/* Manual Registration Modal for Console Operators */}
      {showNewIncidentModal && (
        <NewIncidentModal
          currentOperator={currentOperator}
          onClose={() => setShowNewIncidentModal(false)}
          onSubmit={handleCreateIncident}
        />
      )}

      {/* AI Document Upload Modal (Word .docx, PDF, Excel, Images with Gemini) */}
      {showAIUploadModal && (
        <AIUploadModal
          onClose={() => setShowAIUploadModal(false)}
          onImportIncidents={handleImportAIIncidents}
        />
      )}

      {/* Console Operator Profile Switcher */}
      {showOperatorModal && (
        <OperatorSwitchModal
          currentOperator={currentOperator}
          onSelectOperator={(op) => {
            setCurrentOperator(op);
            showToast(`Operador activo: ${op.name} (${op.shift})`);
          }}
          onClose={() => setShowOperatorModal(false)}
        />
      )}

      {/* Floating AI Chat Assistant Button */}
      <button
        onClick={() => setShowAIChatDrawer(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white p-3.5 sm:px-4 sm:py-3 rounded-2xl shadow-xl hover:shadow-2xl flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 border border-white/20 group ring-4 ring-red-500/20"
        title="Abrir Asistente IA Liderman (Guías y Consultas)"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-white animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-red-600"></span>
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-black leading-tight tracking-tight">Asistente IA Liderman</span>
          <span className="text-[10px] text-red-100 font-medium">Guías y Soporte de Matriz</span>
        </div>
      </button>

      {/* AI Chat Assistant Drawer */}
      <AIChatDrawer
        isOpen={showAIChatDrawer}
        onClose={() => setShowAIChatDrawer(false)}
        onNavigateToDrive={() => setActiveModule('DRIVE')}
        onNavigateToMatrix={() => setActiveModule('NOVEDADES')}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-red-600">LIDERMAN</span>
            <span>•</span>
            <span className="font-bold text-slate-700">PROYECTO TESALIA CBC</span>
            <span>•</span>
            <span className="text-slate-600">ADMINISTRADOR: <strong className="text-slate-900">JOSÉ MANUEL ARGUELLO COLOMA</strong></span>
          </div>

          <div className="text-[11px] text-slate-500">
            Sucursales: Ag. Gye Norte | Ag. Gye Sur | Tesalia Planta Gye | Planta Milagro | Ag. Manta | Planta Machala
          </div>
        </div>
      </footer>

    </div>
  );
}
