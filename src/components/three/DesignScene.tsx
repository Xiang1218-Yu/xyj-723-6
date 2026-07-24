import { useRef, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SceneLighting } from './SceneLighting';
import { Ground } from './Ground';
import { VirtualModel } from './VirtualModel';
import { ToolInteraction } from './ToolInteraction';

interface DesignSceneProps {
  className?: string;
}

export interface DesignSceneRef {
  setCameraFront: () => void;
  setCameraSide: () => void;
  setCameraBack: () => void;
  resetCamera: () => void;
}

const CameraController = forwardRef<DesignSceneRef>((_, ref) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    setCameraFront: () => {
      if (controlsRef.current) {
        camera.position.set(0, 0.5, 3.5);
        controlsRef.current.target.set(0, 0.3, 0);
        controlsRef.current.update();
      }
    },
    setCameraSide: () => {
      if (controlsRef.current) {
        camera.position.set(3.5, 0.5, 0);
        controlsRef.current.target.set(0, 0.3, 0);
        controlsRef.current.update();
      }
    },
    setCameraBack: () => {
      if (controlsRef.current) {
        camera.position.set(0, 0.5, -3.5);
        controlsRef.current.target.set(0, 0.3, 0);
        controlsRef.current.update();
      }
    },
    resetCamera: () => {
      if (controlsRef.current) {
        camera.position.set(0, 0.5, 3.5);
        controlsRef.current.target.set(0, 0.3, 0);
        controlsRef.current.update();
      }
    },
  }));

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={1.5}
      maxDistance={8}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 1.8}
      target={[0, 0.3, 0]}
    />
  );
});

CameraController.displayName = 'CameraController';

export const DesignScene = forwardRef<DesignSceneRef, DesignSceneProps>(({ className }, ref) => {
  return (
    <div className={`w-full h-full ${className || ''}`}>
      <Canvas
        shadows
        camera={{ position: [0, 0.5, 3.5], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#1A1A1A']} />
        <fog attach="fog" args={['#1A1A1A', 8, 20]} />

        <SceneLighting />
        <VirtualModel />
        <Ground />
        <ToolInteraction />

        <CameraController ref={ref} />
      </Canvas>
    </div>
  );
});

DesignScene.displayName = 'DesignScene';
