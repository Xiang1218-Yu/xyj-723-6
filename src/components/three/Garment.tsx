import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { BodyType } from '../../types';
import { getFabricTextures } from '../../utils/fabricTextures';

const bodyTypeScales: Record<BodyType, { torso: number; hips: number; limbs: number }> = {
  slim: { torso: 0.85, hips: 0.85, limbs: 1.05 },
  standard: { torso: 1, hips: 1, limbs: 1 },
  athletic: { torso: 1.1, hips: 0.9, limbs: 1.05 },
  curvy: { torso: 0.95, hips: 1.15, limbs: 0.95 },
};

export function Garment() {
  const groupRef = useRef<THREE.Group>(null);
  const leftSleeveRef = useRef<THREE.Group>(null);
  const rightSleeveRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Mesh>(null);

  const selectedFabric = useStore((state) => state.selectedFabric);
  const garmentSettings = useStore((state) => state.garmentSettings);
  const modelSettings = useStore((state) => state.modelSettings);
  const showWireframe = useStore((state) => state.showWireframe);
  const isPlaying = useStore((state) => state.isPlaying);

  const { fit, length, sleeveLength } = garmentSettings;
  const { bodyType, measurements } = modelSettings;
  const scales = bodyTypeScales[bodyType];

  const heightScale = measurements.height / 175;
  const bustScale = measurements.bust / 90;
  const waistScale = measurements.waist / 65;

  const fitMultiplier = fit === 'tight' ? 1.03 : fit === 'loose' ? 1.15 : 1.08;

  const torsoTopRadius = 0.28 * scales.torso * bustScale * fitMultiplier;
  const torsoBottomRadius = 0.22 * scales.torso * waistScale * fitMultiplier;
  const torsoHeight = 0.6 * scales.torso * heightScale * (length / 50);
  const torsoCenterY = 0.95 * scales.torso * heightScale;

  const sleeveRadius = 0.07 * heightScale * fitMultiplier;
  const sleeveLen = 0.5 * scales.limbs * heightScale * (sleeveLength / 60);
  const shoulderY = torsoCenterY + torsoHeight * 0.45;
  const shoulderX = torsoTopRadius * 0.85;

  const fabricTextures = useMemo(() => {
    if (!selectedFabric) return null;
    const textureType = selectedFabric.materialProps.textureType || 'woven';
    const textureScale = selectedFabric.materialProps.textureScale || 1.0;
    return getFabricTextures(textureType, selectedFabric.materialProps.color, textureScale);
  }, [selectedFabric]);

  const material = useMemo(() => {
    const matProps = selectedFabric?.materialProps;

    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(matProps?.color || '#E8D5C4'),
      roughness: matProps?.roughness ?? 0.8,
      metalness: matProps?.metalness ?? 0.0,
      side: THREE.DoubleSide,
      wireframe: showWireframe,
      clearcoat: matProps?.clearcoat ?? 0,
      clearcoatRoughness: matProps?.clearcoatRoughness ?? 0.3,
      sheen: matProps?.sheen ?? 0,
      sheenRoughness: matProps?.sheenRoughness ?? 0.5,
      reflectivity: matProps?.reflectivity ?? 0.5,
      envMapIntensity: matProps?.envMapIntensity ?? 1.0,
    });

    if (matProps?.sheenColor) {
      mat.sheenColor = new THREE.Color(matProps.sheenColor);
    }

    if (fabricTextures) {
      mat.map = fabricTextures.map;
      mat.normalMap = fabricTextures.normalMap;
      mat.roughnessMap = fabricTextures.roughnessMap;
      mat.normalScale = new THREE.Vector2(
        (matProps?.normalScale ?? 0.5) * 1.5,
        (matProps?.normalScale ?? 0.5) * 1.5
      );
      mat.aoMapIntensity = matProps?.aoIntensity ?? 0.3;
    }

    return mat;
  }, [selectedFabric, showWireframe, fabricTextures]);

  const drape = selectedFabric ? selectedFabric.physicalParams.drape : 0.6;
  const wrinkle = selectedFabric ? selectedFabric.physicalParams.wrinkle : 0.4;
  const stiffness = selectedFabric ? selectedFabric.physicalParams.stiffness : 0.3;

  const torsoGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(
      torsoTopRadius,
      torsoBottomRadius,
      torsoHeight,
      32,
      16,
      true
    );

    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const normalizedY = (y + torsoHeight / 2) / torsoHeight;

      if (normalizedY > 0.85) {
        const shoulderFactor = (normalizedY - 0.85) / 0.15;
        const tuckFactor = 1 - shoulderFactor * 0.3;
        posAttr.setX(i, x * tuckFactor);
        posAttr.setZ(i, z * tuckFactor);
      }

      if (normalizedY < 0.08) {
        const hemFactor = normalizedY / 0.08;
        const outwardCurve = Math.sin(hemFactor * Math.PI) * 0.01 * (1 - stiffness);
        const len = Math.sqrt(x * x + z * z);
        if (len > 0.001) {
          posAttr.setX(i, x + (x / len) * outwardCurve);
          posAttr.setZ(i, z + (z / len) * outwardCurve);
        }
      }

      const angle = Math.atan2(z, x);
      const wrinkleAmount = wrinkle * 0.008 * (1 - stiffness);
      const wave = Math.sin(angle * 8 + normalizedY * 20) * wrinkleAmount;
      const len2 = Math.sqrt(x * x + z * z);
      if (len2 > 0.001) {
        posAttr.setX(i, posAttr.getX(i) + (x / len2) * wave);
        posAttr.setZ(i, posAttr.getZ(i) + (z / len2) * wave);
      }
    }

    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [torsoTopRadius, torsoBottomRadius, torsoHeight, wrinkle, stiffness]);

  const sleeveGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(
      sleeveRadius * 1.1,
      sleeveRadius * 0.85,
      sleeveLen,
      20,
      8,
      true
    );

    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const normalizedY = (y + sleeveLen / 2) / sleeveLen;

      if (normalizedY < 0.1) {
        const cuffFactor = normalizedY / 0.1;
        const taper = 1 - cuffFactor * 0.15;
        posAttr.setX(i, x * taper);
        posAttr.setZ(i, z * taper);
      }

      const wrinkleAmount = wrinkle * 0.004;
      const angle = Math.atan2(z, x);
      const wave = Math.sin(angle * 6 + normalizedY * 15) * wrinkleAmount;
      const len = Math.sqrt(x * x + z * z);
      if (len > 0.001) {
        posAttr.setX(i, posAttr.getX(i) + (x / len) * wave);
        posAttr.setZ(i, posAttr.getZ(i) + (z / len) * wave);
      }
    }

    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [sleeveRadius, sleeveLen, wrinkle]);

  const collarGeometry = useMemo(() => {
    const collarRadius = 0.13 * scales.torso * bustScale;
    return new THREE.TorusGeometry(collarRadius, 0.012, 8, 32);
  }, [scales.torso, bustScale, heightScale]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.elapsedTime;

    if (isPlaying) {
      groupRef.current.rotation.y = t * 0.3;
    } else {
      groupRef.current.rotation.y = 0;
    }

    const wobble = Math.sin(t * 1.5) * 0.01 * (1 - drape);
    const wave = Math.sin(t * 2) * 0.006 * wrinkle;

    if (torsoRef.current) {
      torsoRef.current.rotation.x = wobble * 0.1;
      torsoRef.current.position.y = torsoCenterY - torsoHeight * 0.05 + Math.sin(t * 1.2) * 0.002 * drape;
    }

    if (leftSleeveRef.current) {
      leftSleeveRef.current.rotation.z = -0.15 + wobble * 0.6;
      leftSleeveRef.current.rotation.x = wave * 0.4;
    }

    if (rightSleeveRef.current) {
      rightSleeveRef.current.rotation.z = 0.15 - wobble * 0.6;
      rightSleeveRef.current.rotation.x = -wave * 0.4;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      <mesh
        ref={torsoRef}
        geometry={torsoGeometry}
        material={material}
        position={[0, torsoCenterY - torsoHeight * 0.05, 0]}
        castShadow
        receiveShadow
      />

      <mesh
        geometry={collarGeometry}
        material={material}
        position={[0, torsoCenterY + torsoHeight * 0.42, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      />

      <group
        ref={leftSleeveRef}
        position={[-shoulderX, shoulderY, 0]}
      >
        <group rotation={[0, 0, -0.15]}>
          <group position={[0, -sleeveLen / 2, 0]}>
            <mesh
              geometry={sleeveGeometry}
              material={material}
              castShadow
              receiveShadow
            />
          </group>
        </group>
      </group>

      <group
        ref={rightSleeveRef}
        position={[shoulderX, shoulderY, 0]}
      >
        <group rotation={[0, 0, 0.15]}>
          <group position={[0, -sleeveLen / 2, 0]}>
            <mesh
              geometry={sleeveGeometry}
              material={material}
              castShadow
              receiveShadow
            />
          </group>
        </group>
      </group>
    </group>
  );
}
