import { useRef } from 'react';
import { Header } from '../components/ui/Header';
import { Toolbar } from '../components/ui/Toolbar';
import { PropertiesPanel } from '../components/ui/PropertiesPanel';
import { DesignScene, DesignSceneRef } from '../components/three/DesignScene';
import { cn } from '@/lib/utils';

export function Workspace() {
  const sceneRef = useRef<DesignSceneRef>(null);

  return (
    <div className="h-screen w-screen flex flex-col bg-carbon-800 overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-16 bg-carbon-700/50 border-r border-carbon-600 flex-shrink-0">
          <Toolbar />
        </div>

        <div className="flex-1 relative">
          <DesignScene ref={sceneRef} />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 glass rounded-full">
            <CameraPreset label="正面" onClick={() => sceneRef.current?.setCameraFront()} />
            <CameraPreset label="侧面" onClick={() => sceneRef.current?.setCameraSide()} />
            <CameraPreset label="背面" onClick={() => sceneRef.current?.setCameraBack()} />
            <div className="w-px h-4 bg-carbon-500 mx-1" />
            <CameraPreset label="重置" onClick={() => sceneRef.current?.resetCamera()} />
          </div>

          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="px-3 py-1.5 glass rounded-lg text-xs text-carbon-300">
              <span className="text-coral-400">提示：</span> 拖拽旋转视角，滚轮缩放
            </div>
          </div>
        </div>

        <PropertiesPanel />
      </div>
    </div>
  );
}

function CameraPreset({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 text-xs text-carbon-300 hover:text-white hover:bg-carbon-600/50 rounded-lg transition-colors'
      )}
    >
      {label}
    </button>
  );
}
