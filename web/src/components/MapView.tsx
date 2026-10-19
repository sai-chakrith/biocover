'use client';
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, CircleMarker, Pane, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface CellData {
  id: string;
  bounds: [[number, number], [number, number]];
  speciesCount: number;
  selected: boolean;
  species?: string[];
}

interface MapViewProps {
  cells?: CellData[];
  selectedCellIds?: string[];
}

function FitSelection({ cells, selectedCellIds }: Required<MapViewProps>) {
  const map = useMap();
  useEffect(() => {
    const chosen = cells.filter(c => selectedCellIds.includes(c.id));
    if (chosen.length) map.fitBounds(chosen.flatMap(c => c.bounds), { padding: [25, 25], maxZoom: 11 });
  }, [map, cells, selectedCellIds]);
  return null;
}

export default function MapView({ cells = [], selectedCellIds = [] }: MapViewProps) {
  const selectedSet = new Set(selectedCellIds);
  const hasSelection = selectedSet.size > 0 || cells.some(cell => cell.selected);

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
      <MapContainer center={[14.5, 76.0]} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={true}>
        <FitSelection cells={cells} selectedCellIds={selectedCellIds} />
        <Pane name="selected-cells" style={{ zIndex: 410 }} />
        <Pane name="selected-site-dots" style={{ zIndex: 420, pointerEvents: 'none' }} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {cells.map((cell) => {
          const isSelected = selectedSet.size > 0 ? selectedSet.has(cell.id) : cell.selected;
          return (
            <React.Fragment key={cell.id}>
            <Rectangle
              pane={isSelected ? 'selected-cells' : 'overlayPane'}
              bounds={cell.bounds}
              pathOptions={{
                color: isSelected ? '#9a3412' : '#14705a',
                weight: isSelected ? 3 : 1,
                opacity: isSelected ? 1 : hasSelection ? 0.2 : 0.5,
                fillColor: isSelected ? '#ff7800' : '#14705a',
                fillOpacity: isSelected ? 0.75 : hasSelection ? 0.025 : Math.min(0.05 + (cell.speciesCount / 60) * 0.3, 0.35),
              }}
            >
              <Popup>
                <div style={{ color: '#333', minWidth: '140px' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{cell.id}</strong><br />
                  Species: {cell.speciesCount}<br />
                  Centre: {(cell.bounds[0][0] + 0.05).toFixed(2)}°N, {(cell.bounds[0][1] + 0.05).toFixed(2)}°E<br />
                  {isSelected && <span style={{ color: '#9a3412', fontWeight: 600 }}>✓ Selected Reserve</span>}
                  {cell.species && cell.species.length > 0 && (
                    <div style={{ marginTop: '4px', fontSize: '0.75rem', maxHeight: '80px', overflowY: 'auto' }}>
                      {cell.species.slice(0, 5).map(s => <div key={s} style={{ fontStyle: 'italic' }}>{s}</div>)}
                      {cell.species.length > 5 && <div>...and {cell.species.length - 5} more</div>}
                    </div>
                  )}
                </div>
              </Popup>
            </Rectangle>
            {isSelected && <CircleMarker
              pane="selected-site-dots"
              center={[(cell.bounds[0][0] + cell.bounds[1][0]) / 2, (cell.bounds[0][1] + cell.bounds[1][1]) / 2]}
              radius={5}
              interactive={false}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#16a34a', fillOpacity: 1, opacity: 1 }}
            />}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
