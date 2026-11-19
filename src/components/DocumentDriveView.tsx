import React, { useState } from 'react';
import { 
  DocumentFolder, 
  StoredDocument, 
  BRANCHES, 
  Branch, 
  Operator,
  Incident
} from '../types';
import { 
  Folder, 
  Upload, 
  FolderPlus, 
  Search, 
  LayoutGrid, 
  List, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  FileCode, 
  Download, 
  Trash2, 
  Eye, 
  X, 
  ChevronRight, 
  Calendar, 
  HardDrive, 
  Sparkles,
  CheckCircle2,
  TrendingUp,
  GraduationCap,
  BookOpen,
  MapPin,
  Loader2,
  FileCheck,
  FileQuestion,
  Wand2
} from 'lucide-react';
import { DocumentAssignModal } from './DocumentAssignModal';

interface DocumentDriveViewProps {
  folders: DocumentFolder[];
  documents: StoredDocument[];
  currentOperator: Operator;
  selectedBranch: string;
  onRefresh: () => void;
  showToast: (msg: string) => void;
  onIncidentCreated?: (incident: Incident, doc: StoredDocument) => void;
}

export const DocumentDriveView: React.FC<DocumentDriveViewProps> = ({
  folders,
  documents,
  currentOperator,
  selectedBranch,
  onRefresh,
  showToast,
  onIncidentCreated
}) => {
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>(selectedBranch !== 'TODAS' ? selectedBranch : 'TODAS');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<StoredDocument | null>(null);
  const [assigningDoc, setAssigningDoc] = useState<StoredDocument | null>(null);
  
  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>(folders[0]?.id || 'folder-informes');
  const [docDescription, setDocDescription] = useState('');
  const [docBranch, setDocBranch] = useState<string>('TODAS');
  const [uploading, setUploading] = useState(false);

  // New Folder State
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('blue');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Active folder object
  const activeFolder = folders.find(f => f.id === activeFolderId);

  // Filtered documents
  const filteredDocs = documents.filter(doc => {
    if (activeFolderId && doc.folderId !== activeFolderId) return false;
    if (filterBranch !== 'TODAS' && doc.branch && doc.branch !== 'TODAS' && doc.branch !== filterBranch) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = doc.name.toLowerCase().includes(q);
      const matchDesc = (doc.description || '').toLowerCase().includes(q);
      const matchFolder = (doc.folderName || '').toLowerCase().includes(q);
      const matchUploader = (doc.uploadedBy?.name || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchFolder && !matchUploader) return false;
    }
    return true;
  });

  // Calculate file counts per folder
  const getFolderFileCount = (folderId: string) => {
    return documents.filter(d => d.folderId === folderId).length;
  };

  const getFolderTotalSize = (folderId: string) => {
    const bytes = documents.filter(d => d.folderId === folderId).reduce((acc, curr) => acc + (curr.size || 0), 0);
    return formatFileSize(bytes);
  };

  function formatFileSize(bytes: number) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Handle Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileData = reader.result as string;
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: uploadFile.name,
            fileData,
            mimeType: uploadFile.type,
            folderId: targetFolderId,
            branch: docBranch,
            description: docDescription,
            uploaderName: currentOperator.name,
            uploaderRole: currentOperator.role
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`✓ Archivo "${uploadFile.name}" guardado exitosamente`);
          setShowUploadModal(false);
          setUploadFile(null);
          setDocDescription('');
          onRefresh();
        } else {
          alert(data.error || 'Error al subir el archivo');
        }
        setUploading(false);
      };
      reader.readAsDataURL(uploadFile);
    } catch (err: any) {
      console.error('Error uploading:', err);
      alert('Error al subir el archivo');
      setUploading(false);
    }
  };

  // Handle New Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          color: newFolderColor,
          description: newFolderDescription.trim(),
          icon: 'Folder'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Carpeta "${newFolderName}" creada con éxito`);
        setShowNewFolderModal(false);
        setNewFolderName('');
        setNewFolderDescription('');
        onRefresh();
      }
    } catch (err) {
      console.error('Error creating folder:', err);
    } finally {
      setCreatingFolder(false);
    }
  };

  // Handle Delete Document
  const handleDeleteDoc = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el archivo "${name}" del repositorio?`)) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('✓ Archivo eliminado del repositorio');
        onRefresh();
      }
    } catch (err) {
      console.error('Error deleting doc:', err);
    }
  };

  // Icon Helper per file type
  const getFileIcon = (ext: string, mime: string) => {
    const cleanExt = (ext || '').replace('.', '').toLowerCase();
    if (['pdf'].includes(cleanExt) || mime.includes('pdf')) {
      return (
        <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
          <FileText className="w-5 h-5" />
        </div>
      );
    }
    if (['docx', 'doc'].includes(cleanExt) || mime.includes('word')) {
      return (
        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
          <FileText className="w-5 h-5" />
        </div>
      );
    }
    if (['xlsx', 'xls', 'csv'].includes(cleanExt) || mime.includes('spreadsheet') || mime.includes('excel')) {
      return (
        <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
      );
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(cleanExt) || mime.startsWith('image/')) {
      return (
        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl">
          <ImageIcon className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
        <FileCode className="w-5 h-5" />
      </div>
    );
  };

  // Folder style helper
  const getFolderTheme = (color: string) => {
    switch (color) {
      case 'amber':
        return {
          bg: 'bg-amber-50/70 border-amber-200 hover:border-amber-400 text-amber-900',
          iconBg: 'bg-amber-100 text-amber-700',
          badge: 'bg-amber-100 text-amber-800'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50/70 border-blue-200 hover:border-blue-400 text-blue-900',
          iconBg: 'bg-blue-100 text-blue-700',
          badge: 'bg-blue-100 text-blue-800'
        };
      case 'emerald':
        return {
          bg: 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400 text-emerald-900',
          iconBg: 'bg-emerald-100 text-emerald-700',
          badge: 'bg-emerald-100 text-emerald-800'
        };
      case 'purple':
        return {
          bg: 'bg-purple-50/70 border-purple-200 hover:border-purple-400 text-purple-900',
          iconBg: 'bg-purple-100 text-purple-700',
          badge: 'bg-purple-100 text-purple-800'
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-200 hover:border-slate-400 text-slate-900',
          iconBg: 'bg-slate-100 text-slate-700',
          badge: 'bg-slate-100 text-slate-800'
        };
    }
  };

  const getFolderIcon = (iconName: string) => {
    switch (iconName) {
      case 'TrendingUp': return <TrendingUp className="w-5 h-5" />;
      case 'GraduationCap': return <GraduationCap className="w-5 h-5" />;
      case 'FileText': return <FileText className="w-5 h-5" />;
      case 'BookOpen': return <BookOpen className="w-5 h-5" />;
      default: return <Folder className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner / Breadcrumb & Controls */}
      <div className="bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Breadcrumbs Navigation */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <button
              onClick={() => setActiveFolderId(null)}
              className={`flex items-center gap-1.5 font-bold transition-colors ${
                !activeFolderId ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <HardDrive className="w-4 h-4 text-teal-600" />
              <span>Mi Repositorio Digital</span>
            </button>

            {activeFolder && (
              <>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="font-black text-slate-900 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                  <Folder className="w-3.5 h-3.5 text-teal-600" />
                  {activeFolder.name}
                </span>
              </>
            )}

            <span className="text-xs text-slate-400 font-mono">
              ({filteredDocs.length} archivo{filteredDocs.length !== 1 ? 's' : ''})
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setTargetFolderId(activeFolderId || folders[0]?.id || 'folder-informes');
                setShowUploadModal(true);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Upload className="w-4 h-4 text-teal-400" />
              <span>Subir Archivo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNewFolderModal(true)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-teal-600" />
              <span>Nueva Carpeta</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'GRID' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'TABLE' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Vista Lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Search & Filter Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en todos los archivos..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Filter by Branch */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-slate-500 font-medium">Sucursal:</span>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500 font-semibold"
            >
              <option value="TODAS">Todas las Sucursales</option>
              {BRANCHES.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* CARPETAS PRINCIPALES (TIPO DRIVE) */}
      {!activeFolderId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Folder className="w-4 h-4 text-teal-600" />
              Carpetas del Repositorio
            </h3>
            <span className="text-xs text-slate-500">
              Haz clic en cualquier carpeta para ver sus documentos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {folders.map(folder => {
              const theme = getFolderTheme(folder.color);
              const count = getFolderFileCount(folder.id);
              const size = getFolderTotalSize(folder.id);

              return (
                <div
                  key={folder.id}
                  onClick={() => setActiveFolderId(folder.id)}
                  className={`border rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md group flex flex-col justify-between ${theme.bg}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`p-3 rounded-xl shadow-2xs group-hover:scale-105 transition-transform ${theme.iconBg}`}>
                      {getFolderIcon(folder.icon)}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.badge}`}>
                      {count} {count === 1 ? 'archivo' : 'archivos'}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-black text-sm text-slate-900 group-hover:text-teal-700 transition-colors">
                      {folder.name}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {folder.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Tamaño: {size}</span>
                    <span className="text-teal-600 font-bold group-hover:underline">Abrir →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ARCHIVOS DENTRO DEL REPOSITORIO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
              {activeFolder ? `Archivos en "${activeFolder.name}"` : 'Todos los Documentos Subidos'}
            </h3>
            {activeFolderId && (
              <button
                onClick={() => setActiveFolderId(null)}
                className="text-xs text-teal-700 font-bold hover:underline"
              >
                ← Volver a ver todas las carpetas
              </button>
            )}
          </div>
          <span className="text-xs text-slate-500">
            {filteredDocs.length} archivo{filteredDocs.length !== 1 ? 's' : ''} disponible{filteredDocs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Empty State */}
        {filteredDocs.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Folder className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="font-bold text-base text-slate-800">
                {activeFolder ? `No hay archivos en "${activeFolder.name}" aún` : 'No se han subido archivos a esta sección'}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sube informes semanales, listas de asistencia de capacitaciones, planes de acción o procedimientos en Word, PDF, Excel o Fotos.
              </p>
            </div>
            <button
              onClick={() => {
                setTargetFolderId(activeFolderId || folders[0]?.id || 'folder-informes');
                setShowUploadModal(true);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-xs inline-flex items-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4 text-teal-400" />
              <span>Subir el primer archivo</span>
            </button>
          </div>
        ) : viewMode === 'GRID' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDocs.map(doc => (
              <div
                key={doc.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    {getFileIcon(doc.fileExtension, doc.mimeType)}
                    
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase font-bold">
                      {doc.fileExtension.replace('.', '') || 'DOC'}
                    </span>
                  </div>

                  <div className="mt-3">
                    <h4 
                      onClick={() => setPreviewDoc(doc)}
                      className="font-bold text-xs text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2 cursor-pointer leading-snug"
                      title={doc.name}
                    >
                      {doc.name}
                    </h4>

                    {doc.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Folder className="w-3 h-3 text-slate-400" />
                      {doc.folderName}
                    </span>
                    <span>{formatFileSize(doc.size)}</span>
                  </div>

                  {doc.branch && doc.branch !== 'TODAS' && (
                    <div className="text-[10px] text-red-700 font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-red-500" />
                      <span>{doc.branch}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">
                      {new Date(doc.uploadedAt).toLocaleDateString('es-EC')}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Ver detalle / Previsualizar"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Descargar archivo"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id, doc.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar del repositorio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Assign / Analyze Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setAssigningDoc(doc)}
                      className={`w-full py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs ${
                        doc.assignedIncidentId
                          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600'
                      }`}
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>{doc.assignedIncidentId ? `✓ Novedad ${doc.assignedIncidentId}` : 'Asignar / Analizar Novedad'}</span>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          /* TABLE LIST VIEW */
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Nombre del Documento</th>
                    <th className="py-3 px-4">Carpeta</th>
                    <th className="py-3 px-4">Sucursal</th>
                    <th className="py-3 px-4">Tamaño</th>
                    <th className="py-3 px-4">Subido por</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocs.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.fileExtension, doc.mimeType)}
                          <div>
                            <span 
                              onClick={() => setPreviewDoc(doc)}
                              className="font-bold text-slate-900 hover:text-teal-700 cursor-pointer block"
                            >
                              {doc.name}
                            </span>
                            {doc.description && (
                              <span className="text-[11px] text-slate-500 line-clamp-1">
                                {doc.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium text-[11px]">
                          <Folder className="w-3 h-3 text-slate-400" />
                          {doc.folderName}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-700 font-medium">
                          {doc.branch || 'TODAS'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {formatFileSize(doc.size)}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {doc.uploadedBy?.name || 'Administrador'}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(doc.uploadedAt).toLocaleDateString('es-EC')}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAssigningDoc(doc)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                              doc.assignedIncidentId
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600'
                            }`}
                            title="Asignar o clasificar como Novedad en la Matriz"
                          >
                            <Wand2 className="w-3 h-3" />
                            <span>{doc.assignedIncidentId ? 'Asignado' : 'Asignar a Matriz'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <a
                            href={`/api/documents/${doc.id}/download`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Descargar"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(doc.id, doc.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: SUBIR ARCHIVO */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-100 text-teal-800 rounded-xl">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Subir Archivo al Repositorio
                  </h3>
                  <p className="text-xs text-slate-500">
                    Soporta Word (.docx), PDF, Excel (.xlsx), Fotos, Presentaciones y Videos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-xs">
              
              {/* File Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-teal-600 rounded-2xl p-6 text-center bg-slate-50 hover:bg-teal-50/20 transition-all">
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileCheck className="w-6 h-6 text-teal-600 shrink-0" />
                    <div className="text-left">
                      <span className="font-bold text-slate-900 block truncate max-w-xs">{uploadFile.name}</span>
                      <span className="text-[11px] text-slate-500">{formatFileSize(uploadFile.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadFile(null)}
                      className="text-xs text-rose-600 font-bold ml-2 hover:underline"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center gap-2">
                    <Upload className="w-8 h-8 text-teal-600" />
                    <span className="font-bold text-slate-800 text-sm">
                      Haz clic para seleccionar el archivo de tu equipo
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Cualquier formato: Word, PDF, Excel, Imagen, etc.
                    </span>
                    <input
                      type="file"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setUploadFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Target Folder Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Carpeta de Destino:
                </label>
                <select
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-teal-500"
                >
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Sucursal Relacionada (Opcional):
                </label>
                <select
                  value={docBranch}
                  onChange={(e) => setDocBranch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-teal-500"
                >
                  <option value="TODAS">Aplica a Todas las Sucursales</option>
                  {BRANCHES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Descripción o Notas (Opcional):
                </label>
                <textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Ej: Registro de inducción de personal de seguridad para el turno noche..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-500 placeholder-slate-400"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                      <span>Subiendo archivo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-teal-400" />
                      <span>Guardar en Repositorio</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREAR CARPETA PERSONALIZADA */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Crear Nueva Carpeta
                  </h3>
                  <p className="text-xs text-slate-500">
                    Organiza tus archivos por área, sucursal o proyecto
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nombre de la Carpeta:
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ej: Auditorías Machala, Actas de Entrega, etc."
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Color Distintivo:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'blue', label: 'Azul', bg: 'bg-blue-500' },
                    { id: 'amber', label: 'Ámbar', bg: 'bg-amber-500' },
                    { id: 'emerald', label: 'Verde', bg: 'bg-emerald-500' },
                    { id: 'purple', label: 'Púrpura', bg: 'bg-purple-500' }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewFolderColor(c.id)}
                      className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                        newFolderColor === c.id ? 'border-slate-900 ring-2 ring-slate-900/20 shadow-xs' : 'border-slate-200'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.bg}`}></span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Descripción (Opcional):
                </label>
                <textarea
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  placeholder="Breve detalle del contenido de esta carpeta..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-500 placeholder-slate-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim() || creatingFolder}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  <FolderPlus className="w-4 h-4 text-teal-400" />
                  <span>Crear Carpeta</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PREVISUALIZADOR Y DETALLE DE ARCHIVO */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getFileIcon(previewDoc.fileExtension, previewDoc.mimeType)}
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 truncate max-w-md">
                    {previewDoc.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Carpeta: <strong className="text-slate-700">{previewDoc.folderName}</strong></span>
                    <span>•</span>
                    <span>{formatFileSize(previewDoc.size)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/documents/${previewDoc.id}/download`}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Preview Canvas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex flex-col items-center justify-center min-h-[350px]">
              {previewDoc.mimeType.startsWith('image/') ? (
                <img
                  src={`/api/documents/${previewDoc.id}/view`}
                  alt={previewDoc.name}
                  className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg border border-slate-300"
                />
              ) : previewDoc.mimeType === 'application/pdf' ? (
                <iframe
                  src={`/api/documents/${previewDoc.id}/view`}
                  title={previewDoc.name}
                  className="w-full h-[60vh] rounded-xl border border-slate-300 bg-white"
                />
              ) : (
                /* Card for Word, Excel, etc. */
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-md shadow-sm space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto shadow-2xs">
                    {getFileIcon(previewDoc.fileExtension, previewDoc.mimeType)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-base">
                      {previewDoc.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Archivo de formato <strong>{previewDoc.fileExtension.toUpperCase()}</strong> ({formatFileSize(previewDoc.size)})
                    </p>
                  </div>

                  {previewDoc.description && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 text-left">
                      <strong className="block text-[10px] uppercase text-slate-500">Notas adjuntas:</strong>
                      {previewDoc.description}
                    </div>
                  )}

                  <a
                    href={`/api/documents/${previewDoc.id}/download`}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition-all hover:scale-102"
                  >
                    <Download className="w-4 h-4 text-teal-400" />
                    <span>Descargar archivo en tu equipo</span>
                  </a>
                </div>
              )}
            </div>

            {/* Modal Info Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span>Subido por: <strong className="text-slate-800">{previewDoc.uploadedBy?.name}</strong> ({previewDoc.uploadedBy?.role})</span>
                <span>•</span>
                <span>Sucursal: <strong className="text-slate-800">{previewDoc.branch || 'TODAS'}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const docToAssign = previewDoc;
                    setPreviewDoc(null);
                    setAssigningDoc(docToAssign);
                  }}
                  className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-xs transition-all"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>{previewDoc.assignedIncidentId ? 'Re-asignar en Matriz' : 'Asignar a Matriz'}</span>
                </button>
                <span className="font-mono text-[11px]">
                  {new Date(previewDoc.uploadedAt).toLocaleString('es-EC')}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 4: ASIGNAR O ANALIZAR NOVEDAD EN MATRIZ */}
      {assigningDoc && (
        <DocumentAssignModal
          document={assigningDoc}
          currentOperator={currentOperator}
          onClose={() => setAssigningDoc(null)}
          onIncidentCreated={(newIncident, updatedDoc) => {
            showToast(`✓ Novedad ${newIncident.id} creada y asignada a "${newIncident.item}"`);
            if (onIncidentCreated) {
              onIncidentCreated(newIncident, updatedDoc);
            }
            onRefresh();
          }}
        />
      )}

    </div>
  );
};

