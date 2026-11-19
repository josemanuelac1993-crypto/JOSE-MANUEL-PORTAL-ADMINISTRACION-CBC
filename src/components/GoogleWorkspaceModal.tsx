import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  X, 
  HardDrive, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Download, 
  ExternalLink, 
  Clock, 
  ShieldCheck, 
  FolderCheck,
  PlusCircle,
  FileCheck
} from 'lucide-react';
import { Incident } from '../types';
import { googleSignIn, logoutGoogle, getAccessToken } from '../services/googleAuth';
import { 
  listDriveBackups, 
  saveIncidentsBackupToDrive, 
  downloadBackupFromDrive, 
  deleteDriveBackupFile, 
  DriveBackupFile,
  searchDriveSpreadsheets,
  downloadExcelFromDrive,
  DriveSearchFile
} from '../services/googleDriveService';
import { exportToGoogleSheet } from '../services/googleSheetsService';

interface GoogleWorkspaceModalProps {
  onClose: () => void;
  incidents: Incident[];
  currentUser: User | null;
  currentAccessToken: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onAuthLogout: () => void;
  onRestoreIncidents: (restoredIncidents: Incident[]) => void;
  onLoadExcelFromDrive?: (fileBuffer: ArrayBuffer, fileName: string) => void;
}

export const GoogleWorkspaceModal: React.FC<GoogleWorkspaceModalProps> = ({
  onClose,
  incidents,
  currentUser,
  currentAccessToken,
  onAuthSuccess,
  onAuthLogout,
  onRestoreIncidents,
  onLoadExcelFromDrive,
}) => {
  const [activeTab, setActiveTab] = useState<'BACKUPS' | 'SHEETS' | 'IMPORT_DRIVE'>('BACKUPS');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<DriveBackupFile[]>([]);
  const [driveSheets, setDriveSheets] = useState<DriveSearchFile[]>([]);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string | null>(null);

  // Confirmation dialog state for destructive operations (mandated by workspace skill)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'DELETE_BACKUP' | 'RESTORE_BACKUP';
    targetId?: string;
  } | null>(null);

  // Load backups when authenticated
  useEffect(() => {
    if (currentAccessToken) {
      loadBackupsList(currentAccessToken);
    }
  }, [currentAccessToken]);

  const loadBackupsList = async (token: string) => {
    try {
      setLoading(true);
      const list = await listDriveBackups(token);
      setBackups(list);
    } catch (err: any) {
      console.error('Error listing backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDriveSpreadsheetsList = async () => {
    if (!currentAccessToken) return;
    try {
      setLoading(true);
      const list = await searchDriveSpreadsheets(currentAccessToken);
      setDriveSheets(list);
    } catch (err: any) {
      console.error('Error searching sheets in drive:', err);
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setActionMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onAuthSuccess(result.user, result.accessToken);
        setActionMessage({
          type: 'success',
          text: `Conectado exitosamente con Google Workspace (${result.user.email}).`,
        });
        await loadBackupsList(result.accessToken);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setActionMessage({
        type: 'error',
        text: 'No se pudo completar la autenticación con Google. Verifique los permisos.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await logoutGoogle();
    onAuthLogout();
    setBackups([]);
    setDriveSheets([]);
    setActionMessage(null);
  };

  // Manual Backup to Google Drive
  const handleCreateBackup = async () => {
    if (!currentAccessToken) return;
    setLoading(true);
    setActionMessage(null);
    try {
      const backup = await saveIncidentsBackupToDrive(
        currentAccessToken,
        incidents,
        `Respaldo generado manualmente por el usuario desde la plataforma`
      );
      setActionMessage({
        type: 'success',
        text: `✓ Respaldo "${backup.name}" guardado exitosamente en Google Drive con ${incidents.length} novedades y evidencias fotográficas 100% integradas.`,
      });
      await loadBackupsList(currentAccessToken);
    } catch (err: any) {
      console.error('Backup error:', err);
      setActionMessage({
        type: 'error',
        text: 'Error al generar respaldo en Drive: ' + err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Export Matrix to Google Sheets
  const handleExportSheets = async () => {
    if (!currentAccessToken) return;
    setLoading(true);
    setActionMessage(null);
    try {
      const result = await exportToGoogleSheet(
        currentAccessToken,
        incidents,
        `Matriz Novedades Tesalia CBC - ${new Date().toLocaleDateString('es-EC').replace(/\//g, '-')}`
      );
      setCreatedSheetUrl(result.spreadsheetUrl);
      setActionMessage({
        type: 'success',
        text: `✓ Se exportaron ${result.rowsCount} novedades a una nueva hoja de cálculo en su Google Drive.`,
      });
    } catch (err: any) {
      console.error('Sheet export error:', err);
      setActionMessage({
        type: 'error',
        text: 'Error al exportar a Google Sheets: ' + err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Execute confirmed destructive operation
  const handleConfirmAction = async () => {
    if (!confirmDialog || !currentAccessToken) return;

    if (confirmDialog.actionType === 'DELETE_BACKUP' && confirmDialog.targetId) {
      try {
        setLoading(true);
        await deleteDriveBackupFile(currentAccessToken, confirmDialog.targetId);
        setActionMessage({
          type: 'success',
          text: '✓ Archivo de respaldo eliminado de Google Drive.',
        });
        await loadBackupsList(currentAccessToken);
      } catch (err: any) {
        setActionMessage({
          type: 'error',
          text: 'Error al eliminar el respaldo: ' + err.message,
        });
      } finally {
        setLoading(false);
      }
    } else if (confirmDialog.actionType === 'RESTORE_BACKUP' && confirmDialog.targetId) {
      try {
        setLoading(true);
        const restored = await downloadBackupFromDrive(currentAccessToken, confirmDialog.targetId);
        onRestoreIncidents(restored.incidents);
        setActionMessage({
          type: 'success',
          text: `✓ Se restauraron ${restored.incidents.length} novedades desde el respaldo de Google Drive con fecha ${new Date(restored.timestamp).toLocaleString('es-EC')}.`,
        });
      } catch (err: any) {
        setActionMessage({
          type: 'error',
          text: 'Error al restaurar el respaldo: ' + err.message,
        });
      } finally {
        setLoading(false);
      }
    }

    setConfirmDialog(null);
  };

  // Import file from Google Drive into batch modal
  const handlePickDriveFile = async (file: DriveSearchFile) => {
    if (!currentAccessToken || !onLoadExcelFromDrive) return;
    try {
      setLoading(true);
      const buffer = await downloadExcelFromDrive(currentAccessToken, file.id);
      onLoadExcelFromDrive(buffer, file.name);
      onClose();
    } catch (err: any) {
      console.error('Error importing file from drive:', err);
      setActionMessage({
        type: 'error',
        text: 'No se pudo descargar el archivo desde Google Drive: ' + err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-slate-900">
                  Integración con Google Drive & Google Sheets
                </h2>
                {currentUser && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    Conectado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Almacenamiento persistente, respaldos automáticos y sincronización en vivo con tu cuenta Google.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notifications */}
          {actionMessage && (
            <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in ${
              actionMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}>
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          )}

          {/* User Auth Box */}
          {!currentUser ? (
            <div className="border border-slate-200 rounded-3xl p-8 bg-gradient-to-b from-slate-50 to-white text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                <HardDrive className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Conecta tu cuenta de Google Workspace
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Permite crear respaldos de seguridad en tu Google Drive y exportar o leer matrices en Google Sheets con tu autorización.
                </p>
              </div>

              {/* Official Google Sign-In Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoggingIn}
                  className="inline-flex items-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-5 py-3 rounded-2xl border border-slate-300 shadow-sm transition-all hover:scale-102 active:scale-98 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isLoggingIn ? 'Iniciando sesión...' : 'Iniciar sesión con Google'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Account Card */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt={currentUser.displayName || 'Google'} 
                      className="w-10 h-10 rounded-full border border-slate-300"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                      {currentUser.displayName?.[0] || 'G'}
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      {currentUser.displayName || 'Usuario Google'}
                    </span>
                    <span className="text-[11px] text-slate-500 block">{currentUser.email}</span>
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Google Cloud Firestore Activo (Progreso guardado permanentemente)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Permisos de Drive & Sheets activos
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg font-bold transition-colors"
                  >
                    Desconectar
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setActiveTab('BACKUPS')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    activeTab === 'BACKUPS'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FolderCheck className="w-4 h-4" />
                  <span>Respaldos en Google Drive ({backups.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('SHEETS')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    activeTab === 'SHEETS'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Exportar a Google Sheets</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('IMPORT_DRIVE');
                    loadDriveSpreadsheetsList();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    activeTab === 'IMPORT_DRIVE'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Importar Archivo desde Drive</span>
                </button>
              </div>

              {/* Tab 1: Backups in Google Drive */}
              {activeTab === 'BACKUPS' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Historial de Respaldos en Google Drive
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Carpeta: "Tesalia CBC - Respaldos Liderman". Cada respaldo preserva la totalidad de novedades registradas.
                      </p>
                    </div>

                    <button
                      onClick={handleCreateBackup}
                      disabled={loading}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all hover:scale-102 disabled:opacity-50"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{loading ? 'Generando...' : 'Crear Respaldo Ahora en Drive'}</span>
                    </button>
                  </div>

                  {/* List of Backups */}
                  {backups.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <FolderCheck className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">No hay respaldos guardados en Drive todavía</p>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                        Haz clic en "Crear Respaldo Ahora en Drive" para generar una copia de seguridad protegida en tu nube.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                      {backups.map(b => (
                        <div key={b.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-900 block">{b.name}</span>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {new Date(b.createdTime).toLocaleString('es-EC')}
                              </span>
                              {b.description && (
                                <span>• {b.description}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Restore Button */}
                            <button
                              onClick={() => setConfirmDialog({
                                isOpen: true,
                                title: '¿Restaurar este respaldo desde Google Drive?',
                                description: `Esta acción cargará las novedades contenidas en "${b.name}" a la plataforma. Los datos actuales se actualizarán con este respaldo.`,
                                actionType: 'RESTORE_BACKUP',
                                targetId: b.id,
                              })}
                              className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                              title="Restaurar a la plataforma"
                            >
                              <RefreshCw className="w-3 h-3 text-emerald-600" />
                              <span>Restaurar</span>
                            </button>

                            {/* Delete Button (with mandatory user confirmation) */}
                            <button
                              onClick={() => setConfirmDialog({
                                isOpen: true,
                                title: '¿Eliminar este respaldo de Google Drive?',
                                description: `El archivo "${b.name}" será eliminado permanentemente de tu carpeta de Google Drive. Esta acción no se puede deshacer.`,
                                actionType: 'DELETE_BACKUP',
                                targetId: b.id,
                              })}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                              title="Eliminar de Google Drive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Export to Google Sheets */}
              {activeTab === 'SHEETS' && (
                <div className="p-6 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-4">
                  <div>
                    <h4 className="text-sm font-black text-emerald-950">
                      Exportar Matriz Consolidada a Google Sheets
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1">
                      Crea una hoja de cálculo en tu Google Drive con las {incidents.length} novedades actuales organizadas con columnas oficiales, sucursales y códigos.
                    </p>
                  </div>

                  <button
                    onClick={handleExportSheets}
                    disabled={loading}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all hover:scale-102 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{loading ? 'Creando Hoja en Google Drive...' : 'Crear y Abrir en Google Sheets'}</span>
                  </button>

                  {createdSheetUrl && (
                    <div className="pt-2">
                      <a
                        href={createdSheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-300 px-4 py-2 rounded-xl shadow-2xs hover:bg-emerald-50 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-emerald-600" />
                        <span>Abrir Hoja de Cálculo Creada en Google Drive</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Import from Google Drive */}
              {activeTab === 'IMPORT_DRIVE' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Hojas de Cálculo y Archivos Excel en tu Google Drive
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Selecciona cualquier archivo para abrirlo directamente en el Procesador Batch de Excel.
                      </p>
                    </div>

                    <button
                      onClick={loadDriveSpreadsheetsList}
                      disabled={loading}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                      title="Refrescar lista"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {driveSheets.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">No se encontraron archivos de Excel o Google Sheets</p>
                      <p className="text-[11px] text-slate-500">
                        Asegúrate de tener archivos .xlsx o Google Sheets guardados en tu cuenta.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
                      {driveSheets.map(s => (
                        <div key={s.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{s.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Modificado: {new Date(s.modifiedTime).toLocaleDateString('es-EC')}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handlePickDriveFile(s)}
                            disabled={loading}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                          >
                            Cargar en Batch
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive Operations (Mandatory Requirement) */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-black text-slate-900">{confirmDialog.title}</h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmDialog.description}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-xs font-black text-white rounded-xl shadow-xs transition-all ${
                  confirmDialog.actionType === 'DELETE_BACKUP' 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmDialog.actionType === 'DELETE_BACKUP' ? 'Sí, eliminar archivo' : 'Sí, restaurar datos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
