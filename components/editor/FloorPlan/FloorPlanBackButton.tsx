'use client';

import { useMemo } from 'react';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { generateBuildingAllocation } from '@/lib/editor/floorplan/layoutAlgorithm';
import { ROOM_TYPES } from '@/lib/editor/floorplan/roomTypes';
import type { RoomTypeId } from '@/lib/editor/floorplan/roomTypes';

export function FloorPlanBackButton() {
  const { floorPlanFloor, setFloorPlanFloor, getSelectedBuilding } = useBuildings();
  const selectedBuilding = getSelectedBuilding();

  const allocation = useMemo(() => {
    if (floorPlanFloor === null || !selectedBuilding) return null;
    return generateBuildingAllocation(selectedBuilding.spec);
  }, [floorPlanFloor, selectedBuilding]);

  if (floorPlanFloor === null || !allocation) return null;

  const floor = allocation.floors[floorPlanFloor];
  const roomCount = floor?.rooms.length ?? 0;

  // Build summary string
  const typeCounts: Partial<Record<RoomTypeId, number>> = {};
  for (const room of floor?.rooms ?? []) {
    typeCounts[room.roomTypeId] = (typeCounts[room.roomTypeId] ?? 0) + 1;
  }
  const summary = Object.entries(typeCounts)
    .map(([typeId, count]) => {
      const def = ROOM_TYPES.find((r) => r.id === typeId);
      return `${count} ${def?.shortLabel ?? typeId}`;
    })
    .join(', ');

  return (
    <div className="absolute left-4 top-4 z-20">
      <button
        onClick={() => setFloorPlanFloor(null)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-500">←</span>
        <div className="text-left">
          <div className="text-sm font-semibold text-gray-800">
            Floor {floorPlanFloor + 1}
          </div>
          <div className="text-xs text-gray-500">
            {roomCount > 0 ? summary : 'Empty floor'} · Click to return
          </div>
        </div>
      </button>
    </div>
  );
}
