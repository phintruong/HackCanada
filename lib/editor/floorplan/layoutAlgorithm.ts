import type { BuildingSpecification } from '@/lib/editor/types/buildingSpec';
import type { RoomTypeDefinition, RoomTypeId } from './roomTypes';
import { ROOM_TYPES } from './roomTypes';

export interface PlacedFurniture {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  label: string;
}

export interface PlacedRoom {
  x: number;
  z: number;
  width: number;
  depth: number;
  roomTypeId: RoomTypeId;
  roomLabel: string;       // e.g. "Patient #3"
  floorColor: string;
  wallColor: string;
  furniture: PlacedFurniture[];
}

export interface FloorLayout {
  floorIndex: number;
  rooms: PlacedRoom[];
}

export interface BuildingAllocation {
  floors: FloorLayout[];
  floorWidth: number;
  floorDepth: number;
  wallThickness: number;
}

const WALL_THICKNESS = 0.15;
const CORRIDOR_WIDTH = 2.0;

interface RoomRequest {
  roomDef: RoomTypeDefinition;
  remaining: number;
  countersPlaced: number; // tracks how many have been placed so far (for labeling)
}

/**
 * Packs rooms into a single floor using row-based strip packing.
 * Places rooms in two zones (above and below a central corridor).
 * Returns placed rooms and mutates the request's remaining count.
 */
function packFloor(
  floorIndex: number,
  floorWidth: number,
  floorDepth: number,
  requests: RoomRequest[],
  isGroundFloor: boolean
): PlacedRoom[] {
  const placed: PlacedRoom[] = [];

  // Usable area: inside outer walls
  const usableWidth = floorWidth - 2 * WALL_THICKNESS;
  const usableDepth = floorDepth - 2 * WALL_THICKNESS;

  // Split into two zones with a central corridor
  const corridorZ = WALL_THICKNESS + (usableDepth - CORRIDOR_WIDTH) / 2;
  const zones = [
    { startZ: WALL_THICKNESS, maxDepth: (usableDepth - CORRIDOR_WIDTH) / 2 },
    { startZ: corridorZ + CORRIDOR_WIDTH, maxDepth: (usableDepth - CORRIDOR_WIDTH) / 2 },
  ];

  for (const zone of zones) {
    let cursorX = WALL_THICKNESS;
    let cursorZ = zone.startZ;
    let rowMaxDepth = 0;

    // Iterate through room types in priority order (already sorted)
    for (const req of requests) {
      // Skip ground-floor-only rooms on upper floors
      if (req.roomDef.groundFloorOnly && !isGroundFloor) continue;
      // Skip non-ground-floor-only rooms if we're on ground floor and still have ground-only rooms to place
      // (No, we should place all eligible types - priority ordering handles this)

      while (req.remaining > 0) {
        const roomW = req.roomDef.unitWidth;
        const roomD = req.roomDef.unitDepth;

        // Check if room fits in current row
        if (cursorX + roomW + WALL_THICKNESS > floorWidth - WALL_THICKNESS) {
          // Move to next row
          cursorX = WALL_THICKNESS;
          cursorZ += rowMaxDepth + WALL_THICKNESS;
          rowMaxDepth = 0;
        }

        // Check if room fits in this zone vertically
        if (cursorZ + roomD > zone.startZ + zone.maxDepth) {
          break; // Zone is full for this room type, try next zone
        }

        // Check if room fits horizontally
        if (cursorX + roomW + WALL_THICKNESS > floorWidth - WALL_THICKNESS) {
          break; // Can't fit even at start of row
        }

        // Place the room
        const roomX = cursorX;
        const roomZ = cursorZ;

        req.countersPlaced++;
        const roomLabel = `${req.roomDef.shortLabel} #${req.countersPlaced}`;

        const furniture: PlacedFurniture[] = req.roomDef.furniture.map((item) => ({
          x: roomX + item.relativeX,
          z: roomZ + item.relativeZ,
          width: item.width,
          depth: item.depth,
          height: item.height,
          color: item.color,
          label: item.label,
        }));

        placed.push({
          x: roomX,
          z: roomZ,
          width: roomW,
          depth: roomD,
          roomTypeId: req.roomDef.id,
          roomLabel,
          floorColor: req.roomDef.floorColor,
          wallColor: req.roomDef.wallColor,
          furniture,
        });

        req.remaining--;
        cursorX += roomW + WALL_THICKNESS;
        rowMaxDepth = Math.max(rowMaxDepth, roomD);
      }
    }
  }

  return placed;
}

/**
 * Generates a complete building allocation across all floors.
 * Fills bottom floors first. Ground-floor-only rooms (ambulance, ER, trauma)
 * are placed on floor 0 only. Rooms are packed by priority order.
 */
export function generateBuildingAllocation(
  spec: BuildingSpecification
): BuildingAllocation {
  const floorWidth = spec.width;
  const floorDepth = spec.depth;
  const numberOfFloors = spec.numberOfFloors;

  // Build room requests sorted by priority
  const requests: RoomRequest[] = ROOM_TYPES
    .filter((rt) => rt.getCount(spec) > 0)
    .sort((a, b) => a.priority - b.priority)
    .map((rt) => ({
      roomDef: rt,
      remaining: rt.getCount(spec),
      countersPlaced: 0,
    }));

  const floors: FloorLayout[] = [];

  for (let floorIndex = 0; floorIndex < numberOfFloors; floorIndex++) {
    const isGroundFloor = floorIndex === 0;
    const rooms = packFloor(floorIndex, floorWidth, floorDepth, requests, isGroundFloor);

    floors.push({ floorIndex, rooms });
  }

  return {
    floors,
    floorWidth,
    floorDepth,
    wallThickness: WALL_THICKNESS,
  };
}
