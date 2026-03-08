'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface GLBModelLayerProps {
  map: mapboxgl.Map | null;
  glbPath: string;
  lngLat: { lng: number; lat: number };
}

const LAYER_ID = 'glb-blueprint-model';

export default function GLBModelLayer({ map, glbPath, lngLat }: GLBModelLayerProps) {
  const addedRef = useRef(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const transformRef = useRef({
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    scale: 1e-6,
  });

  // Add the custom layer once
  useEffect(() => {
    if (!map) return;
    if (addedRef.current) return;

    const camera = new THREE.Camera();
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const light1 = new THREE.DirectionalLight(0xffffff, 1.2);
    light1.position.set(0, -70, 100).normalize();
    scene.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff, 0.8);
    light2.position.set(0, 70, 100).normalize();
    scene.add(light2);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    let renderer: THREE.WebGLRenderer;

    const customLayer: mapboxgl.CustomLayerInterface = {
      id: LAYER_ID,
      type: 'custom',
      renderingMode: '3d',

      onAdd(_map: mapboxgl.Map, gl: WebGLRenderingContext) {
        renderer = new THREE.WebGLRenderer({
          canvas: _map.getCanvas(),
          context: gl,
          antialias: true,
        });
        renderer.autoClear = false;
      },

      render(_gl: WebGLRenderingContext, matrix: number[]) {
        const t = transformRef.current;
        const rotationX = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(1, 0, 0),
          Math.PI / 2
        );

        const m = new THREE.Matrix4().fromArray(matrix);
        const l = new THREE.Matrix4()
          .makeTranslation(t.translateX, t.translateY, t.translateZ)
          .scale(new THREE.Vector3(t.scale, -t.scale, t.scale))
          .multiply(rotationX);

        camera.projectionMatrix = m.multiply(l);
        renderer.resetState();
        renderer.render(scene, camera);
        map!.triggerRepaint();
      },
    };

    function add() {
      if (!map) return;
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      } catch { /* ignore */ }
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
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      } catch { /* ignore */ }
      addedRef.current = false;
      sceneRef.current = null;
      modelRef.current = null;
    };
  }, [map]);

  // Load/swap the GLB model when glbPath changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove previous model
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current = null;
    }

    const loader = new GLTFLoader();
    loader.load(
      glbPath,
      (gltf) => {
        modelRef.current = gltf.scene;
        scene.add(gltf.scene);
        map?.triggerRepaint();
      },
      undefined,
      (err) => console.error('GLB load error:', err)
    );
  }, [glbPath, map]);

  // Reposition when lngLat changes
  useEffect(() => {
    if (!map) return;
    const merc = mapboxgl.MercatorCoordinate.fromLngLat(
      [lngLat.lng, lngLat.lat],
      0
    );
    transformRef.current = {
      translateX: merc.x,
      translateY: merc.y,
      translateZ: merc.z ?? 0,
      scale: merc.meterInMercatorCoordinateUnits(),
    };
    map.triggerRepaint();
  }, [lngLat, map]);

  return null;
}
