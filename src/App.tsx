import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Environment } from '@react-three/drei';
import { Play, Download, RefreshCw, Music, Zap, GitBranch } from 'lucide-react';
import type { Mesh } from 'three';

// ============================================================
// API Configuration
// ============================================================
const API_URL = 'https://guitar-model-lab.onrender.com';

// ============================================================
// Types
// ============================================================
interface GeneratedTab {
  tab: string;
  root: string;
  scale: string;
  pattern: string;
  bars: number;
  position: number;
  tuning: string;
  tempo: number;
}

interface ApiOptions {
  scales: string[];
  tunings: string[];
  styles: string[];
  patterns: string[];
}

// ============================================================
// 3D Guitar Pick Component
// ============================================================
function GuitarPick() {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
      meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.3) * 0.2;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh ref={meshRef} scale={2}>
        {/* Rounded triangle approximation for guitar pick */}
        <torusKnotGeometry args={[1, 0.4, 128, 32, 2, 3]} />
        <MeshTransmissionMaterial
          backside
          samples={6}
          thickness={0.5}
          chromaticAberration={0.3}
          distortion={0.2}
          distortionScale={0.5}
          temporalDistortion={0.1}
          ior={1.5}
          color="#c8956c"
          roughness={0.1}
        />
      </mesh>
    </Float>
  );
}

// ============================================================
// 3D Scene
// ============================================================
function Scene3D() {
  return (
    <div className="absolute inset-0 canvas-fade" style={{ zIndex: 0 }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 5, 15]} />
        <ambientLight intensity={0.15} />
        <spotLight
          position={[5, 5, 5]}
          angle={0.3}
          penumbra={1}
          intensity={2}
          color="#c8956c"
        />
        <spotLight
          position={[-5, -2, 3]}
          angle={0.4}
          penumbra={1}
          intensity={0.8}
          color="#4a3f35"
        />
        <Environment preset="night" />
        <GuitarPick />
      </Canvas>
    </div>
  );
}

// ============================================================
// Fretboard Visualization
// ============================================================
interface FretboardProps {
  tab: string;
  tuning: string;
}

function Fretboard({ tab }: FretboardProps) {
  const strings = ['e', 'B', 'G', 'D', 'A', 'E'];
  const frets = 24;

  // Parse tab to extract notes
  const parseTab = (tabString: string): Map<string, number[]> => {
    const noteMap = new Map<string, number[]>();
    const lines = tabString.split('\n');

    lines.forEach((line) => {
      const match = line.match(/^([eBGDAE])\|(.+)\|?$/);
      if (match) {
        const stringName = match[1];
        const notes = match[2];
        const fretNumbers: number[] = [];

        // Extract fret numbers from the tab line
        let i = 0;
        while (i < notes.length) {
          if (notes[i] >= '0' && notes[i] <= '9') {
            let num = notes[i];
            if (i + 1 < notes.length && notes[i + 1] >= '0' && notes[i + 1] <= '9') {
              num += notes[i + 1];
              i++;
            }
            fretNumbers.push(parseInt(num, 10));
          }
          i++;
        }

        noteMap.set(stringName, fretNumbers);
      }
    });

    return noteMap;
  };

  const noteMap = parseTab(tab);

  return (
    <div className="fretboard p-4 overflow-x-auto">
      <div className="relative" style={{ minWidth: '800px' }}>
        {/* Fret markers (inlays) */}
        <div className="absolute inset-0 flex">
          {[3, 5, 7, 9, 12, 15, 17, 19, 21, 24].map((fret) => (
            <div
              key={fret}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: `${(fret / frets) * 100}%` }}
            >
              <div
                className={`w-3 h-3 rounded-full bg-[#4a4540] opacity-50 ${
                  fret === 12 ? 'ring-2 ring-[#4a4540]' : ''
                }`}
              />
            </div>
          ))}
        </div>

        {/* Strings */}
        {strings.map((stringName, stringIndex) => {
          const stringNotes = noteMap.get(stringName) || [];
          const stringThickness = 1 + stringIndex * 0.3;

          return (
            <div key={stringName} className="relative h-8 flex items-center">
              {/* String line */}
              <div
                className="absolute inset-x-0 string-line"
                style={{ height: `${stringThickness}px`, top: '50%', transform: 'translateY(-50%)' }}
              />

              {/* Fret wires */}
              {Array.from({ length: frets }).map((_, fretIndex) => (
                <div
                  key={fretIndex}
                  className="absolute fret-wire"
                  style={{
                    left: `${((fretIndex + 1) / frets) * 100}%`,
                    width: '2px',
                    height: '100%',
                  }}
                />
              ))}

              {/* Note markers */}
              {stringNotes.map((fret, noteIndex) => (
                <motion.div
                  key={`${stringName}-${noteIndex}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: noteIndex * 0.05, type: 'spring', stiffness: 500 }}
                  className="absolute note-marker w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-[#050505]"
                  style={{
                    left: `${((fret + 0.5) / frets) * 100}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {fret}
                </motion.div>
              ))}

              {/* String label */}
              <span className="absolute -left-8 text-sm font-mono text-[--color-text-muted]">
                {stringName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Tab Display Component
// ============================================================
interface TabDisplayProps {
  tab: GeneratedTab | null;
  isLoading: boolean;
}

function TabDisplay({ tab, isLoading }: TabDisplayProps) {
  if (isLoading) {
    return (
      <div className="tab-display flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-[--color-text-muted] text-sm">Generating riff...</p>
        </div>
      </div>
    );
  }

  if (!tab) {
    return (
      <div className="tab-display flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <Music className="w-12 h-12 text-[--color-text-muted] mx-auto mb-4" />
          <p className="text-[--color-text-secondary]">
            Configure your riff and hit <span className="text-[--color-accent]">Generate</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Metadata */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Root', value: tab.root },
          { label: 'Scale', value: tab.scale.replace('_', ' ') },
          { label: 'Pattern', value: tab.pattern },
          { label: 'Tempo', value: `${tab.tempo} BPM` },
          { label: 'Position', value: `Fret ${tab.position}` },
        ].map((item) => (
          <div
            key={item.label}
            className="px-3 py-1.5 rounded-full bg-[--color-surface] border border-[--color-border] text-sm"
          >
            <span className="text-[--color-text-muted]">{item.label}:</span>{' '}
            <span className="text-[--color-accent]">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Fretboard visualization */}
      <Fretboard tab={tab.tab} tuning={tab.tuning} />

      {/* Tab notation */}
      <div className="tab-display">
        <pre className="font-tab whitespace-pre">{tab.tab}</pre>
      </div>
    </motion.div>
  );
}

// ============================================================
// Control Panel Component
// ============================================================
interface ControlPanelProps {
  options: ApiOptions;
  onGenerate: (params: Record<string, string | number>) => void;
  isLoading: boolean;
}

function ControlPanel({ options, onGenerate, isLoading }: ControlPanelProps) {
  const [root, setRoot] = useState('E');
  const [scale, setScale] = useState('pentatonic_minor');
  const [style, setStyle] = useState('metal');
  const [pattern, setPattern] = useState('ascending');
  const [tempo, setTempo] = useState(120);
  const [bars, setBars] = useState(4);
  const [tuning, setTuning] = useState('standard');

  const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const handleGenerate = () => {
    onGenerate({ root, scale, style, pattern, tempo, bars, tuning });
  };

  return (
    <div className="card-glass p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Zap className="w-5 h-5 text-[--color-accent]" />
        <h2 className="font-display text-xl text-[--color-text-primary]">Riff Generator</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Root Note */}
        <div>
          <label className="form-label">Root Note</label>
          <select
            className="select-control"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
          >
            {roots.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Scale */}
        <div>
          <label className="form-label">Scale</label>
          <select
            className="select-control"
            value={scale}
            onChange={(e) => setScale(e.target.value)}
          >
            {options.scales.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Style */}
        <div>
          <label className="form-label">Style</label>
          <select
            className="select-control"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          >
            {options.styles.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Pattern */}
        <div>
          <label className="form-label">Pattern</label>
          <select
            className="select-control"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          >
            {options.patterns.map((p) => (
              <option key={p} value={p}>
                {p.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Tuning */}
        <div>
          <label className="form-label">Tuning</label>
          <select
            className="select-control"
            value={tuning}
            onChange={(e) => setTuning(e.target.value)}
          >
            {options.tunings.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Bars */}
        <div>
          <label className="form-label">Bars</label>
          <input
            type="number"
            min={1}
            max={16}
            value={bars}
            onChange={(e) => setBars(parseInt(e.target.value, 10))}
          />
        </div>
      </div>

      {/* Tempo Slider */}
      <div>
        <label className="form-label">
          Tempo: <span className="text-[--color-accent]">{tempo} BPM</span>
        </label>
        <input
          type="range"
          min={60}
          max={220}
          value={tempo}
          onChange={(e) => setTempo(parseInt(e.target.value, 10))}
        />
      </div>

      {/* Generate Button */}
      <button
        className="btn-primary w-full"
        onClick={handleGenerate}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="spinner" style={{ width: 16, height: 16 }} />
            Generating...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Generate Riff
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================
// Header Component
// ============================================================
function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[--color-void]/80 border-b border-[--color-border]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[--color-accent] to-[--color-accent-deep] flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-[--color-void]" />
          </div>
          <span className="font-display text-lg">
            Guitar <span className="font-display-italic text-[--color-accent]">Model</span> Lab
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <a
            href="https://guitar-model-lab.onrender.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[--color-text-muted] hover:text-[--color-accent] transition-colors"
          >
            API Docs
          </a>
          <a
            href="https://github.com/guitargnarr/guitar-model-lab"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[--color-text-muted] hover:text-[--color-accent] transition-colors"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

// ============================================================
// Main App Component
// ============================================================
function App() {
  const [options, setOptions] = useState<ApiOptions>({
    scales: [],
    tunings: [],
    styles: [],
    patterns: [],
  });
  const [generatedTab, setGeneratedTab] = useState<GeneratedTab | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch API options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [scalesRes, tuningsRes, stylesRes, patternsRes] = await Promise.all([
          fetch(`${API_URL}/scales`),
          fetch(`${API_URL}/tunings`),
          fetch(`${API_URL}/styles`),
          fetch(`${API_URL}/patterns`),
        ]);

        const [scales, tunings, styles, patterns] = await Promise.all([
          scalesRes.json(),
          tuningsRes.json(),
          stylesRes.json(),
          patternsRes.json(),
        ]);

        setOptions({
          scales: scales.scales || [],
          tunings: tunings.tunings || [],
          styles: styles.styles || [],
          patterns: patterns.patterns || [],
        });
      } catch (err) {
        setError('Failed to load options from API');
        console.error(err);
      }
    };

    fetchOptions();
  }, []);

  const handleGenerate = async (params: Record<string, string | number>) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/generate-tab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error('Failed to generate tab');
      }

      const data = await response.json();
      setGeneratedTab(data);
    } catch (err) {
      setError('Failed to generate riff. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedTab) return;

    const content = `Guitar Model Lab - Generated Riff
=====================================
Root: ${generatedTab.root}
Scale: ${generatedTab.scale}
Pattern: ${generatedTab.pattern}
Tempo: ${generatedTab.tempo} BPM
Tuning: ${generatedTab.tuning}
Bars: ${generatedTab.bars}

${generatedTab.tab}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riff-${generatedTab.root}-${generatedTab.scale}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[--color-void]">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Header */}
      <Header />

      {/* Hero Section with 3D */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <Scene3D />
        <div className="relative z-10 text-center px-6">
          <p className="eyebrow animate-fade-up animate-delay-1 mb-4">
            Algorithmic Riff Generation
          </p>
          <h1 className="font-display text-5xl md:text-7xl text-[--color-text-primary] animate-fade-up animate-delay-2 mb-4">
            Guitar <span className="font-display-italic text-[--color-accent]">Model</span> Lab
          </h1>
          <p className="text-[--color-text-secondary] max-w-xl mx-auto animate-fade-up animate-delay-3">
            Generate guitar riffs using music theory algorithms. Select your scale, style, and pattern — the AI handles the rest.
          </p>
        </div>
      </section>

      {/* Accent line */}
      <div className="accent-line" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-400"
          >
            {error}
          </motion.div>
        )}

        <div className="grid lg:grid-cols-[380px_1fr] gap-8">
          {/* Control Panel */}
          <div className="animate-fade-up animate-delay-4">
            <ControlPanel
              options={options}
              onGenerate={handleGenerate}
              isLoading={isLoading}
            />
          </div>

          {/* Output Area */}
          <div className="animate-fade-up animate-delay-5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl text-[--color-text-primary]">
                Generated <span className="font-display-italic text-[--color-accent]">Output</span>
              </h2>
              <AnimatePresence>
                {generatedTab && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex gap-2"
                  >
                    <button
                      className="btn-secondary flex items-center gap-2"
                      onClick={() => handleGenerate({
                        root: generatedTab.root,
                        scale: generatedTab.scale,
                        pattern: generatedTab.pattern,
                        tempo: generatedTab.tempo,
                        bars: generatedTab.bars,
                        tuning: generatedTab.tuning,
                        style: 'metal',
                      })}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </button>
                    <button
                      className="btn-secondary flex items-center gap-2"
                      onClick={handleDownload}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <TabDisplay tab={generatedTab} isLoading={isLoading} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[--color-border] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[--color-text-muted]">
            © 2026 Guitar Model Lab. Built with music theory + algorithms.
          </p>
          <p className="text-sm text-[--color-text-muted]">
            API: <span className="text-[--color-accent]">guitar-model-lab.onrender.com</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
