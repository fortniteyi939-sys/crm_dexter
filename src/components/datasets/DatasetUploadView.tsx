import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Trash2,
  Eye,
  Search,
  ArrowRight,
  Database,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Dataset, TabKey } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { useProject } from '../../context/ProjectContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface DatasetUploadViewProps {
  onSelectTab: (tab: TabKey) => void;
}

export const DatasetUploadView: React.FC<DatasetUploadViewProps> = ({ onSelectTab }) => {
  const { activeProject, activeProjectId, refreshFlowStatus } = useProject();
  const { hasPermission } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Selected dataset for preview
  const [previewDatasetId, setPreviewDatasetId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    dataset: Dataset | null;
    headers: string[];
    rows: Record<string, any>[];
    pagination: { page: number; pageSize: number; totalRows: number; totalPages: number };
  }>({
    dataset: null,
    headers: [],
    rows: [],
    pagination: { page: 1, pageSize: 50, totalRows: 0, totalPages: 0 }
  });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchDatasets = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const res = await api.listDatasets(activeProjectId);
      setDatasets(res.datasets);
      if (res.datasets.length > 0 && !previewDatasetId) {
        setPreviewDatasetId(res.datasets[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [activeProjectId]);

  // Load preview data when selected dataset, page, or search changes
  useEffect(() => {
    const loadPreview = async () => {
      if (!previewDatasetId) return;
      setPreviewLoading(true);
      try {
        const res = await api.getDatasetPreview(previewDatasetId, currentPage, 50, searchTerm);
        setPreviewData({
          dataset: res.dataset,
          headers: res.headers,
          rows: res.rows,
          pagination: res.pagination
        });
      } catch (err: any) {
        console.error('Error loading dataset preview:', err);
      } finally {
        setPreviewLoading(false);
      }
    };

    loadPreview();
  }, [previewDatasetId, currentPage, searchTerm]);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeProjectId) return;
    const fileArray = Array.from(files);

    // Validate extensions
    const invalid = fileArray.some(f => !f.name.endsWith('.csv') && !f.name.endsWith('.xlsx'));
    if (invalid) {
      setError('Solo se admiten archivos .CSV y .XLSX');
      return;
    }

    setUploading(true);
    setUploadProgress(20);
    setError(null);

    try {
      setUploadProgress(60);
      const res = await api.uploadDatasets(activeProjectId, fileArray);
      setUploadProgress(100);
      await fetchDatasets();
      await refreshFlowStatus();
      if (res.datasets.length > 0) {
        setPreviewDatasetId(res.datasets[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Error al subir archivo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDataset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Deseas eliminar este dataset y sus transformaciones?')) return;
    try {
      await api.deleteDataset(id);
      await fetchDatasets();
      await refreshFlowStatus();
      if (previewDatasetId === id) {
        setPreviewDatasetId(null);
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-sm text-slate-500">Selecciona o crea un proyecto para subir datasets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-600" />
            Carga y Exploración de Datasets
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sube múltiples archivos CSV y XLSX para el proyecto <span className="font-semibold text-slate-800">{activeProject.nombre}</span>
          </p>
        </div>

        {datasets.length > 0 && (
          <button
            onClick={() => onSelectTab('mapeo')}
            className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors shrink-0"
          >
            <span>Continuar al Mapeo Semántico</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Zone */}
      {hasPermission('subir_datasets') && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFilesSelected(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-sky-500 bg-sky-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv, .xlsx"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>

          <h3 className="text-sm font-bold text-slate-800">
            Arrastra y suelta tus archivos aquí, o <span className="text-sky-600 underline">haz clic para explorar</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Formatos soportados: <strong>.CSV</strong> y <strong>.XLSX</strong> (Hasta 50MB por archivo)
          </p>

          {uploading && (
            <div className="mt-4 max-w-xs mx-auto">
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-sky-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium">Procesando y analizando columnas...</p>
            </div>
          )}
        </div>
      )}

      {/* Dataset List / Selector */}
      {datasets.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Datasets Registrados en este Proyecto ({datasets.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((ds) => {
              const isSelected = previewDatasetId === ds.id;
              const quality = ds.calidad_metadatos?.puntuacion_calidad || 85;

              return (
                <div
                  key={ds.id}
                  onClick={() => setPreviewDatasetId(ds.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                    isSelected
                      ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate" title={ds.nombre_original}>
                          {ds.nombre_original}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-mono">
                          {ds.formato} • {(ds.tamano / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        quality >= 80
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : quality >= 50
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        Calidad {quality}%
                      </span>
                      {hasPermission('subir_datasets') && (
                        <button
                          onClick={(e) => handleDeleteDataset(ds.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Eliminar dataset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span><strong>{ds.total_filas}</strong> filas</span>
                    <span><strong>{ds.columnas_detectadas.length}</strong> columnas</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paginated Data Preview (TanStack-like Table) */}
      {previewDatasetId && previewData.dataset && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-sky-600" />
              <h3 className="text-xs font-bold text-slate-900">
                Previsualización de Datos: <span className="text-sky-600">{previewData.dataset.nombre_original}</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                ({previewData.pagination.totalRows} filas totales)
              </span>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar en registros..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[460px] custom-scrollbar">
            {previewLoading ? (
              <div className="p-12 text-center text-xs text-slate-400">Cargando registros...</div>
            ) : previewData.rows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No se encontraron registros que coincidan con la búsqueda.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200 w-12 text-center text-slate-400 font-mono">
                      #
                    </th>
                    {previewData.headers.map((h) => (
                      <th key={h} className="py-2.5 px-3 border-r border-slate-200 truncate max-w-[200px]">
                        <div className="flex items-center space-x-1">
                          <span className="font-semibold text-slate-800">{h}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {previewData.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-sky-50/30 transition-colors">
                      <td className="py-2 px-3 border-r border-slate-100 text-center text-slate-400 font-sans">
                        {(previewData.pagination.page - 1) * 50 + rIdx + 1}
                      </td>
                      {previewData.headers.map((h) => (
                        <td key={h} className="py-2 px-3 border-r border-slate-100 text-slate-700 truncate max-w-[200px]" title={String(row[h] ?? '')}>
                          {row[h] !== null && row[h] !== undefined && row[h] !== '' ? (
                            String(row[h])
                          ) : (
                            <span className="text-slate-300 italic font-sans">null</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
            <span>
              Página {previewData.pagination.page} de {previewData.pagination.totalPages || 1}
            </span>

            <div className="flex items-center space-x-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage >= previewData.pagination.totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
