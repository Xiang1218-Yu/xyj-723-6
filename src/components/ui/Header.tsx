import { useState } from 'react';
import { Scissors, Save, Download, FolderOpen, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '../../store';
import { fabrics } from '../../data/fabrics';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [projectName, setProjectName] = useState('我的设计');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  const { selectedFabric, modelSettings, garmentSettings, setSelectedFabric, setModelSettings, setGarmentSettings } = useStore();

  const handleSave = () => {
    const projectData = {
      id: Date.now().toString(),
      name: projectName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fabricId: selectedFabric?.id,
      modelSettings,
      garmentSettings,
    };

    const savedProjects = JSON.parse(localStorage.getItem('threadstudio-projects') || '[]');
    savedProjects.push(projectData);
    localStorage.setItem('threadstudio-projects', JSON.stringify(savedProjects));

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowSaveModal(false);
    }, 1500);
  };

  const handleExport = () => {
    const exportData = {
      name: projectName,
      exportedAt: new Date().toISOString(),
      fabric: selectedFabric,
      modelSettings,
      garmentSettings,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const savedProjects = JSON.parse(localStorage.getItem('threadstudio-projects') || '[]');

  const handleLoadProject = (project: any) => {
    const fabric = fabrics.find((f: any) => f.id === project.fabricId);
    if (fabric) {
      setSelectedFabric(fabric);
    }
    if (project.modelSettings) {
      setModelSettings(project.modelSettings);
    }
    if (project.garmentSettings) {
      setGarmentSettings(project.garmentSettings);
    }
    setProjectName(project.name);
    setShowProjectModal(false);
  };

  return (
    <>
      <header className={cn(
        'h-14 flex items-center justify-between px-4 border-b border-carbon-600 bg-carbon-700/90 backdrop-blur-sm',
        className
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coral-500 to-lavender-500 flex items-center justify-center">
              <Scissors size={18} className="text-white" />
            </div>
            <span className="font-display text-xl font-semibold gradient-text">ThreadStudio</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <NavButton
            icon={FolderOpen}
            label="项目"
            onClick={() => setShowProjectModal(true)}
          />
          <NavButton
            icon={Save}
            label="保存"
            onClick={() => setShowSaveModal(true)}
          />
          <NavButton
            icon={Download}
            label="导出"
            onClick={handleExport}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSaveModal(true)}
            className={cn(
              'px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium',
              saveSuccess
                ? 'bg-green-600 text-white'
                : 'bg-carbon-600 text-carbon-200 hover:bg-carbon-500'
            )}
          >
            {saveSuccess ? <Check size={16} /> : <Save size={16} />}
            {saveSuccess ? '已保存' : '保存'}
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-lg bg-coral-500 text-white hover:bg-coral-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-lg shadow-coral-500/20"
          >
            <Download size={16} />
            导出
          </button>
        </div>
      </header>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-carbon-700 rounded-xl p-6 w-96 shadow-2xl border border-carbon-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">保存项目</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-carbon-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-4 py-2 bg-carbon-600 border border-carbon-500 rounded-lg text-white placeholder-carbon-400 focus:outline-none focus:border-coral-500 mb-4"
              placeholder="项目名称"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-lg bg-carbon-600 text-carbon-200 hover:bg-carbon-500 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className={cn(
                  'px-4 py-2 rounded-lg transition-colors flex items-center gap-2',
                  saveSuccess
                    ? 'bg-green-600 text-white'
                    : 'bg-coral-500 text-white hover:bg-coral-600'
                )}
              >
                {saveSuccess ? <Check size={16} /> : null}
                {saveSuccess ? '已保存' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-carbon-700 rounded-xl p-6 w-[500px] max-h-[70vh] shadow-2xl border border-carbon-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">我的项目</h3>
              <button
                onClick={() => setShowProjectModal(false)}
                className="text-carbon-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            {savedProjects.length === 0 ? (
              <div className="text-center py-8 text-carbon-400">
                <FolderOpen size={48} className="mx-auto mb-2 opacity-50" />
                <p>暂无保存的项目</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedProjects.slice().reverse().map((project: any) => (
                  <div
                    key={project.id}
                    onClick={() => handleLoadProject(project)}
                    className="p-3 bg-carbon-600 rounded-lg hover:bg-carbon-500 transition-colors cursor-pointer"
                  >
                    <div className="font-medium text-white">{project.name}</div>
                    <div className="text-xs text-carbon-400">
                      {new Date(project.updatedAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function NavButton({
  icon: Icon,
  label,
  shortcut,
  onClick,
}: {
  icon: any;
  label: string;
  shortcut?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-carbon-300 hover:text-white hover:bg-carbon-600 transition-all flex items-center gap-2 text-sm group relative"
    >
      <Icon size={16} />
      <span>{label}</span>
      {shortcut && (
        <span className="ml-1 text-xs text-carbon-500 group-hover:text-carbon-400">{shortcut}</span>
      )}
    </button>
  );
}
