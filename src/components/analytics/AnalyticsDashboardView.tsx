import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Award,
  Sparkles,
  ArrowRight,
  Lightbulb,
  FileDown,
  Layers,
  MapPin,
  Calendar
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext.tsx';
import { api } from '../../services/api.ts';
import { TabKey } from '../../types/index.ts';
import { GeographicHeatmap } from './GeographicHeatmap.tsx';
import { LockedStateBanner } from '../common/LockedStateBanner.tsx';

interface AnalyticsDashboardViewProps {
  onSelectTab: (tab: TabKey) => void;
  onOpenReportModal: () => void;
}

export const AnalyticsDashboardView: React.FC<AnalyticsDashboardViewProps> = ({
  onSelectTab,
  onOpenReportModal
}) => {
  const { activeProject, activeProjectId, flowStatus } = useProject();
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Chart DOM refs
  const timeSeriesRef = useRef<HTMLDivElement>(null);
  const categoryPieRef = useRef<HTMLDivElement>(null);
  const rankingBarRef = useRef<HTMLDivElement>(null);

  const fetchDashboard = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const data = await api.getDashboard(activeProjectId);
      setDashboardData(data);
    } catch (err: any) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeProjectId]);

  // Render Apache ECharts
  useEffect(() => {
    if (!dashboardData) return;

    // 1. Time Series Chart
    let timeChart: echarts.ECharts | null = null;
    if (timeSeriesRef.current && dashboardData.evolucion_temporal?.length > 0) {
      timeChart = echarts.init(timeSeriesRef.current);
      const dates = dashboardData.evolucion_temporal.map((d: any) => d.fecha);
      const values = dashboardData.evolucion_temporal.map((d: any) => d.monto_total);
      const counts = dashboardData.evolucion_temporal.map((d: any) => d.total_transacciones);

      timeChart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
        xAxis: { type: 'category', data: dates, boundaryGap: false },
        yAxis: [
          { type: 'value', name: 'Monto ($)', splitLine: { lineStyle: { color: '#f1f5f9' } } },
          { type: 'value', name: 'Registros', show: false }
        ],
        series: [
          {
            name: 'Monto Acumulado',
            type: 'line',
            smooth: true,
            data: values,
            itemStyle: { color: '#0284c7' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(2, 132, 199, 0.35)' },
                { offset: 1, color: 'rgba(2, 132, 199, 0.02)' }
              ])
            }
          }
        ]
      });
    }

    // 2. Category Pie / Donut
    let pieChart: echarts.ECharts | null = null;
    if (categoryPieRef.current && dashboardData.volumen_por_categoria?.length > 0) {
      pieChart = echarts.init(categoryPieRef.current);
      const pieData = dashboardData.volumen_por_categoria.map((c: any) => ({
        name: c.categoria,
        value: c.monto
      }));

      pieChart.setOption({
        tooltip: { trigger: 'item' },
        series: [
          {
            name: 'Categoría',
            type: 'pie',
            radius: ['45%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
            label: { show: false, position: 'center' },
            data: pieData
          }
        ]
      });
    }

    // 3. Ranking Horizontal Bar
    let barChart: echarts.ECharts | null = null;
    if (rankingBarRef.current && dashboardData.ranking_productos?.mejores?.length > 0) {
      barChart = echarts.init(rankingBarRef.current);
      const items = [...dashboardData.ranking_productos.mejores].reverse();

      barChart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '6%', bottom: '3%', top: '5%', containLabel: true },
        xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f1f5f9' } } },
        yAxis: {
          type: 'category',
          data: items.map((i: any) => i.nombre),
          axisLabel: { width: 120, overflow: 'truncate' }
        },
        series: [
          {
            name: 'Monto Total',
            type: 'bar',
            data: items.map((i: any) => i.monto),
            itemStyle: {
              color: '#38bdf8',
              borderRadius: [0, 4, 4, 0]
            }
          }
        ]
      });
    }

    const handleResize = () => {
      timeChart?.resize();
      pieChart?.resize();
      barChart?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      timeChart?.dispose();
      pieChart?.dispose();
      barChart?.dispose();
    };
  }, [dashboardData]);

  if (!activeProject) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-sm text-slate-500">Selecciona un proyecto para visualizar analíticas.</p>
      </div>
    );
  }

  if (!flowStatus?.hasDatasets) {
    return (
      <LockedStateBanner
        title="Dashboard Analítico Bloqueado"
        description="Para generar métricas y dashboards ejecutivos, primero debes cargar datasets en el proyecto."
        targetTab="datasets"
        actionText="Cargar Datasets"
        onNavigate={onSelectTab}
        prerequisites={[
          { text: 'Cargar Datasets', done: false },
          { text: 'Mapeo Semántico', done: false },
          { text: 'Fusión Master Parquet', done: false }
        ]}
      />
    );
  }

  const kpis = dashboardData?.kpis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-600" />
            Dashboard de Inteligencia & Análisis Ejecutivo
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Proyecto: <strong className="text-slate-800">{activeProject.nombre}</strong> • Dominio:{' '}
            <span className="uppercase font-bold text-sky-600">{activeProject.rubro}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={onOpenReportModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <FileDown className="w-4 h-4 text-sky-400" />
            <span>Exportar Informe PDF</span>
          </button>

          <button
            onClick={() => onSelectTab('oportunidades')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            <span>Ver Oportunidades</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400">Calculando analíticas y proyecciones...</div>
      ) : !dashboardData ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          No hay datos procesados disponibles para este proyecto.
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ingresos / Volumen Total</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  ${(kpis?.ingresos_totales || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  <span>Consolidado general</span>
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Transacciones / Filas</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {(kpis?.total_transacciones || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Registros procesados</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ticket / Valor Promedio</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  ${(kpis?.ticket_promedio || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Por transacción</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Entidades Únicas</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {(kpis?.clientes_unicos || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Clientes / Zonas</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Automated Executive Insights */}
          {dashboardData.insights_detectados?.length > 0 && (
            <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-xl p-5 shadow-2xs">
              <h3 className="text-xs font-bold text-sky-950 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-sky-600" />
                Hallazgos & Patrones Detectados por el Motor Inteligente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dashboardData.insights_detectados.map((ins: any, idx: number) => (
                  <div key={idx} className="bg-white/80 backdrop-blur-xs p-3.5 rounded-lg border border-sky-100 text-xs text-slate-700">
                    <p className="font-bold text-slate-900">{ins.titulo}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{ins.descripcion}</p>
                    {ins.accion_recomendada && (
                      <p className="text-[10px] text-sky-700 font-semibold mt-1">
                        💡 Recomendación: {ins.accion_recomendada}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Time Trend */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Evolución Histórica & Tendencia Temporal
              </h3>
              <div ref={timeSeriesRef} className="h-72 w-full" />
            </div>

            {/* Right Col: Category Donut */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Distribución por Categorías / Canales
              </h3>
              <div ref={categoryPieRef} className="h-72 w-full" />
            </div>
          </div>

          {/* Ranking & Sales Estimation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Ranking de Mejores Productos / Zonas
              </h3>
              <div ref={rankingBarRef} className="h-64 w-full" />
            </div>

            {/* Sales Estimation Box */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>Estimación & Proyección de Ventas</span>
                <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  Confianza {dashboardData.estimacion_ventas?.confianza || '85%'}
                </span>
              </h3>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500">Proyección Estimada para el Próximo Período</p>
                <p className="text-3xl font-black text-slate-900 mt-1">
                  ${(dashboardData.estimacion_ventas?.proyeccion_proximo_periodo || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-slate-600 mt-2">
                  {dashboardData.estimacion_ventas?.tendencia_detectada || 'Tendencia ascendente constante.'}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <p className="font-semibold text-slate-700">Factores Clave de Impulso:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-1 text-[11px]">
                  {(dashboardData.estimacion_ventas?.factores_clave || [
                    'Estabilidad en el ticket promedio',
                    'Alineación de categorías de alto rendimiento'
                  ]).map((f: string, idx: number) => (
                    <li key={idx}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Geographic Heatmap */}
          <GeographicHeatmap
            data={dashboardData.datos_mapa_calor || []}
            rubro={activeProject.rubro}
          />
        </>
      )}
    </div>
  );
};
