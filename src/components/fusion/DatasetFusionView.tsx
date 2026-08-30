import React, { useState, useEffect } from 'react';
import {
  GitMerge,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  Sparkles,
  Zap,
  HardDrive,
  FileCode2,
  Calendar
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { DatasetFusionado, TabKey } from '../../types/index.ts';
import { LockedStateBanner } from '../common/LockedStateBanner.tsx';

interface DatasetFusionViewProps {
  onSelectTab: (tab: TabKey) => void;
}

export const DatasetFusionView: React.FC<DatasetFusionViewProps> = ({ onSelectTab }) => {
  const { activeProject, activeProjectId, flowStatus, refreshFlowStatus } = useProject();
  const { hasPermission } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fusing, setFusing] = useState(false);
  const [fusionResult, setFusionResult] = useState<DatasetFusionado | null>(null);
  const [sampleRows, setSampleRows] = useState<Record<string, any>[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestFusion = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const res = await api.getLatestFusion(activeProjectId);
      setFusionResult(res.fusion);
    } catch {
      setFusionResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestFusion();
  }, [activeProjectId]);

  const handleExecuteFusion = async () => {
    if (!activeProjectId) return;
    setFusing(true);
    setError(null);

    try {
      const res = await api.executeFusion(activeProjectId);
      setFusionResult(res.fusion);
      setSampleRows(res.muestra_filas);
      await refreshFlowStatus();
    } catch (err: any) {
      setError(err.message || 'Error al ejecutar fusión de datasets');
    } finally {
      setFusing(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-sm text-slate-500">Selecciona un proyecto para fusionar datasets.</p>
      </div>
    );
  }

  if (!flowStatus?.hasDatasets || !flowStatus?.hasMappings) {
    return (
      <LockedStateBanner
        title="Fusión de Datasets Bloqueada"
        description="Para consolidar múltiples fuentes en un dataset maestro de alto rendimiento, debes haber subido datasets y definido el mapeo de columnas."
        targetTab={!flowStatus?.hasDatasets ? 'datasets' : 'mapeo'}
        actionText={!flowStatus?.hasDatasets ? 'Cargar Datasets' : 'Configurar Mapeos'}
        onNavigate={onSelectTab}
        prerequisites={[
          { text: 'Cargar Datasets (CSV/XLSX)', done: flowStatus?.hasDatasets || false },
          { text: 'Mapear Columnas a Esquema Estándar', done: flowStatus?.hasMappings || false },
          { text: 'Consolidar Master Dataset (Parquet)', done: false }
        ]}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-sky-600" />
            Motor de Fusión & Dataset Maestro (Parquet Engine)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Consolida todas las fuentes y transformaciones en una estructura maestra optimizada
          </p>
        </div>

        {fusionResult && (
          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors shrink-0"
          >
            <span>Ver Dashboard Analítico</span>
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

      {/* Main Execution Card */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
          <GitMerge className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {fusionResult ? 'Dataset Maestro Consolidado' : 'Consolidar Fuentes de Datos'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            El motor de fusión procesará los archivos crudos, aplicará el historial de transformaciones y mapeará las columnas al esquema canónico de <span className="font-semibold text-slate-800 uppercase">{activeProject.rubro}</span>.
          </p>
        </div>

        <button
          onClick={handleExecuteFusion}
          disabled={fusing || !hasPermission('procesar_datasets')}
          className="px-6 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition-all transform active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          <span>{fusing ? 'Consolidando y Escribiendo Parquet...' : fusionResult ? 'Re-procesar y Actualizar Master' : 'Ejecutar Motor de Fusión'}</span>
        </button>

        {fusionResult && (
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-3 gap-3 text-left">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Filas</p>
              <p className="text-base font-extrabold text-slate-900 mt-0.5">
                {fusionResult.total_filas_consolidadas.toLocaleString()}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-400">Versión</p>
              <p className="text-base font-extrabold text-indigo-600 mt-0.5">
                v{fusionResult.version}.0
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-400">Almacenamiento</p>
              <p className="text-base font-extrabold text-emerald-600 mt-0.5">
                {fusionResult.tamano_mb} MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Breakdown of Datasets in Master */}
      {fusionResult && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Detalle de Datasets y Esquema Unificado
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
              <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-sky-600" />
                Datasets Fuente Consolidados
              </p>
              <ul className="space-y-1 text-xs text-slate-600">
                {fusionResult.datasets_fuente.map((ds) => (
                  <li key={ds.id} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="font-medium text-slate-800">{ds.nombre}</span>
                    <span className="font-mono text-[11px] text-slate-500">{ds.filas_aportadas} filas</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
              <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <FileCode2 className="w-4 h-4 text-indigo-600" />
                Columnas en Esquema Consolidado
              </p>
              <div className="flex flex-wrap gap-1.5">
                {fusionResult.esquema_consolidado.map((col) => (
                  <span
                    key={col.nombre}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 shadow-2xs"
                  >
                    {col.nombre}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
