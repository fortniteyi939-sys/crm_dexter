import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Proyecto, FlowStatus, TabKey } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from './AuthContext.tsx';

interface ProjectContextType {
  projects: Proyecto[];
  activeProject: Proyecto | null;
  activeProjectId: string | null;
  flowStatus: FlowStatus | null;
  loadingProjects: boolean;
  loadingFlow: boolean;
  setActiveProjectId: (id: string) => void;
  refreshProjects: () => Promise<void>;
  refreshFlowStatus: () => Promise<void>;
  isTabUnlocked: (tab: TabKey) => boolean;
  getTabLockReason: (tab: TabKey) => string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Proyecto[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
    return localStorage.getItem('crm_dexter_active_proj') || null;
  });
  const [flowStatus, setFlowStatus] = useState<FlowStatus | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingFlow, setLoadingFlow] = useState(false);

  const refreshProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setActiveProjectIdState(null);
      setFlowStatus(null);
      return;
    }

    setLoadingProjects(true);
    try {
      const res = await api.listProjects();
      setProjects(res.projects);

      if (res.projects.length > 0) {
        if (!activeProjectId || !res.projects.some(p => p.id === activeProjectId)) {
          const firstId = res.projects[0].id;
          setActiveProjectIdState(firstId);
          localStorage.setItem('crm_dexter_active_proj', firstId);
        }
      } else {
        setActiveProjectIdState(null);
        localStorage.removeItem('crm_dexter_active_proj');
        setFlowStatus(null);
      }
    } catch (err) {
      console.error('Error listing projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  }, [user, activeProjectId]);

  const refreshFlowStatus = useCallback(async () => {
    if (!activeProjectId) {
      setFlowStatus(null);
      return;
    }

    setLoadingFlow(true);
    try {
      const flow = await api.getFlowStatus(activeProjectId);
      setFlowStatus(flow);
    } catch (err) {
      console.error('Error fetching flow status:', err);
    } finally {
      setLoadingFlow(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    refreshProjects();
  }, [user]);

  useEffect(() => {
    if (activeProjectId) {
      refreshFlowStatus();
    }
  }, [activeProjectId, refreshFlowStatus]);

  const setActiveProjectId = (id: string) => {
    setActiveProjectIdState(id);
    localStorage.setItem('crm_dexter_active_proj', id);
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  // Progressive Lock Evaluation Helpers
  const isTabUnlocked = (tab: TabKey): boolean => {
    // Global tabs that don't depend on an active project
    if (['inicio', 'proyectos', 'modulos_operativos', 'usuarios', 'auditoria'].includes(tab)) {
      return true;
    }

    if (!activeProjectId || !flowStatus) return false;

    switch (tab) {
      case 'datasets':
        return flowStatus.unlockedModules.datasets;
      case 'mapeo':
        return flowStatus.unlockedModules.mapping;
      case 'limpieza':
        return flowStatus.unlockedModules.cleaning;
      case 'fusion':
        return flowStatus.unlockedModules.fusion;
      case 'dashboard':
        return flowStatus.unlockedModules.dashboard;
      case 'oportunidades':
        return flowStatus.unlockedModules.opportunities;
      case 'reporte_pdf':
        return flowStatus.unlockedModules.reports;
      default:
        return true;
    }
  };

  const getTabLockReason = (tab: TabKey): string | null => {
    if (!activeProjectId) {
      return 'Debes seleccionar o crear un proyecto primero.';
    }
    if (!flowStatus) return null;

    switch (tab) {
      case 'mapeo':
        return flowStatus.missingRequirements.mapping;
      case 'limpieza':
        return flowStatus.missingRequirements.cleaning;
      case 'fusion':
        return flowStatus.missingRequirements.fusion;
      case 'dashboard':
        return flowStatus.missingRequirements.dashboard;
      case 'oportunidades':
        return flowStatus.missingRequirements.dashboard;
      case 'reporte_pdf':
        return flowStatus.missingRequirements.reports;
      default:
        return null;
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        activeProjectId,
        flowStatus,
        loadingProjects,
        loadingFlow,
        setActiveProjectId,
        refreshProjects,
        refreshFlowStatus,
        isTabUnlocked,
        getTabLockReason
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
