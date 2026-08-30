import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ProjectProvider, useProject } from './context/ProjectContext.tsx';
import { TabKey } from './types/index.ts';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { Header } from './components/layout/Header.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { ProjectListView } from './components/projects/ProjectListView.tsx';
import { CreateProjectModal } from './components/projects/CreateProjectModal.tsx';
import { DatasetUploadView } from './components/datasets/DatasetUploadView.tsx';
import { DatasetCompareMappingView } from './components/mapping/DatasetCompareMappingView.tsx';
import { DataCleaningView } from './components/cleaning/DataCleaningView.tsx';
import { DatasetFusionView } from './components/fusion/DatasetFusionView.tsx';
import { AnalyticsDashboardView } from './components/analytics/AnalyticsDashboardView.tsx';
import { OpportunitiesView } from './components/opportunities/OpportunitiesView.tsx';
import { OperationalModulesView } from './components/modules/OperationalModulesView.tsx';
import { TeamPermissionsView } from './components/team/TeamPermissionsView.tsx';
import { AuditLogsView } from './components/audit/AuditLogsView.tsx';
import { ReportExportModal } from './components/reports/ReportExportModal.tsx';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { activeProject } = useProject();

  const [activeTab, setActiveTab] = useState<TabKey>('proyectos');
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Iniciando CRM DEXTER...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const handleSelectTab = (tab: TabKey) => {
    if (tab === 'reporte_pdf') {
      setIsReportModalOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  const handleProjectCreated = (newProjectId: string) => {
    setActiveTab('datasets');
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 overflow-hidden font-sans antialiased">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenCreateProject={() => setIsCreateProjectOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onOpenReportModal={() => setIsReportModalOpen(true)}
          onSelectTab={handleSelectTab}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'proyectos' && (
              <ProjectListView
                onOpenCreateProject={() => setIsCreateProjectOpen(true)}
                onSelectTab={handleSelectTab}
              />
            )}

            {activeTab === 'datasets' && (
              <DatasetUploadView onSelectTab={handleSelectTab} />
            )}

            {activeTab === 'mapeo' && (
              <DatasetCompareMappingView onSelectTab={handleSelectTab} />
            )}

            {activeTab === 'limpieza' && (
              <DataCleaningView onSelectTab={handleSelectTab} />
            )}

            {activeTab === 'fusion' && (
              <DatasetFusionView onSelectTab={handleSelectTab} />
            )}

            {activeTab === 'dashboard' && (
              <AnalyticsDashboardView
                onSelectTab={handleSelectTab}
                onOpenReportModal={() => setIsReportModalOpen(true)}
              />
            )}

            {activeTab === 'oportunidades' && (
              <OpportunitiesView onSelectTab={handleSelectTab} />
            )}

            {activeTab === 'modulos_operativos' && (
              <OperationalModulesView />
            )}

            {activeTab === 'usuarios' && (
              <TeamPermissionsView />
            )}

            {activeTab === 'auditoria' && (
              <AuditLogsView />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onSuccess={handleProjectCreated}
      />

      <ReportExportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <AppContent />
      </ProjectProvider>
    </AuthProvider>
  );
}
