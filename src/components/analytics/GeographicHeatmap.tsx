import React, { useState } from 'react';
import { MapPin, ZoomIn, ZoomOut, Navigation } from 'lucide-react';

interface GeographicHeatmapProps {
  data: {
    lat: number;
    lng: number;
    intensidad: number;
    departamento?: string;
    nombre?: string;
    metrica_valor?: number;
  }[];
  rubro: string;
}

// Sequential color scale (pine -> clay) instead of a red/orange/yellow "traffic light"
const heatColor = (t: number) => {
  const c1 = [31, 111, 92];
  const c2 = [181, 101, 46];
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * clamped);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * clamped);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * clamped);
  return `rgb(${r},${g},${b})`;
};

export const GeographicHeatmap: React.FC<GeographicHeatmapProps> = ({ data, rubro }) => {
  const [zoom, setZoom] = useState(1);
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 bg-paper border border-line text-center">
        <MapPin className="w-8 h-8 text-ink-soft mx-auto mb-2" />
        <h4 className="font-display text-xs font-semibold text-ink">Visualización geoespacial no disponible</h4>
        <p className="font-body text-xs text-ink-soft mt-1 max-w-md mx-auto">
          No se detectaron coordenadas geográficas (latitud / longitud) válidas en los datasets consolidados. Incluye columnas de coordenadas en tu archivo original para activar el mapa de calor.
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
    const y = 350 - ((lat - minLat) / latRange) * 300;
    return { x, y };
  };

  const maxMetric = Math.max(...data.map(d => d.metrica_valor || 0), 1);

  return (
    <div className="bg-white border border-line">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 p-5 pb-4 border-b border-line">
        <div>
          <h3 className="font-body text-[11px] font-semibold text-ink flex items-center gap-2">
            <Navigation className="w-3.5 h-3.5 text-pine" />
            Concentración territorial
          </h3>
          <p className="font-body text-[11px] text-ink-soft mt-0.5">
            {data.length} coordenadas analizadas · {rubro}
          </p>
        </div>

        <div className="flex items-center border border-line-strong">
          <button
            onClick={() => setZoom(z => Math.max(0.8, z - 0.2))}
            className="p-1.5 text-ink-soft hover:text-ink border-r border-line-strong"
            title="Reducir zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[10px] text-ink-soft px-2">{zoom.toFixed(1)}x</span>
          <button
            onClick={() => setZoom(z => Math.min(2.0, z + 0.2))}
            className="p-1.5 text-ink-soft hover:text-ink border-l border-line-strong"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Map + side list */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px]">
        <div className="relative bg-ink overflow-hidden h-[360px] flex items-center justify-center">
          <svg
            viewBox="0 0 800 400"
            className="w-full h-full cursor-crosshair transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          >
            <defs>
              <filter id="blurFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" />
              </filter>
            </defs>

            {data.map((pt, idx) => {
              const { x, y } = getSvgCoordinates(pt.lat, pt.lng);
              const radius = Math.max(16, (pt.intensidad || 0.5) * 32);
              return (
                <circle
                  key={`heat-${idx}`}
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={heatColor(pt.intensidad)}
                  filter="url(#blurFilter)"
                  opacity={0.35}
                />
              );
            })}

            {data.map((pt, idx) => {
              const { x, y } = getSvgCoordinates(pt.lat, pt.lng);
              const isSelected = selectedPoint === pt;
              return (
                <g key={`point-${idx}`} onClick={() => setSelectedPoint(pt)} className="cursor-pointer">
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 6 : 4}
                    fill={heatColor(pt.intensidad)}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    className="transition-all"
                  />
                </g>
              );
            })}
          </svg>

          {selectedPoint && (
            <div className="absolute top-3 right-3 bg-ink/95 border border-pine text-white px-3 py-2.5 text-xs max-w-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-body font-semibold truncate">
                  {selectedPoint.nombre || selectedPoint.departamento || 'Punto territorial'}
                </span>
                <button
                  onClick={() => setSelectedPoint(null)}
                  className="text-line-strong hover:text-white text-xs ml-2"
                >
                  ✕
                </button>
              </div>
              <p className="font-mono text-[10px] text-line-strong">
                {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
              </p>
              <p className="font-mono text-[10px] text-line-strong mt-0.5">
                Intensidad: <span className="text-white">{Math.round(selectedPoint.intensidad * 100)}%</span>
              </p>
              {selectedPoint.metrica_valor !== undefined && (
                <p className="font-mono text-[10px] text-line-strong mt-0.5">
                  Valor: <span className="text-white">{Number(selectedPoint.metrica_valor).toLocaleString()}</span>
                </p>
              )}
            </div>
          )}

          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <span className="font-mono text-[9px] text-line-strong">BAJA</span>
            <div
              className="w-24 h-1.5"
              style={{ background: `linear-gradient(to right, ${heatColor(0)}, ${heatColor(1)})` }}
            />
            <span className="font-mono text-[9px] text-line-strong">ALTA</span>
          </div>
        </div>

        <div className="border-t lg:border-t-0 lg:border-l border-line max-h-[360px] overflow-y-auto custom-scrollbar">
          {[...data]
            .sort((a, b) => b.intensidad - a.intensidad)
            .map((pt, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPoint(pt)}
                className={`w-full text-left px-3.5 py-2.5 border-b border-line transition-colors ${
                  selectedPoint === pt ? 'bg-pine-light' : 'hover:bg-paper'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-body text-[11px] font-medium text-ink truncate">
                    {pt.nombre || pt.departamento || `Punto ${idx + 1}`}
                  </span>
                  <div
                    className="w-2 h-2 shrink-0"
                    style={{ background: heatColor(pt.intensidad) }}
                  />
                </div>
                {pt.metrica_valor !== undefined && (
                  <span className="font-mono text-[10px] text-ink-soft">
                    {Number(pt.metrica_valor).toLocaleString()}
                  </span>
                )}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};
