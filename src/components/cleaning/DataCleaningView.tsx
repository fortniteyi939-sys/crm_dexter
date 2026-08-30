import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Database,
  Sliders,
  Trash2,
  Zap,
  Filter,
  Check
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Dataset, TransformacionDataset, TipoTransformacion, TabKey } from '../../types/index.ts';
import { LockedStateBanner } from '../common/LockedStateBanner.tsx';

interface DataCleaningViewProps {
  onSelectTab: (tab: TabKey) => void;
}

export const DataCleaningView: React.FC<DataCleaningViewProps> = ({ onSelectTab }) => {
  const { activeProject, activeProjectId, flowStatus } = useProject();
  const { hasPermission } = useAuth();

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [transformations, setTransformations] = useState<TransformacionDataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form states
  const [selectedTransformType, setSelectedTransformType] = useState<TipoTransformacion>('eliminar_duplicados');
  const [selectedColumna, setSelectedColumna] = useState<string>('');
  const [rellenarEstrategia, setRellenarEstrategia] = useState<'media' | 'mediana' | 'moda' | 'valor_fijo'>('media');
  const [valorFijo, setValorFijo] = useState<string>('');
  const [textoFormato, setTextoFormato] = useState<'minusculas' | 'mayusculas' | 'titulo'>('minusculas');
  const [targetTipo, setTargetTipo] = useState<'entero' | 'decimal' | 'texto' | 'fecha'>('entero');

  const fetchDatasetsAndTransforms = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const dsRes = await api.listDatasets(activeProjectId);
      setDatasets(dsRes.datasets);

      if (dsRes.datasets.length > 0) {
        const activeDs = selectedDatasetId || dsRes.datasets[0].id;
        setSelectedDatasetId(activeDs);
        const transRes = await api.listTransformations(activeDs);
        setTransformations(transRes.transformaciones);
      }
    } catch (err: any) {
      console.error('Error fetching datasets and transforms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasetsAndTransforms();
  }, [activeProjectId]);

  useEffect(() => {
    if (selectedDatasetId) {
      api.listTransformations(selectedDatasetId).then(r => setTransformations(r.transformaciones));
    }
  }, [selectedDatasetId]);

  const currentDataset = datasets.find(d => d.id === selectedDatasetId);

  const handleApplyTransform = async () => {
    if (!selectedDatasetId) return;
    setExecuting(true);
    setActionSuccess(null);

    const config: Record<string, any> = {};
    if (selectedTransformType === 'rellenar_nulos') {
      config.estrategia = rellenarEstrategia;
      config.valor_fijo = valorFijo;
    } else if (selectedTransformType === 'estandarizar_texto') {
      config.formato = textoFormato;
    } else if (selectedTransformType === 'convertir_tipo') {
      config.tipo_destino = targetTipo;
    }

    try {
      const res = await api.applyTransformation({
        dataset_id: selectedDatasetId,
        tipo_transformacion: selectedTransformType,
        columna: selectedColumna || undefined,
        configuracion: config
      });

      setActionSuccess(`¡Éxito! ${res.resumen_accion} (${res.filas_afectadas} filas afectadas).`);
      const transRes = await api.listTransformations(selectedDatasetId);
      setTransformations(transRes.transformaciones);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error al aplicar transformación');
    } finally {
      setExecuting(false);
    }
  };

  const handleRevertTransform = async (transId: string) => {
    if (!window.confirm('¿Deseas revertir esta transformación?')) return;
    try {
      await api.deleteTransformation(transId);
      const transRes = await api.listTransformations(selectedDatasetId);
      setTransformations(transRes.transformaciones);
    } catch (err: any) {
      alert(err.message || 'Error al revertir');
    }
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-sm text-slate-500">Selecciona un proyecto para aplicar limpieza de datos.</p>
      </div>
    );
  }

  if (!flowStatus?.hasDatasets) {
    return (
      <LockedStateBanner
        title="Limpieza de Datos Bloqueada"
        description="Para aplicar reglas de limpieza, normalización y transformación, primero debes cargar datasets en este proyecto."
        targetTab="datasets"
        actionText="Subir Datasets"
        onNavigate={onSelectTab}
        prerequisites={[
          { text: 'Crear Proyecto', done: true },
          { text: 'Cargar Datasets (CSV/XLSX)', done: false },
          { text: 'Aplicar Limpieza y Normalización', done: false }
        ]}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-600" />
            Limpieza, Transformación y Normalización de Datos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Aplica reglas deterministas de calidad sobre el dataset seleccionado
          </p>
        </div>

        <button
          onClick={() => onSelectTab('fusion')}
          className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors shrink-0"
        >
          <span>Proceder a Fusión & Master</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Dataset Selector Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {datasets.map((ds) => (
          <button
            key={ds.id}
            onClick={() => setSelectedDatasetId(ds.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedDatasetId === ds.id
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {ds.nombre_original} ({ds.total_filas} filas)
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Transformation Controls */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-600" />
              Configurar Regla de Transformación
            </h3>

            {/* Select Operation Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Tipo de Transformación *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'eliminar_duplicados', label: 'Eliminar Duplicados', desc: 'Descarta filas idénticas o por clave' },
                  { id: 'eliminar_nulos', label: 'Eliminar Filas con Nulos', desc: 'Descarta registros con celdas vacías' },
                  { id: 'rellenar_nulos', label: 'Imputar / Rellenar Nulos', desc: 'Media, Mediana, Moda o Valor Fijo' },
                  { id: 'normalizar_fechas', label: 'Normalizar Fechas a ISO', desc: 'Convierte a formato YYYY-MM-DD' },
                  { id: 'limpiar_espacios', label: 'Limpiar Espacios (Trim)', desc: 'Elimina espacios iniciales y finales' },
                  { id: 'estandarizar_texto', label: 'Estandarizar Mayús/Minús', desc: 'Minúsculas, Mayúsculas o Título' },
                  { id: 'convertir_tipo', label: 'Casting de Tipos de Datos', desc: 'Convierte texto a número o fecha' }
                ].map((op) => (
                  <div
                    key={op.id}
                    onClick={() => setSelectedTransformType(op.id as TipoTransformacion)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedTransformType === op.id
                        ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <p className={`font-bold ${selectedTransformType === op.id ? 'text-sky-900' : 'text-slate-800'}`}>
                      {op.label}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{op.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column Target */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Columna Objetivo
              </label>
              <select
                value={selectedColumna}
                onChange={(e) => setSelectedColumna(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">-- Toda la fila / General --</option>
                {currentDataset?.columnas_detectadas.map((col) => (
                  <option key={col.nombre} value={col.nombre}>
                    {col.nombre} ({col.tipo} - {col.porcentaje_nulos}% nulos)
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-options based on type */}
            {selectedTransformType === 'rellenar_nulos' && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Estrategia de Imputación
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['media', 'mediana', 'moda', 'valor_fijo'] as const).map((est) => (
                    <button
                      key={est}
                      type="button"
                      onClick={() => setRellenarEstrategia(est)}
                      className={`py-1.5 text-xs font-semibold rounded-md uppercase border transition-all ${
                        rellenarEstrategia === est
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                    >
                      {est.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {rellenarEstrategia === 'valor_fijo' && (
                  <div>
                    <input
                      type="text"
                      value={valorFijo}
                      onChange={(e) => setValorFijo(e.target.value)}
                      placeholder="Valor fijo para rellenar (ej. 0, 'Sin especificar')..."
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                )}
              </div>
            )}

            {selectedTransformType === 'estandarizar_texto' && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Formato de Texto</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['minusculas', 'mayusculas', 'titulo'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setTextoFormato(fmt)}
                      className={`py-1.5 text-xs font-semibold rounded-md capitalize border transition-all ${
                        textoFormato === fmt
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedTransformType === 'convertir_tipo' && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Tipo de Destino</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['entero', 'decimal', 'texto', 'fecha'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTargetTipo(t)}
                      className={`py-1.5 text-xs font-semibold rounded-md capitalize border transition-all ${
                        targetTipo === t
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleApplyTransform}
              disabled={executing || !hasPermission('limpiar_datos')}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{executing ? 'Aplicando Limpieza...' : 'Ejecutar Transformación'}</span>
            </button>
          </div>
        </div>

        {/* Right Col: Ledger / History of Transformations */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span>Historial de Transformaciones</span>
            <span className="text-[11px] font-mono font-normal text-slate-500">
              {transformations.length} aplicadas
            </span>
          </h3>

          {transformations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
              No se han aplicado transformaciones sobre este dataset todavía.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[440px] overflow-y-auto custom-scrollbar">
              {transformations.map((t, idx) => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs space-y-1.5 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 capitalize">
                      {idx + 1}. {t.tipo_transformacion.replace(/_/g, ' ')}
                    </span>
                    {hasPermission('limpiar_datos') && (
                      <button
                        onClick={() => handleRevertTransform(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-rose-600 hover:text-rose-700 p-1 text-[11px] flex items-center gap-1 transition-opacity"
                        title="Revertir transformación"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Revertir</span>
                      </button>
                    )}
                  </div>

                  {t.columna && (
                    <p className="text-[11px] text-slate-500">
                      Columna: <strong className="text-slate-700 font-mono">{t.columna}</strong>
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                    <span>Afectadas: <strong>{t.filas_afectadas}</strong></span>
                    <span>{new Date(t.ejecutado_en).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
