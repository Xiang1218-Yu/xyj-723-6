import { useState } from 'react';
import { ChevronDown, ChevronUp, Shirt, User, Ruler } from 'lucide-react';
import { useStore } from '../../store';
import { fabrics, fabricCategories } from '../../data/fabrics';
import { cn } from '@/lib/utils';
import { BodyType, FabricCategory } from '../../types';

interface PropertiesPanelProps {
  className?: string;
}

export function PropertiesPanel({ className }: PropertiesPanelProps) {
  return (
    <div className={cn(
      'w-80 h-full bg-carbon-700/80 backdrop-blur-md border-l border-carbon-600 overflow-y-auto',
      className
    )}>
      <FabricSection />
      <ModelSection />
      <GarmentSection />
    </div>
  );
}

function SectionHeader({ icon: Icon, title, isOpen, onToggle }: {
  icon: any;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-carbon-600/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-coral-500" />
        <span className="font-medium text-white">{title}</span>
      </div>
      {isOpen ? <ChevronUp size={18} className="text-carbon-400" /> : <ChevronDown size={18} className="text-carbon-400" />}
    </button>
  );
}

function FabricSection() {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<FabricCategory | 'all'>('all');
  const { selectedFabric, setSelectedFabric } = useStore();

  const filteredFabrics = selectedCategory === 'all'
    ? fabrics
    : fabrics.filter(f => f.category === selectedCategory);

  return (
    <div className="border-b border-carbon-600">
      <SectionHeader icon={Shirt} title="面料选择" isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} />

      {isOpen && (
        <div className="px-4 pb-4">
          <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all',
                selectedCategory === 'all'
                  ? 'bg-coral-500 text-white'
                  : 'bg-carbon-600 text-carbon-300 hover:bg-carbon-500'
              )}
            >
              全部
            </button>
            {fabricCategories.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSelectedCategory(value)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all',
                  selectedCategory === value
                    ? 'bg-coral-500 text-white'
                    : 'bg-carbon-600 text-carbon-300 hover:bg-carbon-500'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {filteredFabrics.map((fabric) => (
              <button
                key={fabric.id}
                onClick={() => setSelectedFabric(fabric)}
                className={cn(
                  'aspect-square rounded-lg border-2 transition-all overflow-hidden group',
                  selectedFabric?.id === fabric.id
                    ? 'border-coral-500 ring-2 ring-coral-500/30'
                    : 'border-carbon-500 hover:border-carbon-400'
                )}
                title={`${fabric.nameZh} - ${fabric.name}`}
              >
                <div
                  className="w-full h-full transition-transform group-hover:scale-110"
                  style={{ backgroundColor: fabric.color }}
                />
              </button>
            ))}
          </div>

          {selectedFabric && (
            <div className="mt-4 p-3 bg-carbon-600/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded border border-carbon-500"
                  style={{ backgroundColor: selectedFabric.color }}
                />
                <div>
                  <p className="font-medium text-white text-sm">{selectedFabric.nameZh}</p>
                  <p className="text-xs text-carbon-400">{selectedFabric.name}</p>
                </div>
              </div>
              <p className="text-xs text-carbon-300 mb-3">{selectedFabric.description}</p>

              <div className="space-y-2">
                <ParamSlider label="垂感" value={selectedFabric.physicalParams.drape} />
                <ParamSlider label="硬度" value={selectedFabric.physicalParams.stiffness} />
                <ParamSlider label="褶皱" value={selectedFabric.physicalParams.wrinkle} />
                <ParamSlider label="弹性" value={selectedFabric.physicalParams.elasticity} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModelSection() {
  const [isOpen, setIsOpen] = useState(true);
  const { modelSettings, setModelSettings } = useStore();

  const bodyTypes: { value: BodyType; label: string }[] = [
    { value: 'slim', label: '纤瘦' },
    { value: 'standard', label: '标准' },
    { value: 'athletic', label: '健美' },
    { value: 'curvy', label: '丰满' },
  ];

  return (
    <div className="border-b border-carbon-600">
      <SectionHeader icon={User} title="模特设置" isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} />

      {isOpen && (
        <div className="px-4 pb-4">
          <p className="text-xs text-carbon-400 mb-2">体型选择</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {bodyTypes.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setModelSettings({ bodyType: value })}
                className={cn(
                  'py-2 rounded-lg text-xs transition-all',
                  modelSettings.bodyType === value
                    ? 'bg-coral-500 text-white'
                    : 'bg-carbon-600 text-carbon-300 hover:bg-carbon-500'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-xs text-carbon-400 mb-2">尺寸调整</p>
          <div className="space-y-3">
            <MeasurementSlider
              label="身高"
              value={modelSettings.measurements.height}
              min={150}
              max={190}
              unit="cm"
              onChange={(v) => setModelSettings({
                measurements: { ...modelSettings.measurements, height: v }
              })}
            />
            <MeasurementSlider
              label="胸围"
              value={modelSettings.measurements.bust}
              min={75}
              max={110}
              unit="cm"
              onChange={(v) => setModelSettings({
                measurements: { ...modelSettings.measurements, bust: v }
              })}
            />
            <MeasurementSlider
              label="腰围"
              value={modelSettings.measurements.waist}
              min={55}
              max={90}
              unit="cm"
              onChange={(v) => setModelSettings({
                measurements: { ...modelSettings.measurements, waist: v }
              })}
            />
            <MeasurementSlider
              label="臀围"
              value={modelSettings.measurements.hips}
              min={80}
              max={115}
              unit="cm"
              onChange={(v) => setModelSettings({
                measurements: { ...modelSettings.measurements, hips: v }
              })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function GarmentSection() {
  const [isOpen, setIsOpen] = useState(true);
  const { garmentSettings, setGarmentSettings } = useStore();

  const fits = [
    { value: 'tight', label: '紧身' },
    { value: 'regular', label: '常规' },
    { value: 'loose', label: '宽松' },
  ];

  return (
    <div className="border-b border-carbon-600">
      <SectionHeader icon={Ruler} title="服装参数" isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} />

      {isOpen && (
        <div className="px-4 pb-4">
          <p className="text-xs text-carbon-400 mb-2">版型</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {fits.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setGarmentSettings({ fit: value as any })}
                className={cn(
                  'py-2 rounded-lg text-xs transition-all',
                  garmentSettings.fit === value
                    ? 'bg-coral-500 text-white'
                    : 'bg-carbon-600 text-carbon-300 hover:bg-carbon-500'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-xs text-carbon-400 mb-2">尺寸</p>
          <div className="space-y-3">
            <MeasurementSlider
              label="衣长"
              value={garmentSettings.length}
              min={30}
              max={80}
              unit="cm"
              onChange={(v) => setGarmentSettings({ length: v })}
            />
            <MeasurementSlider
              label="袖长"
              value={garmentSettings.sleeveLength}
              min={0}
              max={60}
              unit="cm"
              onChange={(v) => setGarmentSettings({ sleeveLength: v })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ParamSlider({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-carbon-400 w-10">{label}</span>
      <div className="flex-1 h-1.5 bg-carbon-500 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-coral-500 to-lavender-500 rounded-full"
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="text-xs text-carbon-400 w-8 text-right">{Math.round(value * 100)}</span>
    </div>
  );
}

function MeasurementSlider({ label, value, min, max, unit, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-carbon-400">{label}</span>
        <span className="text-xs text-coral-400 font-medium">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
