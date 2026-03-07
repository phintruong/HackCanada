import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import type { BuildingSpecification } from '@/lib/editor/types/buildingSpec';
import { generateBuildingAllocation } from '@/lib/editor/floorplan/layoutAlgorithm';
import type { PlacedRoom } from '@/lib/editor/floorplan/layoutAlgorithm';

const WALL_HEIGHT = 2.5;
const WALL_THICKNESS = 0.15;

function OuterWalls({ width, depth, wallColor }: { width: number; depth: number; wallColor: string }) {
  const halfHeight = WALL_HEIGHT / 2;

  return (
    <group>
      {/* Front wall */}
      <mesh position={[width / 2, halfHeight, 0]}>
        <boxGeometry args={[width, WALL_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      {/* Back wall */}
      <mesh position={[width / 2, halfHeight, depth]}>
        <boxGeometry args={[width, WALL_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      {/* Left wall */}
      <mesh position={[0, halfHeight, depth / 2]}>
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, depth]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      {/* Right wall */}
      <mesh position={[width, halfHeight, depth / 2]}>
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, depth]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
    </group>
  );
}

function RoomCell({ room }: { room: PlacedRoom }) {
  const halfHeight = WALL_HEIGHT / 2;

  // Room-specific floor patch
  const floorPatch = (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[room.x + room.width / 2, 0.001, room.z + room.depth / 2]}
    >
      <planeGeometry args={[room.width, room.depth]} />
      <meshStandardMaterial color={room.floorColor} />
    </mesh>
  );

  // Room divider walls (right and bottom edges)
  const dividers = (
    <group>
      {/* Right wall */}
      <mesh position={[room.x + room.width + WALL_THICKNESS / 2, halfHeight, room.z + room.depth / 2]}>
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, room.depth]} />
        <meshStandardMaterial color={room.wallColor} opacity={0.7} transparent />
      </mesh>
      {/* Bottom wall */}
      <mesh position={[room.x + room.width / 2, halfHeight, room.z + room.depth + WALL_THICKNESS / 2]}>
        <boxGeometry args={[room.width, WALL_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={room.wallColor} opacity={0.7} transparent />
      </mesh>
    </group>
  );

  // Furniture
  const furnitureElements = room.furniture.map((f, fi) => (
    <mesh
      key={fi}
      position={[f.x + f.width / 2, f.height / 2, f.z + f.depth / 2]}
    >
      <boxGeometry args={[f.width, f.height, f.depth]} />
      <meshStandardMaterial color={f.color} />
    </mesh>
  ));

  // Room label
  const label = (
    <Text
      position={[room.x + room.width / 2, 0.02, room.z + room.depth / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={Math.min(0.5, room.width / 6)}
      color="#6b7280"
      anchorX="center"
      anchorY="middle"
    >
      {room.roomLabel}
    </Text>
  );

  return (
    <group>
      {floorPatch}
      {dividers}
      {furnitureElements}
      {label}
    </group>
  );
}

interface FloorPlanViewProps {
  floorIndex: number;
  spec: BuildingSpecification;
}

export function FloorPlanView({ floorIndex, spec }: FloorPlanViewProps) {
  const allocation = useMemo(() => generateBuildingAllocation(spec), [spec]);

  const floor = allocation.floors[floorIndex];
  if (!floor || floor.rooms.length === 0) {
    // Show empty floor with just outer walls
    return (
      <group position={[-allocation.floorWidth / 2, 0, -allocation.floorDepth / 2]}>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[allocation.floorWidth / 2, -0.01, allocation.floorDepth / 2]}
        >
          <planeGeometry args={[allocation.floorWidth, allocation.floorDepth]} />
          <meshStandardMaterial color="#f9fafb" />
        </mesh>
        <OuterWalls width={allocation.floorWidth} depth={allocation.floorDepth} wallColor="#94a3b8" />
        <Text
          position={[allocation.floorWidth / 2, 0.02, allocation.floorDepth / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={1}
          color="#d1d5db"
          anchorX="center"
          anchorY="middle"
        >
          Empty Floor
        </Text>
      </group>
    );
  }

  return (
    <group position={[-allocation.floorWidth / 2, 0, -allocation.floorDepth / 2]}>
      {/* Base floor plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[allocation.floorWidth / 2, -0.01, allocation.floorDepth / 2]}
      >
        <planeGeometry args={[allocation.floorWidth, allocation.floorDepth]} />
        <meshStandardMaterial color="#f9fafb" />
      </mesh>

      {/* Outer walls */}
      <OuterWalls width={allocation.floorWidth} depth={allocation.floorDepth} wallColor="#64748b" />

      {/* Rooms with colored floors, walls, furniture, and labels */}
      {floor.rooms.map((room, i) => (
        <RoomCell key={i} room={room} />
      ))}
    </group>
  );
}

// Export for use by sidebar to get allocation summary
export { generateBuildingAllocation };
