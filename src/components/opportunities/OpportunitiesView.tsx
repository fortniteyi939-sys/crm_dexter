import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  X,
  FileCheck,
  ShieldCheck,
  Building
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Oportunidad, EstadoOportunidad, TabKey } from '../../types/index.ts';
import { LockedStateBanner } from '../common/LockedStateBanner.tsx';

interface OpportunitiesViewProps {
  onSelectTab: (tab: TabKey) => void;
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({ onSelectTab }) => {
  const { activeProject, activeProjectId, flowStatus } = useProject();
  const { user, hasPermission } = useAuth();

  const [opportunities, setOpportunities] = useState<Oportunidad[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter tab: 'todas' | 'detectada' | 'en_revision' | 'aprobada' | 'implementada'
  const [filterState, setFilterState] = useState<string>('todas');

  // Form states
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [evidencia, setEvidencia] = useState('');
  const [metrica, setMetrica] = useState('');
  const [impacto, setImpacto] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchOpportunities = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const res = await api.listOpportunities(activeProjectId);
      setOpportunities(res.oportunidades);
    } catch (err: any) {
      console.error('Error listing opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [activeProjectId]);

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) return;
    setSubmitting(true);
    setFormError(null);

    try {
      await api.createOpportunity({
        proyecto_id: activeProjectId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        evidencia: evidencia.trim(),
        metrica_detectada: metrica.trim() || undefined,
        impacto_estimado: impacto.trim() || undefined
      });

      setIsModalOpen(false);
      setTitulo('');
      setDescripcion('');
      setEvidencia('');
      setMetrica('');
      setImpacto('');
      await fetchOpportunities();
    } catch (err: any) {
      setFormError(err.message || 'Error al registrar oportunidad');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, nuevo_estado: EstadoOportunidad) => {
    const notas = prompt(`Notas u observaciones para el estado "${nuevo_estado}":`) || undefined;
    try {
      await api.updateOpportunityStatus(id, nuevo_estado, notas);
      await fetchOpportunities();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar estado');
    }
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-sm text-slate-500">Selecciona un proyecto para gestionar oportunidades.</p>
      </div>
    );
  }

  if (!flowStatus?.hasDatasets) {
    return (
      <LockedStateBanner
        title="Gestión de Oportunidades Bloqueada"
        description="Para registrar y aprobar oportunidades basadas en datos, primero debes consolidar datasets en este proyecto."
        targetTab="datasets"
        actionText="Cargar Datasets"
        onNavigate={onSelectTab}
        prerequisites={[
          { text: 'Cargar Datasets', done: false },
          { text: 'Procesar Datos', done: false }
        ]}
      />
    );
  }

  const filteredList = filterState === 'todas'
    ? opportunities
    : opportunities.filter(o => o.estado === filterState);

  const getStatusBadge = (estado: EstadoOportunidad) => {
    switch (estado) {
      case 'detectada':
        return { label: 'Detectada', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: Clock };
      case 'en_revision':
        return { label: 'En Revisión', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock };
      case 'aprobada':
        return { label: 'Aprobada', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
      case 'rechazada':
        return { label: 'Rechazada', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle };
      case 'implementada':
        return { label: 'Implementada', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: FileCheck };
      default:
        return { label: estado, bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: Clock };
    }
  };

  const canApprove = user?.rol === 'administrador' || user?.rol === 'propietario_empresa' || hasPermission('aprobar_cambios');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Oportunidades de Negocio & Flujo de Aprobaciones
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registro, evaluación y aprobación de iniciativas accionables detectadas en los datos
          </p>
        </div>

        {hasPermission('crear_oportunidades') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Oportunidad</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
        {['todas', 'detectada', 'en_revision', 'aprobada', 'implementada', 'rechazada'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterState(st)}
            className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-colors ${
              filterState === st
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {st.replace('_', ' ')} (
            {st === 'todas'
              ? opportunities.length
              : opportunities.filter(o => o.estado === st).length}
            )
          </button>
        ))}
      </div>

      {/* Opportunities List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Cargando oportunidades...</div>
      ) : filteredList.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          No hay oportunidades en el estado seleccionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredList.map((op) => {
            const statusInfo = getStatusBadge(op.estado);
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={op.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.bg}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusInfo.label}</span>
                    </span>

                    <span className="text-[11px] text-slate-400">
                      {new Date(op.creado_en).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900">{op.titulo}</h3>
                  <p className="text-xs text-slate-600 mt-1">{op.descripcion}</p>

                  {/* Evidence Box */}
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1 text-xs">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Evidencia en los Datos:
                    </p>
                    <p className="text-slate-700 font-mono text-[11px]">{op.evidencia}</p>

                    {op.impacto_estimado && (
                      <p className="text-[11px] text-emerald-700 font-semibold pt-1">
                        💰 Impacto Estimado: {op.impacto_estimado}
                      </p>
                    )}
                  </div>
                </div>

                {/* Workflow Transitions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400">
                    Por: <strong className="text-slate-600">{op.creado_por_nombre || 'Analista'}</strong>
                  </div>

                  {/* Approval Actions */}
                  <div className="flex items-center space-x-1.5">
                    {op.estado === 'detectada' && (
                      <button
                        onClick={() => handleUpdateStatus(op.id, 'en_revision')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors"
                      >
                        Pasar a Revisión
                      </button>
                    )}

                    {op.estado === 'en_revision' && canApprove && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(op.id, 'aprobada')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Aprobar</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(op.id, 'rechazada')}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Rechazar</span>
                        </button>
                      </>
                    )}

                    {op.estado === 'aprobada' && (
                      <button
                        onClick={() => handleUpdateStatus(op.id, 'implementada')}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                      >
                        <FileCheck className="w-3 h-3" />
                        <span>Marcar Implementada</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Opportunity */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Registrar Oportunidad</h3>
                  <p className="text-xs text-slate-500">Documenta una propuesta basada en evidencia analítica</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateOpportunity} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Título de la Oportunidad *
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Reorganización de catálogo en Región Norte"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción Detallada *
                </label>
                <textarea
                  rows={2}
                  required
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Propuesta estratégica y plan de acción..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Evidencia en los Datos (Dataset/Métrica) *
                </label>
                <input
                  type="text"
                  required
                  value={evidencia}
                  onChange={(e) => setEvidencia(e.target.value)}
                  placeholder="Ej. Caída del 24% en ventas de producto X vs producto Y"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Métrica Clave
                  </label>
                  <input
                    type="text"
                    value={metrica}
                    onChange={(e) => setMetrica(e.target.value)}
                    placeholder="Ej. Tasa de conversión"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Impacto Estimado
                  </label>
                  <input
                    type="text"
                    value={impacto}
                    onChange={(e) => setImpacto(e.target.value)}
                    placeholder="Ej. +$45,000 USD / Trimestre"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear Oportunidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
