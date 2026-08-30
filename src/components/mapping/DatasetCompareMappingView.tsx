import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Save
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { TabKey } from '../../types/index.ts';

interface DatasetCompareMappingViewProps {
  onSelectTab: (tab: TabKey) => void;
}

// --- DATOS SIMULADOS PARA REVISION DE DISEÑO ---
// Reemplazar por la llamada real (api.getComparison / api.saveBatchMappings) cuando se apruebe el diseño.
const MOCK_COMPARISON = {
  rubro: 'Concesionario Automotriz',
  esquema_canonico: [
    { campo: 'placa_vehiculo', tipo: 'string', descripcion: 'Placa del vehículo vendido' },
    { campo: 'monto_venta', tipo: 'decimal', descripcion: 'Monto total de la transacción' },
    { campo: 'fecha_transaccion', tipo: 'date', descripcion: 'Fecha de la venta' },
    { campo: 'departamento', tipo: 'string', descripcion: 'Departamento donde ocurrió la venta' },
    { campo: 'modelo', tipo: 'string', descripcion: 'Modelo del vehículo' }
  ],
  datasets: [
    { id: 'd1', nombre: 'ventas_lima_2025.csv', columnas: [] },
    { id: 'd2', nombre: 'ventas_arequipa_q3.xlsx', columnas: [] },
    { id: 'd3', nombre: 'concesionario_norte.csv', columnas: [] }
  ],
  comparacion: [
    { dataset_id: 'd1', dataset_nombre: 'ventas_lima_2025.csv', columna_origen: 'plate_no', tipo_detectado: 'string', ejemplos: ['ABC-123', 'XYZ-902'], confianza: 0.94, sugerencia_canonica: 'placa_vehiculo', razon: '' },
    { dataset_id: 'd1', dataset_nombre: 'ventas_lima_2025.csv', columna_origen: 'total_venta_usd', tipo_detectado: 'decimal', ejemplos: ['24500', '31200'], confianza: 0.88, sugerencia_canonica: 'monto_venta', razon: '' },
    { dataset_id: 'd2', dataset_nombre: 'ventas_arequipa_q3.xlsx', columna_origen: 'fecha_op', tipo_detectado: 'date', ejemplos: ['2025-08-14', '2025-08-19'], confianza: 0.97, sugerencia_canonica: 'fecha_transaccion', razon: '' },
    { dataset_id: 'd2', dataset_nombre: 'ventas_arequipa_q3.xlsx', columna_origen: 'region', tipo_detectado: 'string', ejemplos: ['Arequipa', 'Moquegua'], confianza: 0.61, sugerencia_canonica: 'departamento', razon: '' },
    { dataset_id: 'd3', dataset_nombre: 'concesionario_norte.csv', columna_origen: 'car_model', tipo_detectado: 'string', ejemplos: ['Corolla Cross', 'Hilux'], confianza: 0.42, sugerencia_canonica: 'modelo', razon: '' },
    { dataset_id: 'd3', dataset_nombre: 'concesionario_norte.csv', columna_origen: 'vendedor_id', tipo_detectado: 'string', ejemplos: ['V-0091', 'V-0034'], confianza: 0.18, sugerencia_canonica: undefined, razon: '' }
  ],
  mapeos_guardados: [] as any[]
};

function ContourDivider() {
  return (
    <svg width="100%" height="16" viewBox="0 0 400 16" preserveAspectRatio="none" className="block">
      <path
        d="M0 9 Q 25 3 50 9 T 100 9 T 150 9 T 200 9 T 250 9 T 300 9 T 350 9 T 400 9"
        fill="none"
        stroke="#d8dfdb"
        strokeWidth="1"
      />
    </svg>
  );
}

function ConfidenceTicks({ value }: { value: number }) {
  const filled = Math.round((value || 0) * 5);
  const color = value >= 0.8 ? 'bg-pine' : value >= 0.5 ? 'bg-amber-dex' : 'bg-rust';
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`w-1.5 h-3 ${i < filled ? color : 'bg-line'}`} />
        ))}
      </div>
      <span className="font-mono text-[10px] text-ink-soft">{Math.round((value || 0) * 100)}%</span>
    </div>
  );
}

export const DatasetCompareMappingView: React.FC<DatasetCompareMappingViewProps> = ({
  onSelectTab
}) => {
  const { activeProject } = useProject();
  const { hasPermission } = useAuth();

  // MOCK: usando datos simulados para revisión de diseño, sin llamada al backend.
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comparisonData] = useState(MOCK_COMPARISON);

  const initialMappings: Record<string, string> = {};
  MOCK_COMPARISON.comparacion.forEach((c) => {
    if (c.sugerencia_canonica) {
      initialMappings[`${c.dataset_id}_${c.columna_origen}`] = c.sugerencia_canonica;
    }
  });

  const [selectedMappings, setSelectedMappings] = useState<Record<string, string>>(initialMappings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveAll = () => {
    // MOCK: simula el guardado sin llamar al backend.
    setSaving(true);
    setSavedSuccess(false);
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 400);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[11px] text-pine border border-pine px-1.5 py-px">02 / 04</span>
            <span className="font-body text-[11px] text-ink-soft font-medium">Flujo de fusión de datasets</span>
          </div>
          <h1 className="font-display text-xl font-semibold text-ink tracking-tight">
            Mapeo semántico y comparación de columnas
          </h1>
          <p className="font-body text-xs text-ink-soft mt-1">
            Normaliza columnas heterogéneas al esquema canónico de{' '}
            <span className="font-semibold text-ink">{activeProject?.rubro || "Concesionario Automotriz"}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleSaveAll}
            disabled={saving || !hasPermission('analizar_datos')}
            className="flex items-center space-x-2 px-4 py-2 bg-pine hover:bg-pine/90 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar mapeos'}</span>
          </button>

          <button
            onClick={() => onSelectTab('limpieza')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-ink hover:bg-ink/90 text-white text-xs font-semibold transition-colors"
          >
            <span>Continuar a limpieza</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ContourDivider />

      {savedSuccess && (
        <div className="p-3 bg-pine-light border border-pine text-pine text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Mapeos semánticos guardados y validados correctamente.</span>
        </div>
      )}

      {/* Main Mapping Grid */}
      {loading ? (
        <div className="p-12 text-center font-body text-xs text-ink-soft">Analizando semántica de columnas...</div>
      ) : !comparisonData || comparisonData.comparacion.length === 0 ? (
        <div className="p-8 text-center font-body text-xs text-ink-soft bg-white border border-line">
          No hay columnas para comparar en este proyecto.
        </div>
      ) : (
        <div className="bg-white border border-line overflow-hidden">
          <div className="p-3.5 border-b border-line flex items-center justify-between">
            <h3 className="font-body text-[11px] font-semibold text-ink tracking-wide">
              Matriz de correspondencia semántica
            </h3>
            <span className="font-mono text-[10px] text-ink-soft">
              {comparisonData.comparacion.length} columnas · {comparisonData.datasets.length} datasets
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-2.5 px-4 font-body text-[10px] font-semibold text-ink-soft tracking-wide">Dataset origen</th>
                  <th className="py-2.5 px-4 font-body text-[10px] font-semibold text-ink-soft tracking-wide">Columna detectada</th>
                  <th className="py-2.5 px-4 font-body text-[10px] font-semibold text-ink-soft tracking-wide">Tipo</th>
                  <th className="py-2.5 px-4 font-body text-[10px] font-semibold text-ink-soft tracking-wide">Ejemplos de datos</th>
                  <th className="py-2.5 px-4 font-body text-[10px] font-semibold text-ink-soft tracking-wide">Confianza IA</th>
                  <th className="py-2.5 px-4 w-72 font-body text-[10px] font-semibold text-ink-soft tracking-wide">Mapear a campo canónico</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.comparacion.map((c, idx) => {
                  const key = `${c.dataset_id}_${c.columna_origen}`;
                  const currentSelection = selectedMappings[key] || '';

                  return (
                    <tr
                      key={key}
                      className={`hover:bg-paper transition-colors ${
                        idx < comparisonData.comparacion.length - 1 ? 'border-b border-line' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-ink-soft font-body truncate max-w-[160px]">
                        {c.dataset_nombre}
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-ink">
                        {c.columna_origen}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-[10px] text-steel border border-line px-1.5 py-0.5">
                          {c.tipo_detectado}
                        </span>
                      </td>

                      <td
                        className="py-3 px-4 text-ink-soft font-mono text-[11px] truncate max-w-[200px]"
                        title={c.ejemplos.join(', ')}
                      >
                        {c.ejemplos && c.ejemplos.length > 0 ? (
                          c.ejemplos.slice(0, 3).join(', ')
                        ) : (
                          <span className="italic text-line-strong">Sin datos</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <ConfidenceTicks value={c.confianza} />
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={currentSelection}
                          onChange={(e) => {
                            setSelectedMappings(prev => ({ ...prev, [key]: e.target.value }));
                          }}
                          className={`w-full text-xs font-body px-2.5 py-1.5 border focus:outline-none focus:ring-1 focus:ring-pine transition-colors ${
                            currentSelection && currentSelection !== '__ignorar__'
                              ? 'bg-pine-light border-pine text-ink font-medium'
                              : 'bg-white border-line-strong text-ink-soft'
                          }`}
                        >
                          <option value="">-- Seleccionar campo canónico --</option>
                          <option value="__ignorar__">Ignorar columna</option>
                          <optgroup label={`Esquema estándar (${activeProject?.rubro || "Concesionario Automotriz"})`}>
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
