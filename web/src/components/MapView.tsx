'use client';
import React, { useEffect } from 'react';
import { point } from 'leaflet';
import IUCNBadge from '@/components/IUCNBadge';
import type { CellDetail } from '@/lib/types';
import { MapContainer, TileLayer, Rectangle, Polygon, CircleMarker, Pane, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Includes every candidate cell in the supplied dataset, with a small margin.
const STUDY_BOUNDS: [[number, number], [number, number]] = [[8, 73], [18, 78]];
const PAN_BOUNDS: [[number, number], [number, number]] = [[7.7, 72.7], [18.3, 78.3]];
const STUDY_MASK: [number, number][][] = [
  [[-85, -180], [-85, 180], [85, 180], [85, -180]],
  [[8, 73], [18, 73], [18, 78], [8, 78]],
];

function StudyAreaControls() {
  const map = useMap();
  useEffect(() => {
    function updateMinimumZoom() {
      map.setMinZoom(0);
      map.setMinZoom(map.getBoundsZoom(STUDY_BOUNDS, false, point(24, 24)));
    }
    updateMinimumZoom();
    map.on('resize', updateMinimumZoom);
    return () => { map.off('resize', updateMinimumZoom); };
  }, [map]);
  return <button type="button" className="map-reset-view" aria-label="Show full study area"
    onClick={event => { event.stopPropagation(); map.fitBounds(STUDY_BOUNDS, { padding: [12, 12] }); }}>Reset view</button>;
}

interface CellData {
  id: string;
  bounds: [[number, number], [number, number]];
  speciesCount: number;
  selected: boolean;
  species?: CellDetail['species'];
}

interface MapViewProps {
  cells?: CellData[];
  selectedCellIds?: string[];
  siteSummaries?: Record<string, { threatenedCount: number; uniqueCount: number }>;
  onExplainSite?: (cellId: string) => void;
}

function FitSelection({ cells, selectedCellIds }: { cells: CellData[]; selectedCellIds: string[] }) {
  const map = useMap();
  useEffect(() => {
    const chosen = cells.filter(c => selectedCellIds.includes(c.id));
    if (chosen.length) map.fitBounds(chosen.flatMap(c => c.bounds), { padding: [25, 25], maxZoom: 11 });
  }, [map, cells, selectedCellIds]);
  return null;
}

export default function MapView({ cells = [], selectedCellIds = [], siteSummaries = {}, onExplainSite }: MapViewProps) {
  const selectedSet = new Set(selectedCellIds);
  const isCellSelected = (cell: CellData) => selectedSet.size > 0 ? selectedSet.has(cell.id) : cell.selected;
  const selectedCells = cells.filter(isCellSelected);
  const hasSelection = selectedCells.length > 0;

  return (
    <div className="conservation-map" style={{ position: 'relative', height: '100%', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
      <MapContainer bounds={STUDY_BOUNDS} boundsOptions={{ padding: [12, 12] }} maxBounds={PAN_BOUNDS}
        maxBoundsViscosity={1} maxZoom={16} style={{ height: '100%', width: '100%' }} zoomControl={true}>
        <StudyAreaControls />
        <FitSelection cells={cells} selectedCellIds={selectedCellIds} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          bounds={STUDY_BOUNDS}
          noWrap={true}
        />
        <Pane name="study-area-mask" style={{ zIndex: 410, pointerEvents: 'none' }}>
          <Polygon positions={STUDY_MASK} interactive={false}
            pathOptions={{ stroke: false, fillColor: 'var(--bg-primary)', fillOpacity: 1 }} />
        </Pane>
        <Pane name="selected-sites" style={{ zIndex: 450 }} />
        <Pane name="selected-site-markers" style={{ zIndex: 460, pointerEvents: 'none' }}>
          {selectedCells.map(cell => (
            <CircleMarker
              key={cell.id}
              center={[(cell.bounds[0][0] + cell.bounds[1][0]) / 2, (cell.bounds[0][1] + cell.bounds[1][1]) / 2]}
              radius={5}
              interactive={false}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#9a3412', fillOpacity: 1 }}
            />
          ))}
        </Pane>
        {cells.map((cell) => {
          const isSelected = isCellSelected(cell);
          return (
            <Rectangle
              key={`${cell.id}-${isSelected}`}
              pane={isSelected ? 'selected-sites' : 'overlayPane'}
              bounds={cell.bounds}
              pathOptions={{
                className: isSelected ? 'selected-site-cell' : undefined,
                color: isSelected ? '#9a3412' : '#14705a',
                opacity: isSelected ? 1 : hasSelection ? 0.25 : 0.5,
                weight: isSelected ? 3 : 1,
                fillColor: isSelected ? '#ff922b' : '#14705a',
                fillOpacity: isSelected ? 0.75 : hasSelection ? 0.04 : Math.min(0.05 + (cell.speciesCount / 60) * 0.3, 0.35),
              }}
            >
              <Popup>
                <div style={{ color: 'var(--text-primary)', minWidth: '140px' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{cell.id}</strong><br />
                  Species: {cell.speciesCount}<br />
                  {isSelected && siteSummaries[cell.id] && <div className="map-site-contribution">
                    <div>{siteSummaries[cell.id].threatenedCount} threatened species (CR / EN / VU)</div>
                    <div>{siteSummaries[cell.id].uniqueCount} species unique within selected network</div>
                    {onExplainSite && <button type="button" className="site-explain-button" onClick={() => onExplainSite(cell.id)}>Why this site?</button>}
                  </div>}
                  Centre: {(cell.bounds[0][0] + 0.05).toFixed(2)}°N, {(cell.bounds[0][1] + 0.05).toFixed(2)}°E<br />
                  {isSelected && <span style={{ color: '#9a3412', fontWeight: 700 }}>✓ Selected Reserve</span>}
                  {cell.species && cell.species.length > 0 && (
                    <div style={{ marginTop: '4px', fontSize: '0.75rem', maxHeight: '80px', overflowY: 'auto' }}>
                      {cell.species.slice(0, 5).map(s => <div key={s.name} className="map-species-row"><i>{s.name}</i> <IUCNBadge category={s.iucnCategory} /></div>)}
                      {cell.species.length > 5 && <div>...and {cell.species.length - 5} more</div>}
                    </div>
                  )}
                </div>
              </Popup>
            </Rectangle>
          );
        })}
      </MapContainer>
      <div className="map-legend" aria-label="Map legend">
        <div><span className="map-legend-swatch map-legend-selected" aria-hidden="true" />Selected reserve{hasSelection ? ` (${selectedCells.length})` : ''}</div>
        <div><span className="map-legend-swatch map-legend-candidate" aria-hidden="true" />Candidate cell</div>
      </div>
    </div>
  );
}
