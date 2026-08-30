import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Building,
  DollarSign,
  TrendingUp,
  Layers,
  Sparkles,
  Lightbulb
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext.tsx';
import { api } from '../../services/api.ts';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({ isOpen, onClose }) => {
  const { activeProject, activeProjectId } = useProject();
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen || !activeProjectId) return;

    const fetchReport = async () => {
      setLoading(true);
      try {
        const data = await api.getExecutiveReport(activeProjectId);
        setReportData(data);
      } catch (err) {
        console.error('Error fetching executive report:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [isOpen, activeProjectId]);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    if (!reportData || !activeProject) return;
    setDownloading(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = '#0284c7';
      const darkColor = '#0f172a';

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 38, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CRM DEXTER - INFORME EJECUTIVO', 14, 18);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`PROYECTO: ${activeProject.nombre.toUpperCase()} | DOMINIO: ${activeProject.rubro.toUpperCase()}`, 14, 26);
      doc.text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 32);

      // Section 1: Executive Summary
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Resumen de Consolidación y Métricas Clave', 14, 48);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`• Total de Datasets Consolidados: ${reportData.resumen_ejecutivo?.total_datasets_consolidados || 1}`, 16, 56);
      doc.text(`• Total de Registros Analizados: ${(reportData.resumen_ejecutivo?.total_filas_analizadas || 0).toLocaleString()}`, 16, 62);
      doc.text(`• Versión del Dataset Maestro: v${reportData.resumen_ejecutivo?.version_maestro || 1}.0 (Parquet Engine)`, 16, 68);

      // KPIs Box Grid
      const kpis = reportData.kpis || {};
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 74, 182, 30, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 74, 182, 30, 2, 2, 'S');

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('INGRESOS TOTALES', 20, 83);
      doc.text('TRANSACCIONES', 70, 83);
      doc.text('TICKET PROMEDIO', 120, 83);
      doc.text('ENTIDADES', 165, 83);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`$${(kpis.ingresos_totales || 0).toLocaleString()}`, 20, 93);
      doc.text(`${(kpis.total_transacciones || 0).toLocaleString()}`, 70, 93);
      doc.text(`$${(kpis.ticket_promedio || 0).toFixed(2)}`, 120, 93);
      doc.text(`${(kpis.clientes_unicos || 0).toLocaleString()}`, 165, 93);

      // Section 2: Key Insights
      let curY = 114;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('2. Hallazgos & Patrones Detectados', 14, curY);
      curY += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      if (reportData.insights && reportData.insights.length > 0) {
        reportData.insights.slice(0, 4).forEach((ins: any) => {
          doc.setFont('helvetica', 'bold');
          doc.text(`• ${ins.titulo}`, 16, curY);
          curY += 5;
          doc.setFont('helvetica', 'normal');
          doc.text(`  ${ins.descripcion}`, 16, curY);
          curY += 7;
        });
      } else {
        doc.text('No se detectaron anomalías críticas en el volumen analizado.', 16, curY);
        curY += 8;
      }

      // Section 3: Opportunities
      curY += 4;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('3. Oportunidades de Negocio & Acciones', 14, curY);
      curY += 8;

      if (reportData.oportunidades && reportData.oportunidades.length > 0) {
        reportData.oportunidades.slice(0, 3).forEach((op: any) => {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`[${op.estado.toUpperCase()}] ${op.titulo}`, 16, curY);
          curY += 5;
          doc.setFont('helvetica', 'normal');
          doc.text(`Evidencia: ${op.evidencia}`, 18, curY);
          curY += 5;
          if (op.impacto_estimado) {
            doc.text(`Impacto Estimado: ${op.impacto_estimado}`, 18, curY);
            curY += 5;
          }
          curY += 3;
        });
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('No hay oportunidades registradas formalmente aún.', 16, curY);
        curY += 8;
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Generado automáticamente por CRM DEXTER • Arquitectura de Procesamiento y Analítica Full-Stack', 14, 285);

      const fileName = `Informe_Ejecutivo_CRM_DEXTER_${activeProject.nombre.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error al generar PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <FileText className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Exportar Informe Ejecutivo</h3>
              <p className="text-xs text-slate-500">Documento PDF para gerencia y toma de decisiones</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Compilando resumen ejecutivo...</div>
        ) : !reportData ? (
          <div className="p-8 text-center text-xs text-slate-400">Error al cargar datos del informe.</div>
        ) : (
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Resumen del Contenido a Exportar
              </h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• <strong>Proyecto:</strong> {activeProject?.nombre} ({activeProject?.rubro})</li>
                <li>• <strong>Filas Consolidadas:</strong> {(reportData.resumen_ejecutivo?.total_filas_analizadas || 0).toLocaleString()}</li>
                <li>• <strong>Ingresos Totales:</strong> ${(reportData.kpis?.ingresos_totales || 0).toLocaleString()}</li>
                <li>• <strong>Insights Detectados:</strong> {reportData.insights?.length || 0} hallazgos</li>
                <li>• <strong>Oportunidades Registradas:</strong> {reportData.oportunidades?.length || 0} registradas</li>
              </ul>
            </div>

            <div className="p-4 bg-sky-50/50 border border-sky-100 rounded-xl text-xs text-sky-900">
              <p className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-sky-600" />
                Formato PDF de Alta Fidelidad
              </p>
              <p className="text-[11px] text-slate-600 mt-1">
                El informe se genera con vectorización de texto, membrete oficial de CRM DEXTER, desglose de métricas y cuadro resumen para presentación ejecutiva.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cerrar
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-sky-400" />
                <span>{downloading ? 'Generando PDF...' : 'Descargar Informe PDF'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
