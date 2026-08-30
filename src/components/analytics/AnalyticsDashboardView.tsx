import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import {
  BarChart3,
  DollarSign,
  ShoppingCart,
  Award,
  Users,
  Sparkles,
  ArrowRight,
  Lightbulb,
  FileDown
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext.tsx';
import { TabKey } from '../../types/index.ts';
import { GeographicHeatmap } from './GeographicHeatmap.tsx';

interface AnalyticsDashboardViewProps {
  onSelectTab: (tab: TabKey) => void;
  onOpenReportModal: () => void;
}

// --- DATOS SIMULADOS PARA REVISION DE DISEÑO ---
// Reemplazar por la llamada real (api.getDashboard) cuando se apruebe el diseño.
const MOCK_DASHBOARD = {
  kpis: { ingresos_totales: 1284500, total_transacciones: 3120, ticket_promedio: 411.7, clientes_unicos: 842 },
  evolucion_temporal: [
    { fecha: '01 ago', monto_total: 32000 }, { fecha: '05 ago', monto_total: 41000 },
    { fecha: '10 ago', monto_total: 38500 }, { fecha: '15 ago', monto_total: 52000 },
    { fecha: '20 ago', monto_total: 47000 }, { fecha: '25 ago', monto_total: 61000 },
    { fecha: '30 ago', monto_total: 58500 }
  ],
  volumen_por_categoria: [
    { categoria: 'SUV', monto: 412000 }, { categoria: 'Sedán', monto: 268000 },
    { categoria: 'Pickup', monto: 331000 }, { categoria: 'Hatchback', monto: 141000 }
  ],
  ranking_productos: {
    mejores: [
      { nombre: 'Toyota Corolla Cross', monto: 218000 },
      { nombre: 'Toyota Hilux 4x4', monto: 196000 },
      { nombre: 'Toyota Yaris', monto: 121000 },
      { nombre: 'Toyota RAV4', monto: 98000 },
      { nombre: 'Toyota Camry', monto: 64000 }
    ]
  },
  insights_detectados: [
    { tipo: 'oportunidad', titulo: 'Pico de demanda en SUV', descripcion: 'Las ventas de SUV crecieron 22% en la última quincena frente al mes anterior.', accion_recomendada: 'Reforzar stock e incentivos comerciales en la categoría.' },
    { tipo: 'alerta', titulo: 'Caída en zona sur', descripcion: 'Moquegua registra 14% menos transacciones que el trimestre previo.', accion_recomendada: 'Revisar cobertura de asesores comerciales en la zona.' }
  ],
  estimacion_ventas: {
    confianza: '85%',
    proyeccion_proximo_periodo: 672400,
    tendencia_detectada: 'Tendencia ascendente sostenida en las últimas 4 semanas.',
    factores_clave: ['Estabilidad en el ticket promedio', 'SUV como categoría de mayor tracción']
  },
  datos_mapa_calor: {
    puntos: [
      { lat: -12.046, lng: -77.043, intensidad: 0.92, nombre: 'Lima Centro', metrica_valor: 412000 },
      { lat: -13.163, lng: -74.223, intensidad: 0.35, nombre: 'Ayacucho', metrica_valor: 58000 },
      { lat: -16.409, lng: -71.537, intensidad: 0.71, nombre: 'Arequipa', metrica_valor: 268000 },
      { lat: -8.111, lng: -79.028, intensidad: 0.54, nombre: 'Trujillo', metrica_valor: 189000 },
      { lat: -17.194, lng: -70.938, intensidad: 0.22, nombre: 'Moquegua', metrica_valor: 41000 },
      { lat: -3.749, lng: -73.253, intensidad: 0.18, nombre: 'Iquitos', metrica_valor: 29000 },
      { lat: -12.593, lng: -69.189, intensidad: 0.14, nombre: 'Madre de Dios', metrica_valor: 21000 },
      { lat: -6.777, lng: -79.842, intensidad: 0.63, nombre: 'Chiclayo', metrica_valor: 214000 }
    ]
  }
};

const COLOR_INK = '#10201d';
const COLOR_INK_SOFT = '#4b5d58';
const COLOR_LINE = '#d8dfdb';
const COLOR_PINE = '#1f6f5c';
const COLOR_STEEL = '#3b7a94';
const COLOR_CLAY = '#b5652e';
const MONO_FONT = "'IBM Plex Mono', monospace";

function ContourDivider() {
  return (
    <svg width="100%" height="16" viewBox="0 0 400 16" preserveAspectRatio="none" className="block">
      <path
        d="M0 9 Q 25 3 50 9 T 100 9 T 150 9 T 200 9 T 250 9 T 300 9 T 350 9 T 400 9"
        fill="none"
        stroke={COLOR_LINE}
        strokeWidth="1"
      />
    </svg>
  );
}

function ChartPanel({ title, children, height = 'h-72' }: { title: string; children: React.ReactNode; height?: string }) {
  return (
    <div className="bg-white border border-line">
      <div className="px-4 py-2.5 border-b border-line">
        <h3 className="font-body text-[11px] font-semibold text-ink tracking-wide">{title}</h3>
      </div>
      <div className={`p-4 ${height} w-full`}>{children}</div>
    </div>
  );
}

export const AnalyticsDashboardView: React.FC<AnalyticsDashboardViewProps> = ({
  onSelectTab,
  onOpenReportModal
}) => {
  const { activeProject } = useProject();
  // MOCK: usando datos simulados para revisión de diseño, sin llamada al backend.
  const [dashboardData] = useState<any>(MOCK_DASHBOARD);
  const [loading] = useState(false);

  const timeSeriesRef = useRef<HTMLDivElement>(null);
  const categoryPieRef = useRef<HTMLDivElement>(null);
  const rankingBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dashboardData) return;

    let timeChart: echarts.ECharts | null = null;
    if (timeSeriesRef.current && dashboardData.evolucion_temporal?.length > 0) {
      timeChart = echarts.init(timeSeriesRef.current);
      const dates = dashboardData.evolucion_temporal.map((d: any) => d.fecha);
      const values = dashboardData.evolucion_temporal.map((d: any) => d.monto_total);

      timeChart.setOption({
        textStyle: { fontFamily: MONO_FONT },
        tooltip: { trigger: 'axis', textStyle: { fontFamily: MONO_FONT, fontSize: 11 } },
        grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
        xAxis: {
          type: 'category',
          data: dates,
          boundaryGap: false,
          axisLine: { lineStyle: { color: COLOR_LINE } },
          axisLabel: { color: COLOR_INK_SOFT, fontSize: 10 }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: COLOR_LINE } },
          axisLabel: { color: COLOR_INK_SOFT, fontSize: 10 }
        },
        series: [
          {
            name: 'Monto acumulado',
            type: 'line',
            smooth: true,
            data: values,
            itemStyle: { color: COLOR_PINE },
            lineStyle: { width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(31, 111, 92, 0.18)' },
                { offset: 1, color: 'rgba(31, 111, 92, 0.01)' }
              ])
            }
          }
        ]
      });
    }

    let pieChart: echarts.ECharts | null = null;
    if (categoryPieRef.current && dashboardData.volumen_por_categoria?.length > 0) {
      pieChart = echarts.init(categoryPieRef.current);
      const pieData = dashboardData.volumen_por_categoria.map((c: any) => ({
        name: c.categoria,
        value: c.monto
      }));
      const palette = [COLOR_PINE, COLOR_STEEL, COLOR_CLAY, '#B8C4BE', '#4B5D58'];

      pieChart.setOption({
        textStyle: { fontFamily: MONO_FONT },
        color: palette,
        tooltip: { trigger: 'item', textStyle: { fontFamily: MONO_FONT, fontSize: 11 } },
        series: [
          {
            name: 'Categoría',
            type: 'pie',
            radius: ['45%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 0, borderColor: '#fff', borderWidth: 2 },
            label: { show: false, position: 'center' },
            data: pieData
          }
        ]
      });
    }

    let barChart: echarts.ECharts | null = null;
    if (rankingBarRef.current && dashboardData.ranking_productos?.mejores?.length > 0) {
      barChart = echarts.init(rankingBarRef.current);
      const items = [...dashboardData.ranking_productos.mejores].reverse();

      barChart.setOption({
        textStyle: { fontFamily: MONO_FONT },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, textStyle: { fontFamily: MONO_FONT, fontSize: 11 } },
        grid: { left: '3%', right: '6%', bottom: '3%', top: '5%', containLabel: true },
        xAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: COLOR_LINE } },
          axisLabel: { color: COLOR_INK_SOFT, fontSize: 10 }
        },
        yAxis: {
          type: 'category',
          data: items.map((i: any) => i.nombre),
          axisLabel: { width: 120, overflow: 'truncate', color: COLOR_INK, fontSize: 10 }
        },
        series: [
          {
            name: 'Monto total',
            type: 'bar',
            data: items.map((i: any) => i.monto),
            itemStyle: { color: COLOR_STEEL, borderRadius: 0 },
            barMaxWidth: 14
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

  const kpis = dashboardData?.kpis;

  const kpiItems = [
    {
      label: 'Ingresos / volumen total',
      value: `$${(kpis?.ingresos_totales || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: COLOR_PINE
    },
    {
      label: 'Transacciones / filas',
      value: (kpis?.total_transacciones || 0).toLocaleString(),
      icon: ShoppingCart,
      color: COLOR_STEEL
    },
    {
      label: 'Ticket / valor promedio',
      value: `$${(kpis?.ticket_promedio || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Award,
      color: COLOR_CLAY
    },
    {
      label: 'Entidades únicas',
      value: (kpis?.clientes_unicos || 0).toLocaleString(),
      icon: Users,
      color: COLOR_INK_SOFT
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-pine" />
            Dashboard de inteligencia y análisis ejecutivo
          </h1>
          <p className="font-body text-xs text-ink-soft mt-1">
            Proyecto: <strong className="text-ink">{activeProject?.nombre || 'Autoespar Toyota'}</strong> · Dominio:{' '}
            <span className="text-pine font-medium">{activeProject?.rubro || 'Concesionario Automotriz'}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={onOpenReportModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 border border-line-strong text-ink hover:bg-paper text-xs font-semibold transition-colors"
          >
            <FileDown className="w-4 h-4 text-pine" />
            <span>Exportar informe PDF</span>
          </button>

          <button
            onClick={() => onSelectTab('oportunidades')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-pine hover:bg-pine/90 text-white text-xs font-semibold transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            <span>Ver oportunidades</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ContourDivider />

      {loading ? (
        <div className="p-16 text-center font-body text-xs text-ink-soft">Calculando analíticas y proyecciones...</div>
      ) : !dashboardData ? (
        <div className="p-8 text-center font-body text-xs text-ink-soft bg-white border border-line">
          No hay datos procesados disponibles para este proyecto.
        </div>
      ) : (
        <div className="space-y-4">
          {/* KPI strip — one instrument panel instead of four separate cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-line">
            {kpiItems.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 ${idx > 0 ? 'sm:border-l border-line' : ''} ${
                  idx === 2 ? 'border-t sm:border-t-0 border-line' : ''
                } ${idx === 3 ? 'border-t sm:border-t-0 border-line' : ''}`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                  <p className="font-body text-[10px] font-semibold text-ink-soft tracking-wide">{item.label}</p>
                </div>
                <p className="font-display text-2xl font-semibold text-ink">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Automated Executive Insights */}
          {dashboardData.insights_detectados?.length > 0 && (
            <div className="bg-white border border-line border-l-[3px] border-l-pine p-4">
              <h3 className="font-body text-[11px] font-semibold text-ink flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-pine" />
                Hallazgos y patrones detectados por el motor inteligente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboardData.insights_detectados.map((ins: any, idx: number) => (
                  <div
                    key={idx}
                    className={`pl-3 border-l-2 ${
                      ins.tipo === 'alerta' ? 'border-rust' : 'border-pine'
                    }`}
                  >
                    <p className="font-body text-xs font-semibold text-ink">{ins.titulo}</p>
                    <p className="font-body text-[11px] text-ink-soft mt-0.5">{ins.descripcion}</p>
                    {ins.accion_recomendada && (
                      <p className="font-mono text-[10px] text-pine mt-1">→ {ins.accion_recomendada}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ChartPanel title="EVOLUCIÓN HISTÓRICA Y TENDENCIA TEMPORAL">
                <div ref={timeSeriesRef} className="h-full w-full" />
              </ChartPanel>
            </div>
            <ChartPanel title="DISTRIBUCIÓN POR CATEGORÍAS / CANALES">
              <div ref={categoryPieRef} className="h-full w-full" />
            </ChartPanel>
          </div>

          {/* Ranking & Sales Estimation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartPanel title="RANKING DE MEJORES PRODUCTOS / ZONAS" height="h-64">
              <div ref={rankingBarRef} className="h-full w-full" />
            </ChartPanel>

            <div className="bg-white border border-line p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-body text-[11px] font-semibold text-ink">
                  ESTIMACIÓN Y PROYECCIÓN DE VENTAS
                </h3>
                <span className="font-mono text-[10px] text-pine border border-pine px-1.5 py-0.5">
                  Confianza {dashboardData.estimacion_ventas?.confianza || '85%'}
                </span>
              </div>

              <p className="font-body text-xs text-ink-soft">Proyección estimada para el próximo período</p>
              <p className="font-display text-3xl font-semibold text-ink mt-1">
                ${(dashboardData.estimacion_ventas?.proyeccion_proximo_periodo || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="font-body text-xs text-ink-soft mt-2">
                {dashboardData.estimacion_ventas?.tendencia_detectada || 'Tendencia ascendente constante.'}
              </p>

              <div className="border-t border-line mt-4 pt-3 space-y-1.5">
                <p className="font-body text-xs font-semibold text-ink">Factores clave de impulso</p>
                {(dashboardData.estimacion_ventas?.factores_clave || [
                  'Estabilidad en el ticket promedio',
                  'Alineación de categorías de alto rendimiento'
                ]).map((f: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-clay mt-1.5 shrink-0" />
                    <span className="font-body text-[11px] text-ink">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Geographic Heatmap */}
          <GeographicHeatmap
            data={dashboardData.datos_mapa_calor?.puntos || []}
            rubro={activeProject?.rubro || 'Concesionario Automotriz'}
          />
        </div>
      )}
    </div>
  );
};
