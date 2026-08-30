import React from 'react';
import {
  FolderPlus,
  Layers,
  Database,
  ArrowRight,
  Sparkles,
  BarChart3,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Proyecto, TabKey } from '../../types/index.ts';
import { useProject } from '../../context/ProjectContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';

interface ProjectListViewProps {
  onOpenCreateProject: () => void;
  onSelectTab: (tab: TabKey) => void;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({
  onOpenCreateProject,
  onSelectTab
}) => {
  const { user } = useAuth();
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    refreshProjects,
    loadingProjects
  } = useProject();

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`¿Estás seguro de eliminar el proyecto "${name}" y todos sus datasets asociados?`)) {
      return;
    }

    try {
      await api.deleteProject(id);
      await refreshProjects();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar proyecto');
    }
  };

  const getRubroBadge = (rubro: string) => {
    switch (rubro) {
      case 'ventas':
        return { label: 'Ventas & Comercio', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '💰' };
      case 'demografia':
        return { label: 'Demografía & Población', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '👥' };
      case 'territorial':
        return { label: 'Territorial & Geográfico', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: '🗺️' };
      case 'inventario':
        return { label: 'Inventario & Logística', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: '📦' };
      default:
        return { label: rubro, bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: '📁' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-600" />
            Proyectos de Inteligencia de Datos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Administra tus proyectos, esquemas canónicos y espacios de trabajo analíticos
          </p>
        </div>

        <button
          onClick={onOpenCreateProject}
          className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors shrink-0"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Crear Nuevo Proyecto</span>
        </button>
      </div>

      {/* Projects Grid */}
      {loadingProjects ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Cargando proyectos...
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderPlus className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            No tienes proyectos registrados
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Crea tu primer proyecto para comenzar a cargar datasets CSV/XLSX, normalizar esquemas y descubrir oportunidades de negocio.
          </p>
          <button
            onClick={onOpenCreateProject}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors inline-flex items-center gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Crear Primer Proyecto</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => {
            const rubroInfo = getRubroBadge(proj.rubro);
            const isActive = activeProjectId === proj.id;

            return (
              <div
                key={proj.id}
                onClick={() => {
                  setActiveProjectId(proj.id);
                  onSelectTab('datasets');
                }}
                className={`bg-white rounded-xl border p-5 transition-all cursor-pointer flex flex-col justify-between relative group ${
                  isActive
                    ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${rubroInfo.bg}`}>
                      <span>{rubroInfo.icon}</span>
                      <span>{rubroInfo.label}</span>
                    </span>

                    <div className="flex items-center space-x-1">
                      {isActive && (
                        <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                          ACTIVO
                        </span>
                      )}
                      {(user?.rol === 'administrador' || user?.rol === 'propietario_empresa') && (
                        <button
                          onClick={(e) => handleDelete(proj.id, proj.nombre, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                          title="Eliminar proyecto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                    {proj.nombre}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 min-h-[32px]">
                    {proj.descripcion || 'Sin descripción detallada.'}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1.5 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(proj.creado_en).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center space-x-1 text-sky-600 font-semibold text-xs group-hover:translate-x-0.5 transition-transform">
                    <span>Abrir Flujo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
