import React, { useState } from 'react';
import { MapPin, Layers, ZoomIn, ZoomOut, AlertCircle, Sparkles, Navigation } from 'lucide-react';

interface GeographicHeatmapProps {
  data: {
    lat: number;
    lng: number;
    intensidad: number;
    region?: string;
    nombre?: string;
    valor?: number;
  }[];
  rubro: string;
}

export const GeographicHeatmap: React.FC<GeographicHeatmapProps> = ({ data, rubro }) => {
  const [metric, setMetric] = useState<'intensidad' | 'valor'>('intensidad');
  const [zoom, setZoom] = useState(1);
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center">
        <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <h4 className="text-xs font-bold text-slate-800">Visualización Geoespacial No Disponible</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          No se detectaron coordenadas geográficas (latitud / longitud) válidas en los datasets consolidados. Para activar el mapa de calor, incluye columnas de coordenadas en tu archivo original.
        </p>
      </div>
    );
  }

  // Calculate bounds to normalize coordinates to SVG canvas space (width 800, height 400)
  const lats = data.map(d => d.lat);
  const lngs = data.map(d => d.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;

  const getSvgCoordinates = (lat: number, lng: number) => {
    const x = ((lng - minLng) / lngRange) * 700 + 50;
    // Invert Y axis for map orientation
    const y = 350 - ((lat - minLat) / latRange) * 300;
    return { x, y };
  };

  const getHeatColor = (intensity: number) => {
    if (intensity >= 0.8) return 'rgba(239, 68, 68, 0.8)'; // Red
    if (intensity >= 0.6) return 'rgba(249, 115, 22, 0.75)'; // Orange
    if (intensity >= 0.4) return 'rgba(234, 179, 8, 0.7)'; // Yellow
    if (intensity >= 0.2) return 'rgba(56, 189, 248, 0.65)'; // Sky
    return 'rgba(99, 102, 241, 0.5)'; // Indigo
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Navigation className="w-4 h-4 text-sky-600" />
            Mapa de Calor Geoespacial & Concentración Territorial
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Distribución de intensidad basada en {data.length} coordenadas analizadas
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px]">
            <button
              onClick={() => setMetric('intensidad')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                metric === 'intensidad' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500'
              }`}
            >
              Intensidad de Densidad
            </button>
            <button
              onClick={() => setMetric('valor')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                metric === 'valor' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500'
              }`}
            >
              Volumen / Monto
            </button>
          </div>

          <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={() => setZoom(z => Math.max(0.8, z - 0.2))}
              className="p-1 text-slate-500 hover:text-slate-800"
              title="Reducir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-500 px-1">{zoom.toFixed(1)}x</span>
            <button
              onClick={() => setZoom(z => Math.min(2.0, z + 0.2))}
              className="p-1 text-slate-500 hover:text-slate-800"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Map Canvas */}
      <div className="relative border border-slate-200 rounded-xl bg-slate-950 overflow-hidden h-[360px] flex items-center justify-center">
        {/* Subtle Grid Background */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        <svg
          viewBox="0 0 800 400"
          className="w-full h-full cursor-crosshair transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Radial Heat Gradient Defs */}
          <defs>
            <filter id="blurFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          {/* Render Heat Clusters (Blurred Glow) */}
          {data.map((pt, idx) => {
            const { x, y } = getSvgCoordinates(pt.lat, pt.lng);
            const radius = Math.max(16, (pt.intensidad || 0.5) * 32);
            return (
              <circle
                key={`heat-${idx}`}
                cx={x}
                cy={y}
                r={radius}
                fill={getHeatColor(pt.intensidad)}
                filter="url(#blurFilter)"
                opacity={0.65}
              />
            );
          })}

          {/* Render Point Centers (Crisp Pins) */}
          {data.map((pt, idx) => {
            const { x, y } = getSvgCoordinates(pt.lat, pt.lng);
            const isHovered = selectedPoint === pt;

            return (
              <g
                key={`point-${idx}`}
                onClick={() => setSelectedPoint(pt)}
                className="cursor-pointer group"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke={getHeatColor(pt.intensidad)}
                  strokeWidth={2}
                  className="transition-all"
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip if Point Clicked */}
        {selectedPoint && (
          <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white p-3 rounded-lg text-xs shadow-xl max-w-xs animate-in fade-in">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sky-400 truncate">{selectedPoint.nombre || selectedPoint.region || 'Punto Territorial'}</span>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-slate-400 hover:text-white text-xs ml-2"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-300">
              Coordenadas: {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
            </p>
            <p className="text-[11px] text-slate-300">
              Intensidad: <strong className="text-emerald-400">{Math.round(selectedPoint.intensidad * 100)}%</strong>
            </p>
            {selectedPoint.valor !== undefined && (
              <p className="text-[11px] text-slate-300">
                Valor Métrico: <strong className="text-white">{Number(selectedPoint.valor).toLocaleString()}</strong>
              </p>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-md px-3 py-1.5 flex items-center space-x-2 text-[10px] text-slate-300">
          <span>Baja</span>
          <div className="w-24 h-2 rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 via-yellow-400 to-red-500" />
          <span>Alta Concentración</span>
        </div>
      </div>
    </div>
  );
};
