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
import { ExecutiveReportModal } from './components/ExecutiveReportModal';
import { ExcelBatchModal } from './components/ExcelBatchModal';
import { GoogleWorkspaceModal } from './components/GoogleWorkspaceModal';
import { EcuadorCornerFlag } from './components/EcuadorCornerFlag';
import { User } from 'firebase/auth';
import { auth, initAuth, googleSignIn, logoutGoogle, getStoredToken } from './services/googleAuth';
import { saveIncidentsBackupToDrive } from './services/googleDriveService';
import { 
  validateFirestoreConnection,
  fetchIncidentsFromFirestore,
  saveIncidentToFirestore,
  saveBatchIncidentsToFirestore,
  deleteIncidentFromFirestore,
  subscribeToIncidents,
  fetchFoldersFromFirestore,
  saveFoldersToFirestore,
  fetchDocumentsFromFirestore,
  saveDocumentToFirestore
} from './services/firestoreService';
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
  // Clear all previous caches to guarantee 100% clean startup
  useEffect(() => {
    try {
      localStorage.removeItem('liderman_incidents_cache');
      localStorage.removeItem('liderman_incidents_cache_v2');
      localStorage.removeItem('liderman_incidents_clean_v3');
    } catch {}
  }, []);

  // Initialize clean incidents array (0 records)
  const [incidents, setIncidents] = useState<Incident[]>(() => []);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active User / Operator
  const [currentOperator, setCurrentOperator] = useState<Operator>(OPERATOR_PROFILES[0]); // José Manuel Arguello Coloma

  // Top Module Switcher: Novedades & Matriz vs Repositorio Digital Tipo Drive
  const [activeModule, setActiveModule] = useState<'NOVEDADES' | 'DRIVE'>('NOVEDADES');

  // Navigation & Filter States for Novedades
  const [activeMainSection, setActiveMainSection] = useState<MainSection>(() => {
    return (localStorage.getItem('liderman_active_section') as MainSection) || 'SEGURIDAD_FISICA';
  });
  const [activeViewMode, setActiveViewMode] = useState<'MATRIZ' | 'LISTADO'>(() => {
    return (localStorage.getItem('liderman_active_view') as 'MATRIZ' | 'LISTADO') || 'MATRIZ';
  });
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    return localStorage.getItem('liderman_selected_branch') || 'TODAS';
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return localStorage.getItem('liderman_selected_month') || 'TODOS';
  });

  // Sync filters & view mode to localStorage
  useEffect(() => {
    localStorage.setItem('liderman_selected_branch', selectedBranch);
  }, [selectedBranch]);

  useEffect(() => {
    localStorage.setItem('liderman_selected_month', selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    localStorage.setItem('liderman_active_section', activeMainSection);
  }, [activeMainSection]);

  useEffect(() => {
    localStorage.setItem('liderman_active_view', activeViewMode);
  }, [activeViewMode]);

  // Sync incidents to localStorage whenever updated (without wiping on 0)
  useEffect(() => {
    if (incidents.length > 0) {
      try {
        localStorage.setItem('liderman_incidents_cache_v2', JSON.stringify(incidents));
      } catch { }
    }
  }, [incidents]);

  // Drive Repository Data
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);

  // Modals & Integrations
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);
  const [showAIUploadModal, setShowAIUploadModal] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [showAIChatDrawer, setShowAIChatDrawer] = useState(false);
  const [showExecutiveReportModal, setShowExecutiveReportModal] = useState(false);
  const [showExcelBatchModal, setShowExcelBatchModal] = useState(false);
  const [showGoogleWorkspaceModal, setShowGoogleWorkspaceModal] = useState(false);

  // Google Workspace Auth State - hydrated immediately to prevent loss on page refresh
  const [googleUser, setGoogleUser] = useState<User | null>(() => auth.currentUser);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => getStoredToken());

  // Validate Firestore connection on boot
  useEffect(() => {
    validateFirestoreConnection().catch(console.warn);
  }, []);

  // Fetch initial incidents from Google Cloud Firestore & Backend
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch from Firestore (Direct Cloud Persistence)
      let cloudIncidents: Incident[] = [];
      try {
        cloudIncidents = await fetchIncidentsFromFirestore();
      } catch (fsErr) {
        console.warn('[Firestore] Error al cargar desde Firestore:', fsErr);
      }

      // 2. Fetch from Backend
      let serverIncidents: Incident[] = [];
      try {
        const res = await fetch('/api/incidents');
        const data = await res.json();
        if (data.success && Array.isArray(data.incidents)) {
          serverIncidents = data.incidents;
        }
      } catch (srvErr) {
        console.warn('[Backend] Error al cargar desde API:', srvErr);
      }

      // Choose most complete dataset
      const masterList = cloudIncidents.length >= serverIncidents.length ? cloudIncidents : serverIncidents;

      if (masterList.length > 0) {
        setIncidents(masterList);
        try {
          localStorage.setItem('liderman_incidents_cache_v2', JSON.stringify(masterList));
        } catch { }

        // Sync missing side
        if (cloudIncidents.length > 0 && serverIncidents.length === 0) {
          fetch('/api/incidents/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cloudIncidents })
          }).catch(() => {});
        } else if (serverIncidents.length > 0 && cloudIncidents.length === 0) {
          saveBatchIncidentsToFirestore(serverIncidents, googleUser).catch(() => {});
        }
      } else {
        // Start completely clean with 0 incidents as requested
        setIncidents([]);
      }
    } catch (err: any) {
      console.error('Error fetching incidents:', err);
      setErrorMessage('No se pudieron sincronizar los datos de la nube. Verifique su conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription to Firestore changes
  useEffect(() => {
    const unsubscribe = subscribeToIncidents(
      (cloudList) => {
        if (Array.isArray(cloudList) && cloudList.length > 0) {
          setIncidents(cloudList);
          try {
            localStorage.setItem('liderman_incidents_cache_v2', JSON.stringify(cloudList));
          } catch { }
        }
      },
      (err) => console.warn('[Realtime Firestore] Info en sincronización:', err)
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Initialize Firebase Auth listener once on mount without repetitive toasts
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setGoogleUser(user);
        setGoogleAccessToken(token);
        // Visual indicator handled via blinking status light beside session button
      },
      () => {
        setGoogleUser(null);
        setGoogleAccessToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Fetch repository folders and documents
  const fetchDocuments = async () => {
    try {
      // 1. Fetch from Firestore
      const cloudFolders = await fetchFoldersFromFirestore();
      const cloudDocs = await fetchDocumentsFromFirestore();

      if (cloudFolders.length > 0) setFolders(cloudFolders);
      if (cloudDocs.length > 0) setDocuments(cloudDocs);

      // 2. Fetch from backend as fallback / mirror
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        if (cloudFolders.length === 0 && data.folders?.length > 0) {
          setFolders(data.folders);
          saveFoldersToFirestore(data.folders).catch(() => {});
        }
        if (cloudDocs.length === 0 && data.documents?.length > 0) {
          setDocuments(data.documents);
        }
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

  // Delete incident from server, Firestore, and local state
  const handleDeleteIncident = async (id: string) => {
    try {
      // 1. Delete in Firestore cloud
      deleteIncidentFromFirestore(id, googleUser).catch(console.warn);

      // 2. Delete on backend
      const res = await fetch(`/api/incidents/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setIncidents(prev => {
          const updated = prev.filter(i => i.id !== id);
          try {
            localStorage.setItem('liderman_incidents_cache_v2', JSON.stringify(updated));
          } catch { }
          return updated;
        });
        if (selectedIncident?.id === id) {
          setSelectedIncident(null);
        }
        showToast(`✓ Registro #${id} eliminado correctamente de la nube.`);
      } else {
        alert(data.error || 'No se pudo eliminar el registro.');
      }
    } catch (err) {
      console.error('Error deleting incident:', err);
      alert('Error de conexión al eliminar el registro.');
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
        const fullIncident = data.incident;

        // Save to Firestore cloud
        saveIncidentToFirestore(fullIncident, googleUser).catch(console.warn);

        setIncidents(prev => {
          const updated = [fullIncident, ...prev];
          try {
            localStorage.setItem('liderman_incidents_cache_v2', JSON.stringify(updated));
          } catch { }
          return updated;
        });
        setShowNewIncidentModal(false);
        showToast(`✓ Novedad ${fullIncident.id} registrada y respaldada en Google Cloud.`);
        setSelectedIncident(fullIncident);
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

    const updatedIncident: Incident = {
      ...target,
      status: newStatus,
      followUps
    };

    // Save to Firestore cloud
    saveIncidentToFirestore(updatedIncident, googleUser).catch(console.warn);

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
      const finalItem = (data.success && data.incident) ? data.incident : updatedIncident;
      setIncidents(prev => {
        const list = prev.map(item => item.id === id ? finalItem : item);
        try {
          localStorage.setItem('liderman_incidents_cache_v2', JSON.stringify(list));
        } catch { }
        return list;
      });
      setSelectedIncident(finalItem);
      showToast(`✓ Estado actualizado a "${newStatus.replace('_', ' ')}" y sincronizado en la nube.`);
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
        // Save to Firestore cloud
        saveIncidentToFirestore(data.incident, googleUser).catch(console.warn);

        setIncidents(prev => {
          const list = prev.map(item => item.id === id ? data.incident : item);
          try {
            localStorage.setItem('liderman_incidents_cache_v2', JSON.stringify(list));
          } catch { }
          return list;
        });
        setSelectedIncident(data.incident);
        showToast('✓ Captura de foto adjuntada y respaldada en la nube.');
      }
    } catch (err) {
      console.error('Error attaching image:', err);
    }
  };

  // Import batch incidents analyzed by AI
  const handleImportAIIncidents = async (importedItems: any[]) => {
    try {
      // Save directly to Firestore cloud
      saveBatchIncidentsToFirestore(importedItems, googleUser).catch(console.warn);

      const res = await fetch('/api/incidents/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: importedItems })
      });
      const data = await res.json();
      if (data.success) {
        await fetchIncidents();
        setShowAIUploadModal(false);
        showToast(`✨ Se importaron ${importedItems.length} novedades y se respaldaron en Google Cloud.`);
      }
    } catch (err) {
      console.error('Error importing AI batch:', err);
    }
  };

  // Import batch incidents from Excel Batch Importer
  const handleImportBatch = async (items: any[], keepExisting: boolean) => {
    try {
      // 1. Immediately persist to Google Cloud Firestore
      try {
        await saveBatchIncidentsToFirestore(items, googleUser);
        console.log('[Firestore] Lote de novedades guardado con éxito en Firestore.');
      } catch (fsErr) {
        console.warn('[Firestore] Error guardando en Firestore:', fsErr);
      }

      // 2. Also send to backend
      const res = await fetch('/api/incidents/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, keepExisting })
      });
      const data = await res.json();
      const updatedList = (data.success && Array.isArray(data.incidents)) 
        ? data.incidents 
        : (keepExisting ? [...items, ...incidents] : items);

      setIncidents(updatedList);
      try {
        localStorage.setItem('liderman_incidents_cache_v2', JSON.stringify(updatedList));
      } catch { }

      showToast(`✓ Se importaron ${items.length} novedades (${keepExisting ? 'Historial conservado' : 'Reemplazo'}) y se respaldaron en Google Cloud.`);
    } catch (err: any) {
      console.error('Error importing batch:', err);
      alert('Error de conexión al procesar el lote.');
    }
  };

  // Restore incidents from Google Drive or local snapshot
  const handleRestoreIncidents = async (restored: Incident[]) => {
    try {
      const res = await fetch('/api/incidents/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidents: restored })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.incidents)) {
        setIncidents(data.incidents);
        try {
          localStorage.setItem('liderman_incidents_cache_v2', JSON.stringify(data.incidents));
        } catch { }
        showToast(`✓ Se restauraron ${data.incidents.length} novedades desde el respaldo.`);
      }
    } catch (err) {
      console.error('Error restoring incidents:', err);
    }
  };

  // Automatic backup to Google Drive if connected
  const handleBackupToDrive = async () => {
    if (!googleAccessToken) return;
    try {
      await saveIncidentsBackupToDrive(
        googleAccessToken,
        incidents,
        'Respaldo de seguridad previo a actualización batch de novedades'
      );
      showToast('✓ Respaldo de seguridad creado en tu Google Drive');
    } catch (err) {
      console.error('Error backing up to drive:', err);
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
    <div className="min-h-screen bg-transparent text-slate-900 flex flex-col font-sans relative selection:bg-sky-500 selection:text-white">
      
      {/* Detalle patriótico: Bandera de Ecuador en la esquina diagonal */}
      <EcuadorCornerFlag />
      
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
        googleUser={googleUser}
        onOpenOperatorModal={() => setShowOperatorModal(true)}
        onOpenNewIncident={() => setShowNewIncidentModal(true)}
        onOpenAIUpload={() => setShowAIUploadModal(true)}
        onOpenExcelBatch={() => setShowExcelBatchModal(true)}
        onOpenGoogleWorkspace={() => setShowGoogleWorkspaceModal(true)}
        isGoogleConnected={Boolean(googleUser && googleAccessToken)}
        onExportData={handleExportExcel}
        onOpenExecutiveReport={() => setShowExecutiveReportModal(true)}
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
                    <span>Subir Documento con IA</span>
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
                    onChangeMainSection={setActiveMainSection}
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
                    onChangeMainSection={setActiveMainSection}
                    onDeleteIncident={handleDeleteIncident}
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
              // Immediately switch to the novelty's section and branch
              setActiveModule('NOVEDADES');
              setActiveMainSection(newIncident.mainSection);
              setSelectedBranch('TODAS');
              if (newIncident.month) setSelectedMonth(newIncident.month);
              setSelectedIncident(newIncident);
              showToast(`✓ Novedad creada y vinculada a ${newIncident.mainSection === 'SEGURIDAD_FISICA' ? 'Seguridad Física' : 'SSOMA'} (${newIncident.item})`);
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
        onDeleteIncident={handleDeleteIncident}
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

      {/* Clean Executive Report for Word and PDF */}
      <ExecutiveReportModal
        isOpen={showExecutiveReportModal}
        onClose={() => setShowExecutiveReportModal(false)}
        incidents={incidents}
        selectedBranch={selectedBranch}
        selectedMonth={selectedMonth}
        activeMainSection={activeMainSection}
      />

      {/* Excel Batch Multi-Incident & Image Assignment Modal */}
      {showExcelBatchModal && (
        <ExcelBatchModal
          onClose={() => setShowExcelBatchModal(false)}
          onImportBatch={handleImportBatch}
          onBackupToDrive={handleBackupToDrive}
          hasDriveAccess={Boolean(googleUser && googleAccessToken)}
        />
      )}

      {/* Google Workspace (Drive & Sheets) Modal */}
      {showGoogleWorkspaceModal && (
        <GoogleWorkspaceModal
          onClose={() => setShowGoogleWorkspaceModal(false)}
          incidents={incidents}
          currentUser={googleUser}
          currentAccessToken={googleAccessToken}
          onAuthSuccess={(u, token) => {
            setGoogleUser(u);
            setGoogleAccessToken(token);
          }}
          onAuthLogout={() => {
            setGoogleUser(null);
            setGoogleAccessToken(null);
          }}
          onRestoreIncidents={handleRestoreIncidents}
          onLoadExcelFromDrive={() => {
            setShowExcelBatchModal(true);
          }}
        />
      )}

      {/* Unified AI Assistant Floating Button */}
      <button
        onClick={() => setShowAIChatDrawer(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white p-3.5 sm:px-4 sm:py-3 rounded-2xl shadow-xl hover:shadow-2xl flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 border border-white/20 group ring-4 ring-red-500/20"
        title="Abrir Asistente Virtual IA (Control y Modificación en Tiempo Real)"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-white animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-red-600"></span>
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-black leading-tight tracking-tight">Asistente Virtual IA</span>
          <span className="text-[10px] text-amber-200 font-bold">⚡ Control en Tiempo Real</span>
        </div>
      </button>

      {/* AI Chat Assistant Drawer */}
      <AIChatDrawer
        isOpen={showAIChatDrawer}
        onClose={() => setShowAIChatDrawer(false)}
        onNavigateToDrive={() => setActiveModule('DRIVE')}
        onNavigateToMatrix={() => setActiveModule('NOVEDADES')}
        onPlatformModified={(data) => {
          if (data.updatedIncidents) {
            setIncidents(data.updatedIncidents);
          }
          if (data.updatedDocuments) {
            setDocuments(data.updatedDocuments);
          }
          if (data.executedActions && data.executedActions.length > 0) {
            data.executedActions.forEach((act: any) => {
              if (act.type === 'NAVIGATE_UI' && act.payload) {
                if (act.payload.activeModule) setActiveModule(act.payload.activeModule);
                if (act.payload.activeMainSection) setActiveMainSection(act.payload.activeMainSection);
                if (act.payload.activeViewMode) setActiveViewMode(act.payload.activeViewMode);
                if (act.payload.selectedBranch) setSelectedBranch(act.payload.selectedBranch);
                if (act.payload.selectedMonth) setSelectedMonth(act.payload.selectedMonth);
                if (act.payload.openIncidentId && data.updatedIncidents) {
                  const match = data.updatedIncidents.find((i: any) => i.id === act.payload.openIncidentId);
                  if (match) setSelectedIncident(match);
                }
              }
              if (act.type === 'CREATE_INCIDENT' && act.incident) {
                setActiveModule('NOVEDADES');
                setActiveMainSection(act.incident.mainSection);
                setSelectedBranch('TODAS');
                if (act.incident.month) setSelectedMonth(act.incident.month);
                setSelectedIncident(act.incident);
              }
            });
            showToast('⚡ Modificación realizada en tiempo real por el Asistente');
          }
        }}
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
