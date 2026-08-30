import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Layers,
  Save,
  HelpCircle,
  Database,
  ArrowRightLeft
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { MapeoColumna, TabKey } from '../../types/index.ts';
import { LockedStateBanner } from '../common/LockedStateBanner.tsx';

interface DatasetCompareMappingViewProps {
  onSelectTab: (tab: TabKey) => void;
}

export const DatasetCompareMappingView: React.FC<DatasetCompareMappingViewProps> = ({
  onSelectTab
}) => {
  const { activeProject, activeProjectId, flowStatus, refreshFlowStatus } = useProject();
  const { hasPermission } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comparisonData, setComparisonData] = useState<{
    rubro: string;
    esquema_canonico: { campo: string; tipo: string; descripcion: string }[];
    datasets: { id: string; nombre: string; columnas: any[] }[];
    comparacion: {
      dataset_id: string;
      dataset_nombre: string;
      columna_origen: string;
      tipo_detectado: string;
      sugerencia_canonica?: string;
      confianza: number;
      razon: string;
      ejemplos: any[];
    }[];
    mapeos_guardados: MapeoColumna[];
  } | null>(null);

  // Editable mappings state: key = `${dataset_id}_${columna_origen}` -> canonical target
  const [selectedMappings, setSelectedMappings] = useState<Record<string, string>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchComparison = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const res = await api.getComparison(activeProjectId);
      setComparisonData(res);

      // Initialize mapping selections from existing saved mappings or suggestions
      const initialMap: Record<string, string> = {};
      
      // 1. Load from saved
      res.mapeos_guardados.forEach((m) => {
        initialMap[`${m.dataset_id}_${m.columna_origen}`] = m.columna_canonica;
      });

      // 2. Fallback to suggestions for unmapped
      res.comparacion.forEach((c) => {
        const key = `${c.dataset_id}_${c.columna_origen}`;
        if (!initialMap[key] && c.sugerencia_canonica) {
          initialMap[key] = c.sugerencia_canonica;
        }
      });

      setSelectedMappings(initialMap);
    } catch (err: any) {
      console.error('Error loading column comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [activeProjectId]);

  const handleSaveAll = async () => {
    if (!comparisonData || !activeProjectId) return;
    setSaving(true);
    setSavedSuccess(false);

    try {
      const mappingsToSave = comparisonData.comparacion
        .map((c) => {
          const key = `${c.dataset_id}_${c.columna_origen}`;
          const target = selectedMappings[key];
          if (!target || target === '__ignorar__') return null;

          return {
            dataset_id: c.dataset_id,
            columna_origen: c.columna_origen,
            columna_canonica: target,
            tipo_destino: c.tipo_detectado,
            confianza: c.confianza || 1.0
          };
        })
        .filter(Boolean) as any[];

      await api.saveBatchMappings(mappingsToSave);
      await refreshFlowStatus();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error al guardar mapeos');
    } finally {
      setSaving(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-sm text-slate-500">Selecciona un proyecto para comparar columnas.</p>
      </div>
    );
  }

  if (!flowStatus?.hasDatasets) {
    return (
      <LockedStateBanner
        title="Mapeo Semántico Bloqueado"
        description="Para comparar columnas y mapear a un esquema estándar, primero debes cargar uno o más datasets CSV o XLSX en este proyecto."
        targetTab="datasets"
        actionText="Subir Datasets Ahora"
        onNavigate={onSelectTab}
        prerequisites={[
          { text: 'Crear Proyecto', done: true },
          { text: 'Cargar Datasets (CSV/XLSX)', done: false },
          { text: 'Configurar Mapeo Semántico', done: false }
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
            <Sparkles className="w-5 h-5 text-sky-600" />
            Mapeo Semántico & Comparación de Columnas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Normaliza columnas heterogéneas al esquema canónico de <span className="font-bold text-slate-800 uppercase">{activeProject.rubro}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleSaveAll}
            disabled={saving || !hasPermission('analizar_datos')}
            className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Mapeos'}</span>
          </button>

          {flowStatus?.hasMappings && (
            <button
              onClick={() => onSelectTab('limpieza')}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <span>Continuar a Limpieza</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>¡Mapeos semánticos guardados y validados correctamente!</span>
        </div>
      )}

      {/* Main Mapping Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Analizando semántica de columnas...</div>
      ) : !comparisonData || comparisonData.comparacion.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          No hay columnas para comparar en este proyecto.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Matriz de Correspondencia Semántica
            </h3>
            <span className="text-[11px] text-slate-500">
              {comparisonData.comparacion.length} columnas detectadas en {comparisonData.datasets.length} datasets
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Dataset Origen</th>
                  <th className="py-2.5 px-4">Columna Detectada</th>
                  <th className="py-2.5 px-4">Tipo</th>
                  <th className="py-2.5 px-4">Ejemplos de Datos</th>
                  <th className="py-2.5 px-4">Confianza IA</th>
                  <th className="py-2.5 px-4 w-72">Mapear a Campo Canónico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonData.comparacion.map((c) => {
                  const key = `${c.dataset_id}_${c.columna_origen}`;
                  const currentSelection = selectedMappings[key] || '';
                  const confidencePct = Math.round((c.confianza || 0) * 100);

                  return (
                    <tr key={key} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-medium truncate max-w-[160px]">
                        {c.dataset_nombre}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {c.columna_origen}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {c.tipo_detectado}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] truncate max-w-[200px]" title={c.ejemplos.join(', ')}>
                        {c.ejemplos && c.ejemplos.length > 0 ? (
                          c.ejemplos.slice(0, 3).join(', ')
                        ) : (
                          <span className="italic text-slate-300">Sin datos</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                confidencePct >= 80 ? 'bg-emerald-500' : confidencePct >= 50 ? 'bg-amber-500' : 'bg-slate-300'
                              }`}
                              style={{ width: `${confidencePct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{confidencePct}%</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={currentSelection}
                          onChange={(e) => {
                            setSelectedMappings(prev => ({ ...prev, [key]: e.target.value }));
                          }}
                          className={`w-full text-xs rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors ${
                            currentSelection && currentSelection !== '__ignorar__'
                              ? 'bg-sky-50/50 border-sky-300 text-sky-900 font-medium'
                              : 'bg-white border-slate-300 text-slate-600'
                          }`}
                        >
                          <option value="">-- Seleccionar campo canónico --</option>
                          <option value="__ignorar__">🚫 Ignorar columna</option>
                          <optgroup label={`Esquema Estándar (${activeProject.rubro})`}>
                            {comparisonData.esquema_canonico.map((ec) => (
                              <option key={ec.campo} value={ec.campo}>
                                {ec.campo} ({ec.tipo}) - {ec.descripcion}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
