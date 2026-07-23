import { useRef, useState, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { ToolType } from '../../types';

export function ToolInteraction() {
  const { camera, gl, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const activeTool = useStore((state) => state.activeTool);

  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);
  const [drawPoints, setDrawPoints] = useState<THREE.Vector3[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane());
  const dragOffset = useRef(new THREE.Vector3());
  const dragStart = useRef(new THREE.Vector3());

  const lineRef = useRef<THREE.Line>(null);
  const measureLineRef = useRef<THREE.Line>(null);
  const pointsRef = useRef<THREE.Points>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging && selectedObject) {
        raycaster.current.setFromCamera(mouse.current, camera);
        const intersection = new THREE.Vector3();
        raycaster.current.ray.intersectPlane(dragPlane.current, intersection);
        if (intersection) {
          selectedObject.position.copy(intersection.add(dragOffset.current));
        }
      }

      if (isDrawing && activeTool === 'pen') {
        raycaster.current.setFromCamera(mouse.current, camera);
        const intersects = raycaster.current.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          setDrawPoints((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.distanceTo(point) > 0.02) {
              return [...prev, point.clone()];
            }
            return prev;
          });
        }
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      raycaster.current.setFromCamera(mouse.current, camera);

      if (activeTool === 'select' || activeTool === 'move' || activeTool === 'scale' || activeTool === 'rotate') {
        const intersects = raycaster.current.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
          const obj = intersects[0].object;
          setSelectedObject(obj);
          if (activeTool === 'move') {
            setIsDragging(true);
            dragPlane.current.setFromNormalAndCoplanarPoint(
              new THREE.Vector3(0, 0, 1),
              intersects[0].point
            );
            dragStart.current.copy(intersects[0].point);
            dragOffset.current.copy(obj.position).sub(intersects[0].point);
          }
        }
      }

      if (activeTool === 'measure') {
        const intersects = raycaster.current.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
          setMeasurePoints((prev) => {
            if (prev.length >= 2) return [intersects[0].point.clone()];
            return [...prev, intersects[0].point.clone()];
          });
        }
      }

      if (activeTool === 'pen') {
        setIsDrawing(true);
        const intersects = raycaster.current.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
          setDrawPoints([intersects[0].point.clone()]);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsDrawing(false);
    };

    gl.domElement.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('mousedown', handleMouseDown);
    gl.domElement.addEventListener('mouseup', handleMouseUp);

    return () => {
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      gl.domElement.removeEventListener('mouseup', handleMouseUp);
    };
  }, [camera, gl, scene, activeTool, isDragging, selectedObject, isDrawing]);

  useFrame(() => {
    if (selectedObject && activeTool === 'select') {
      // 选中的物体可能是 Mesh，安全地获取材质并设置自发光高亮
      const mesh = selectedObject as THREE.Mesh;
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      (mat as THREE.MeshStandardMaterial | undefined)?.emissive?.setHex(0x333333);
    }
  });

  const drawGeometry = useMemo(() => {
    if (drawPoints.length < 2) return new THREE.BufferGeometry();
    const positions = new Float32Array(drawPoints.length * 3);
    drawPoints.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [drawPoints]);

  const measureGeometry = useMemo(() => {
    if (measurePoints.length < 2) return new THREE.BufferGeometry();
    const positions = new Float32Array(measurePoints.length * 3);
    measurePoints.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [measurePoints]);

  return (
    <>
      {activeTool === 'pen' && drawPoints.length > 1 && (
        <line ref={lineRef as any}>
          <bufferGeometry attach="geometry" {...drawGeometry} />
          <lineBasicMaterial attach="material" color="#FF6B6B" linewidth={2} />
        </line>
      )}

      {activeTool === 'measure' && measurePoints.length > 0 && (
        <>
          {measurePoints.map((point, i) => (
            <mesh key={i} position={[point.x, point.y, point.z]}>
              <sphereGeometry args={[0.02, 16, 16]} />
              <meshBasicMaterial color="#FF6B6B" />
            </mesh>
          ))}
          {measurePoints.length === 2 && (
            <line ref={measureLineRef as any}>
              <bufferGeometry attach="geometry" {...measureGeometry} />
              <lineBasicMaterial attach="material" color="#FF6B6B" linewidth={2} />
            </line>
          )}
        </>
      )}
    </>
  );
}
