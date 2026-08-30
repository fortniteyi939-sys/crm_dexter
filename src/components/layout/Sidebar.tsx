import React from 'react';
import {
  Database,
  Layers,
  Sparkles,
  GitMerge,
  BarChart3,
  Lightbulb,
  Table2,
  Users,
  FileText,
  ShieldCheck,
  Lock,
  CheckCircle2,
  FolderPlus,
  HelpCircle,
  Activity
} from 'lucide-react';
import { TabKey, RolUsuario } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useProject } from '../../context/ProjectContext.tsx';

interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  onOpenCreateProject: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenCreateProject
}) => {
  const { user, switchRoleQuickLogin } = useAuth();
  const {
    projects,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    isTabUnlocked,
    getTabLockReason
  } = useProject();

  const navItems: {
    key: TabKey;
    label: string;
    icon: React.ElementType;
    requiresProject?: boolean;
    stageNum?: number;
  }[] = [
    { key: 'proyectos', label: 'Proyectos', icon: Layers, stageNum: 1 },
    { key: 'datasets', label: 'Carga de Datasets', icon: Database, requiresProject: true, stageNum: 2 },
    { key: 'mapeo', label: 'Mapeo Semántico', icon: Sparkles, requiresProject: true, stageNum: 3 },
    { key: 'limpieza', label: 'Limpieza de Datos', icon: Activity, requiresProject: true, stageNum: 4 },
    { key: 'fusion', label: 'Fusión & Master', icon: GitMerge, requiresProject: true, stageNum: 5 },
    { key: 'dashboard', label: 'Dashboard Analítico', icon: BarChart3, requiresProject: true, stageNum: 6 },
    { key: 'oportunidades', label: 'Oportunidades', icon: Lightbulb, requiresProject: true, stageNum: 7 },
    { key: 'modulos_operativos', label: 'Tablas Adaptativas', icon: Table2 },
    { key: 'usuarios', label: 'Equipo & Permisos', icon: Users },
    { key: 'auditoria', label: 'Auditoría', icon: ShieldCheck },
    { key: 'reporte_pdf', label: 'Exportar Informe PDF', icon: FileText, requiresProject: true }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              CRM DEXTER
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 bg-sky-500/20 text-sky-400 rounded border border-sky-500/30">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-400">Inteligencia de Datos</p>
          </div>
        </div>
      </div>

      {/* Active Project Selector */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Proyecto Activo
          </span>
          <button
            onClick={onOpenCreateProject}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            title="Crear nuevo proyecto"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Nuevo</span>
          </button>
        </div>

        {projects.length > 0 ? (
          <div className="relative">
            <select
              value={activeProjectId || ''}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="w-full text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-2.5 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.rubro})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <button
            onClick={onOpenCreateProject}
            className="w-full text-xs text-left px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md transition-colors flex items-center justify-between"
          >
            <span>Crear primer proyecto</span>
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        )}

        {activeProject && (
          <div className="mt-2 px-1 flex items-center justify-between text-[11px] text-slate-400">
            <span className="capitalize font-medium text-slate-300">
              Rubro: <span className="text-sky-400">{activeProject.rubro}</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {activeProject.estado}
            </span>
          </div>
        )}
      </div>

      {/* Navigation Links with Progressive Locks */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Flujo de Procesamiento
        </div>

        {navItems.map((item) => {
          const unlocked = isTabUnlocked(item.key);
          const lockReason = getTabLockReason(item.key);
          const isActive = activeTab === item.key;
          const Icon = item.icon;

          return (
            <div key={item.key} className="relative group">
              <button
                onClick={() => {
                  if (unlocked) {
                    onSelectTab(item.key);
                  }
                }}
                disabled={!unlocked}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                    : unlocked
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-500 opacity-60 cursor-not-allowed bg-slate-900/40'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : unlocked ? 'text-slate-400' : 'text-slate-600'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {!unlocked ? (
                  <span className="flex items-center text-slate-600" title={lockReason || 'Bloqueado'}>
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                ) : item.stageNum && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isActive ? 'bg-sky-700 text-sky-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    P{item.stageNum}
                  </span>
                )}
              </button>

              {/* Tooltip on locked hover */}
              {!unlocked && lockReason && (
                <div className="hidden group-hover:block absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 w-56 p-2 bg-slate-950 border border-slate-700 text-slate-200 text-[11px] rounded-md shadow-xl pointer-events-none">
                  <div className="flex items-start gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-300">Módulo Bloqueado</p>
                      <p className="text-slate-400 mt-0.5">{lockReason}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Quick Role Tester Switcher (For smooth review & demonstration) */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1.5 flex items-center justify-between">
          <span>Cambiar Rol Demo</span>
          <HelpCircle className="w-3 h-3 text-slate-600" />
        </div>
        <div className="grid grid-cols-2 gap-1 text-[11px]">
          <button
            onClick={() => switchRoleQuickLogin('administrador')}
            className={`px-2 py-1 rounded text-left truncate transition-colors ${
              user?.rol === 'administrador'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 font-semibold'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => switchRoleQuickLogin('propietario_empresa')}
            className={`px-2 py-1 rounded text-left truncate transition-colors ${
              user?.rol === 'propietario_empresa'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 font-semibold'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Propietario
          </button>
          <button
            onClick={() => switchRoleQuickLogin('analista')}
            className={`px-2 py-1 rounded text-left truncate transition-colors ${
              user?.rol === 'analista'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 font-semibold'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Analista
          </button>
          <button
            onClick={() => switchRoleQuickLogin('usuario_operativo')}
            className={`px-2 py-1 rounded text-left truncate transition-colors ${
              user?.rol === 'usuario_operativo'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50 font-semibold'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Operativo
          </button>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-sky-400">
            {user?.nombre?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{user?.nombre}</p>
            <p className="text-[10px] text-slate-400 capitalize truncate">{user?.rol?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
