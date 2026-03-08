'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface GLBModelLayerProps {
  map: mapboxgl.Map | null;
  id: string;
  glbPath: string;
  lngLat: { lng: number; lat: number };
  rotation?: number;
  targetSizeMeters?: number;
}

/**
 * Queries terrain elevation at a given lngLat.
 * Falls back to 0 if terrain is not available.
 */
function getElevation(map: mapboxgl.Map, lng: number, lat: number): number {
  try {
    // queryTerrainElevation is available when terrain is enabled
    const el = (map as any).queryTerrainElevation?.({ lng, lat });
    if (typeof el === 'number' && !isNaN(el)) return el;
  } catch { /* ignore */ }
  return 0;
}

export default function GLBModelLayer({ map, id, glbPath, lngLat, rotation = 0, targetSizeMeters = 50 }: GLBModelLayerProps) {
  const layerId = `glb-model-${id}`;
  const addedRef = useRef(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const transformRef = useRef({
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    scale: 1e-6,
    rotation: 0,
  });

  // ---------- 1. Create the custom layer ONCE ----------
  useEffect(() => {
    if (!map) return;
    if (addedRef.current && map.getLayer(layerId)) return;

    const camera = new THREE.Camera();
    cameraRef.current = camera;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Strong lighting so the model is clearly visible
    scene.add(new THREE.DirectionalLight(0xffffff, 1.5).translateZ(100).translateY(-70));
    scene.add(new THREE.DirectionalLight(0xffffff, 1.0).translateZ(100).translateY(70));
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const lid = layerId;

    const customLayer: mapboxgl.CustomLayerInterface = {
      id: lid,
      type: 'custom',
      renderingMode: '3d',

      onAdd(_map: mapboxgl.Map, gl: WebGLRenderingContext) {
        const renderer = new THREE.WebGLRenderer({
          canvas: _map.getCanvas(),
          context: gl,
          antialias: true,
        });
        renderer.autoClear = false;
        rendererRef.current = renderer;
      },

      render(_gl: WebGLRenderingContext, matrix: number[]) {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

        const t = transformRef.current;

        const rotationX = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(1, 0, 0),
          Math.PI / 2
        );

        const rotationY = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(0, 1, 0),
          t.rotation
        );

        const m = new THREE.Matrix4().fromArray(matrix);
        // Multiply by rotationY instead of rotationZ
        const l = new THREE.Matrix4()
          .makeTranslation(t.translateX, t.translateY, t.translateZ)
          .scale(new THREE.Vector3(t.scale, -t.scale, t.scale))
          .multiply(rotationX)
          .multiply(rotationY);

        cameraRef.current.projectionMatrix = m.multiply(l);
        rendererRef.current.resetState();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        map!.triggerRepaint();
      },
    };

    function add() {
      if (!map) return;
      try { if (map.getLayer(lid)) map.removeLayer(lid); } catch { /* */ }
      map.addLayer(customLayer);
      addedRef.current = true;
    }

    if (map.isStyleLoaded()) {
      add();
    } else {
      map.once('style.load', add);
    }

    return () => {
      if (!map) return;
      try { if (map.getLayer(lid)) map.removeLayer(lid); } catch { /* */ }
      addedRef.current = false;
      sceneRef.current = null;
      cameraRef.current = null;
      modelRef.current = null;
      rendererRef.current = null;
    };
  }, [map, layerId]);

  // ---------- 2. Load / swap the GLB model ----------
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !map) return;

    // Remove previous model
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
    }

    const loader = new GLTFLoader();
    loader.load(
      glbPath,
      (gltf) => {
        if (!sceneRef.current) return; // component unmounted

        const model = gltf.scene;

        // Auto-scale: make the longest dimension = targetSizeMeters
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        model.scale.setScalar(targetSizeMeters / maxDim);

        // Center XZ, sit on ground
        const scaledBox = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        scaledBox.getCenter(center);
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= scaledBox.min.y; // bottom on ground

        // Make sure materials are visible and double sided
        try {
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach(m => { m.side = THREE.DoubleSide; m.needsUpdate = true; });
                } else {
                  mesh.material.side = THREE.DoubleSide;
                  mesh.material.needsUpdate = true;
                }
              } else {
                mesh.material = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.4, side: THREE.DoubleSide });
              }
            }
          });
        } catch (e) {
          console.error('[GLBModelLayer] Material traversal error:', e);
        }

        // Add a visible bounding box helper so we can see if the model loaded even if invisible
        const helper = new THREE.BoxHelper(model, 0xff0000);
        sceneRef.current!.add(helper);

        modelRef.current = model;
        sceneRef.current!.add(model);
        map?.triggerRepaint();
        console.log('[GLBModelLayer] Model loaded:', glbPath, 'size:', size.toArray(), 'scaled to', targetSizeMeters, 'm');
      },
      undefined,
      (err) => console.error('[GLBModelLayer] GLB load error:', glbPath, err)
    );
  }, [glbPath, map]);

  // ---------- 3. Reposition when lngLat changes ----------
  useEffect(() => {
    if (!map) return;
    // Query terrain elevation so the model sits ON TOP of the terrain, not underground
    const elevation = getElevation(map, lngLat.lng, lngLat.lat);
    const merc = mapboxgl.MercatorCoordinate.fromLngLat(
      [lngLat.lng, lngLat.lat],
      elevation
    );
    transformRef.current = {
      ...transformRef.current,
      translateX: merc.x,
      translateY: merc.y,
      translateZ: merc.z ?? 0,
      scale: merc.meterInMercatorCoordinateUnits(),
    };
    map.triggerRepaint();
  }, [lngLat, map]);

  // ---------- 4. Update rotation ----------
  useEffect(() => {
    transformRef.current.rotation = rotation;
    map?.triggerRepaint();
  }, [rotation, map]);

  return null;
}