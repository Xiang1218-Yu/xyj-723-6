import { MousePointer, Move, RotateCw, Maximize2, Pen, Ruler, Undo2, Redo2 } from 'lucide-react';
import { useStore } from '../../store';
import { ToolType } from '../../types';
import { cn } from '@/lib/utils';

const tools: { type: ToolType; icon: typeof MousePointer; label: string }[] = [
  { type: 'select', icon: MousePointer, label: '选择' },
  { type: 'move', icon: Move, label: '移动' },
  { type: 'rotate', icon: RotateCw, label: '旋转' },
  { type: 'scale', icon: Maximize2, label: '缩放' },
  { type: 'pen', icon: Pen, label: '绘制' },
  { type: 'measure', icon: Ruler, label: '测量' },
];

export function Toolbar() {
  const { activeTool, setActiveTool, undo, redo, canUndo, canRedo } = useStore();

  return (
    <div className="flex flex-col items-center py-4 gap-2">
      <div className="flex gap-1 mb-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group relative',
            canUndo
              ? 'bg-carbon-600 text-carbon-300 hover:bg-carbon-500 hover:text-white'
              : 'bg-carbon-700 text-carbon-500 cursor-not-allowed'
          )}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 size={18} strokeWidth={2} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group relative',
            canRedo
              ? 'bg-carbon-600 text-carbon-300 hover:bg-carbon-500 hover:text-white'
              : 'bg-carbon-700 text-carbon-500 cursor-not-allowed'
          )}
          title="重做 (Ctrl+Y)"
        >
          <Redo2 size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="w-8 h-px bg-carbon-500 my-1" />

      {tools.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          onClick={() => setActiveTool(type)}
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group relative',
            activeTool === type
              ? 'bg-coral-500 text-white shadow-lg shadow-coral-500/30'
              : 'bg-carbon-600 text-carbon-300 hover:bg-carbon-500 hover:text-white'
          )}
          title={label}
        >
          <Icon size={20} strokeWidth={2} />
          <span className="absolute left-14 bg-carbon-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {label}
          </span>
        </button>
      ))}

      <div className="w-8 h-px bg-carbon-500 my-2" />

      <ViewControls />
    </div>
  );
}

function ViewControls() {
  const { isPlaying, togglePlay, showWireframe, toggleWireframe } = useStore();

  return (
    <>
      <button
        onClick={togglePlay}
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group relative',
          isPlaying
            ? 'bg-lavender-500 text-white shadow-lg shadow-lavender-500/30'
            : 'bg-carbon-600 text-carbon-300 hover:bg-carbon-500 hover:text-white'
        )}
        title={isPlaying ? '暂停旋转' : '开始旋转'}
      >
        {isPlaying ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        <span className="absolute left-14 bg-carbon-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          {isPlaying ? '暂停旋转' : '开始旋转'}
        </span>
      </button>

      <button
        onClick={toggleWireframe}
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group relative',
          showWireframe
            ? 'bg-coral-500 text-white shadow-lg shadow-coral-500/30'
            : 'bg-carbon-600 text-carbon-300 hover:bg-carbon-500 hover:text-white'
        )}
        title="线框模式"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <span className="absolute left-14 bg-carbon-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          线框模式
        </span>
      </button>
    </>
  );
}
