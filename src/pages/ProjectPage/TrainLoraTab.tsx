import React from 'react';
import { AppState } from '../../interfaces/AppState';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import { upsertAndStartJob, upsertJob, pollJobRunning, getJobLog, DEFAULT_BASE_URL } from '../../utils/aiToolkitClient';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Chip from '@mui/material/Chip';

interface TrainLoraTabProps {
  appState: AppState;
}

// Placeholder UI for future LoRA training integration
const TrainLoraTab: React.FC<TrainLoraTabProps> = ({ appState }) => {
  const [aitkBaseUrl, setAitkBaseUrl] = React.useState(DEFAULT_BASE_URL);
  const [gpuIds, setGpuIds] = React.useState('0');
  const [status, setStatus] = React.useState<string>('');
  const [jobId, setJobId] = React.useState<string>('');
  const [log, setLog] = React.useState<string>('');
  const [size, setSize] = React.useState<number>(1024);
  const [expandedPrimary, setExpandedPrimary] = React.useState<boolean>(true);
  const [expandedDerived, setExpandedDerived] = React.useState<boolean>(false);
  const [derived, setDerived] = React.useState({
    basePath: 'D:/ai-toolkit',
    venvPath: 'D:/ai-toolkit/.venv',
    outputPath: 'D:/ai-toolkit/output',
    datasetFolder: `D:/ai-toolkit/datasets/${appState.projectName}`,
  });
  const [vars, setVars] = React.useState({
    TRAINING_FOLDER: 'D:/ai-toolkit/output',
    DATASET_FOLDER: `D:/ai-toolkit/datasets/${appState.projectName}`,
    MODEL_NAME: 'black-forest-labs/FLUX.1-Krea-dev',
    RANK: 16,
    STEPS: 4500,
    LR: 0.0001,
    QUANTIZE: true as boolean,
    WIDTH: 1024,
    HEIGHT: 1024,
    SAMPLE_EVERY: 250,
    SAMPLE_STEPS: 20,
  });

  // Load settings to derive base, .venv, output and dataset paths
  React.useEffect(() => {
    (async () => {
      try {
        const settings = await window.electronAPI.getSettings();
        // aiToolkitDatasetsPath example: D:\ai-toolkit\datasets
        const ds = settings.aiToolkitDatasetsPath || 'D:/ai-toolkit/datasets';
        // Normalize slashes
        const norm = ds.replace(/\\/g, '/');
        const parts = norm.split('/');
        let base = norm;
        if (parts[parts.length - 1].toLowerCase() === 'datasets') {
          base = parts.slice(0, -1).join('/');
        }
        if (!base) base = 'D:/ai-toolkit';
        const venv = `${base}/.venv`;
        const out = `${base}/output`;
        const datasetFolder = `${base}/datasets/${appState.projectName}`;
        setDerived({ basePath: base, venvPath: venv, outputPath: out, datasetFolder });
        setVars(v => ({ ...v, TRAINING_FOLDER: out, DATASET_FOLDER: datasetFolder }));
      } catch {
        // keep defaults
      }
    })();
  }, [appState.projectName]);
  const [busy, setBusy] = React.useState(false);

  // ---- Training Calculator State ----
  type Locks = { batchSize: boolean; steps: boolean; epochs: boolean; lr: boolean };
  const initialDatasetSize = (Array.isArray((appState as any).grids)
    ? ((appState as any).grids as any[]).flat?.().filter(Boolean).length || 50
    : 50);
  const [datasetSize, setDatasetSize] = React.useState<number>(initialDatasetSize);
  const [locks, setLocks] = React.useState<Locks>({ batchSize: true, steps: true, epochs: true, lr: false });
  const [calcValues, setCalcValues] = React.useState<{ batchSize: number; steps: number; epochs: number; lr: number }>(
    { batchSize: 1, steps: vars.STEPS, epochs: 0, lr: vars.LR }
  );
  const [baseline, setBaseline] = React.useState<{ lr: number; batchSize: number; steps: number }>(
    { lr: 0.00007, batchSize: 1, steps: vars.STEPS }
  );
  const [autoAdjustLR, setAutoAdjustLR] = React.useState<boolean>(true);
  const [mode, setMode] = React.useState<'fast' | 'balanced' | 'quality' | 'custom'>('balanced');

  const getUnlocked = (l: Locks) => Object.entries(l).filter(([_, v]) => !v).map(([k]) => k as keyof Locks);

  function calcParams(
    ds: number,
    values: { batchSize?: number; steps?: number; epochs?: number; lr?: number },
    lcks: Locks,
    base: { lr: number; batchSize: number; steps: number } = { lr: 0.00007, batchSize: 1, steps: 4500 }
  ) {
    const unlocked = getUnlocked(lcks);
    if (unlocked.length !== 1) throw new Error('Precies één veld moet ontgrendeld zijn');
    let { batchSize = 0, steps = 0, epochs = 0, lr = 0 } = values;
    const target = unlocked[0];
    switch (target) {
      case 'epochs':
        epochs = ds > 0 ? (steps * batchSize) / ds : 0;
        break;
      case 'steps':
        steps = batchSize > 0 ? Math.ceil((epochs * ds) / batchSize) : 0;
        break;
      case 'batchSize':
        batchSize = steps > 0 ? Math.ceil((epochs * ds) / steps) : 0;
        break;
      case 'lr':
        {
          const safeSteps = steps || base.steps || 1;
          const stepScale = (base.steps || 1) / safeSteps; // more steps => lower LR
          lr = base.lr * (batchSize / base.batchSize) * stepScale;
        }
        break;
    }
    return { batchSize, steps, epochs, lr };
  }

  const setOnlyUnlocked = (key: keyof Locks) => {
    setLocks({ batchSize: true, steps: true, epochs: true, lr: true, [key]: false } as Locks);
  };

  const recommendLR = (steps: number, batchSize: number) => {
    const safeSteps = steps || baseline.steps || 1;
    const stepScale = (baseline.steps || 1) / safeSteps; // more steps => lower LR
    return baseline.lr * (batchSize / baseline.batchSize) * stepScale;
  };

  const targetEpochsForMode = (m: typeof mode) => {
    switch (m) {
      case 'fast': return 30;
      case 'quality': return 100;
      case 'balanced': return 60;
      default: return 60;
    }
  };

  const applyRecommendation = () => {
    if (mode === 'custom') return;
    const ep = targetEpochsForMode(mode);
    const bs = calcValues.batchSize || 1;
    const newSteps = Math.ceil((ep * (datasetSize || 1)) / bs);
    const newLR = recommendLR(newSteps, bs);
    setCalcValues(v => ({ ...v, steps: newSteps, epochs: ep, lr: newLR }));
  };

  const recompute = (nextValues?: Partial<typeof calcValues>, nextLocks?: Partial<Locks>, nextDs?: number) => {
    const ds = nextDs ?? datasetSize;
    const newLocks = { ...locks, ...(nextLocks || {}) } as Locks;
    const values = { ...calcValues, ...(nextValues || {}) };
    try {
      const out = calcParams(ds, values, newLocks, { lr: baseline.lr, batchSize: baseline.batchSize, steps: baseline.steps });
      setCalcValues(out);
      // Auto-update epochs when not the unlocked field to keep UI consistent
      if (getUnlocked(newLocks)[0] !== 'epochs') {
        const ep = ds > 0 ? (out.steps * out.batchSize) / ds : 0;
        if (!Number.isNaN(ep)) setCalcValues(prev => ({ ...prev, epochs: ep }));
      }
      // Optionally auto-adjust LR when steps or batch size change
      const unlocked = getUnlocked(newLocks)[0];
      if (autoAdjustLR && unlocked !== 'lr') {
        const lrRec = recommendLR(out.steps, out.batchSize);
        setCalcValues(prev => ({ ...prev, lr: lrRec }));
      }
    } catch {
      // ignore until exactly one unlocked
      setCalcValues(values as any);
    }
  };

  const zone = React.useMemo(() => {
    const e = calcValues.epochs || 0;
    if (e <= 0 || !Number.isFinite(e)) return { label: 'Onbekend', color: 'default' as const, emoji: '⚪' };
    if (e < 20) return { label: 'Laag', color: 'default' as const, emoji: '⚪' };
    if (e <= 60) return { label: 'Veilig', color: 'success' as const, emoji: '🟢' };
    if (e <= 120) return { label: 'Voorzichtig', color: 'warning' as const, emoji: '🟡' };
    if (e <= 200) return { label: 'Risico', color: 'warning' as const, emoji: '🟠' };
    return { label: 'Hoog risico', color: 'error' as const, emoji: '🔴' };
  }, [calcValues.epochs]);

  const tips = React.useMemo(() => {
    switch (zone.label) {
      case 'Veilig':
        return 'Lage kans op overfit. Prima startpunt.';
      case 'Voorzichtig':
        return 'Goed voor kleine datasets; monitor samples en stop vroeg bij overfit.';
      case 'Risico':
        return 'Hogere kans op overfit; maak captions divers en check regelmatig.';
      case 'Hoog risico':
        return 'Grote kans op memorisatie; verlaag stappen of batch size, of vergroot dataset.';
      default:
        return 'Vul waarden in om de zone te zien.';
    }
  }, [zone.label]);

  const lrZone = React.useMemo(() => {
    const lr = calcValues.lr;
    const base = baseline.lr || 0.00007;
    if (!Number.isFinite(lr) || lr <= 0) return { label: 'LR te laag', color: 'default' as const, emoji: '⚪' };
    const ratio = lr / base;
    if (ratio < 0.5) return { label: 'LR laag', color: 'default' as const, emoji: '⚪' };
    if (ratio <= 1.5) return { label: 'LR normaal', color: 'success' as const, emoji: '🟢' };
    if (ratio <= 3) return { label: 'LR voorzichtig', color: 'warning' as const, emoji: '🟡' };
    return { label: 'LR hoog', color: 'error' as const, emoji: '🔴' };
  }, [calcValues.lr, baseline.lr]);

  const applyToPrimary = () => {
    // Push STEPS and LR into primary vars; batch size is fixed at 1 in config for now
    setVars(v => ({ ...v, STEPS: Math.max(1, Math.floor(calcValues.steps)), LR: calcValues.lr }));
  };

  // Epochs are always derived; LR is the computed field by default.

  // Simple minimal job config builder placeholder (JSON-based). Later we can convert from YAML.
  const buildJobConfig = () => {
    const jobName = `${appState.projectName}_lora_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    return {
      job: 'extension',
      config: {
        name: jobName,
        process: [
          {
            type: 'ui_trainer',
            training_folder: vars.TRAINING_FOLDER,
            device: 'cuda',
            network: { type: 'lora', linear: vars.RANK, linear_alpha: vars.RANK },
            save: { dtype: 'float16', save_every: vars.SAMPLE_EVERY, max_step_saves_to_keep: 4, push_to_hub: false },
            datasets: [
              {
                folder_path: vars.DATASET_FOLDER,
                caption_ext: 'txt',
                caption_dropout_rate: 0.05,
                shuffle_tokens: false,
                cache_latents_to_disk: true,
                resolution: [512, 768, 1024],
              },
            ],
            train: {
              batch_size: 1,
              steps: vars.STEPS,
              gradient_accumulation_steps: 1,
              train_unet: true,
              train_text_encoder: false,
              gradient_checkpointing: true,
              noise_scheduler: 'flowmatch',
              optimizer: 'adamw8bit',
              lr: vars.LR,
              ema_config: { use_ema: true, ema_decay: 0.99 },
              dtype: 'bf16',
            },
            model: { name_or_path: vars.MODEL_NAME, is_flux: true, quantize: vars.QUANTIZE },
            sample: {
              sampler: 'flowmatch',
              sample_every: vars.SAMPLE_EVERY,
              width: vars.WIDTH,
              height: vars.HEIGHT,
              prompts: [
                `${appState.descriptions.loraTrigger || appState.projectName}, portrait, studio lighting`,
              ],
              neg: '',
              seed: 42,
              walk_seed: true,
              guidance_scale: 4,
              sample_steps: vars.SAMPLE_STEPS,
            },
          },
        ],
      },
    };
  };

  const handleCreateAndStart = async () => {
    setBusy(true);
    setStatus('Creating job...');
    try {
      const name = `${appState.projectName}_lora`;
      const jobConfig = buildJobConfig();
      const { id } = await upsertAndStartJob({ baseUrl: aitkBaseUrl, name, gpuIDs: gpuIds, jobConfig });
      setJobId(id);
      setStatus(`Launched job ID: ${id}. Waiting for running...`);
      try {
        const job = await pollJobRunning(id, { baseUrl: aitkBaseUrl, timeoutSec: 30, intervalMs: 1000 });
        setStatus(`Status: ${job.status}${job.info ? ` (${job.info})` : ''}`);
      } catch (e: any) {
        setStatus(`Polling error: ${e?.message || String(e)}`);
      }
    } catch (e: any) {
      setStatus(`Error: ${e?.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshLog = async () => {
    if (!jobId) return;
    try {
      const res = await getJobLog(jobId, aitkBaseUrl);
      setLog(res.log || '');
    } catch (e: any) {
      setLog(`Log error: ${e?.message || String(e)}`);
    }
  };

  const handleExportDatasetToAiToolkit = async () => {
    try {
      setBusy(true);
      setStatus('Exporting dataset to AI Toolkit...');
      const { convertGridsForExport } = await import('../../utils/convertGridsForExport');
      const exportGrids = convertGridsForExport(appState.grids);
      const res = await window.electronAPI.exportToAiToolkit(appState.projectName, exportGrids, appState);
      if (res && res.success && res.folderPath) {
        const path = res.folderPath.replace(/\\/g, '/');
        setVars(v => ({ ...v, DATASET_FOLDER: path }));
        setDerived(d => ({ ...d, datasetFolder: path }));
        setStatus('Exported dataset; path updated.');
      } else {
        setStatus('Export failed');
      }
    } catch (e: any) {
      setStatus(`Export error: ${e?.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl text-white mb-4">Train LoRA</h2>
      <Alert severity="info" sx={{ mb: 2 }}>
        Connects to AI Toolkit at {aitkBaseUrl}. You can create/update and start a job from here.
      </Alert>
      {/* Primary parameters */}
      <Accordion expanded={expandedPrimary} onChange={(_, ex) => setExpandedPrimary(ex)} sx={{ backgroundColor: '#1e1e1e', color: 'white', mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#90caf9' }} />}>
          Primary Parameters
        </AccordionSummary>
        <AccordionDetails>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <TextField fullWidth label="GPU IDs" value={gpuIds} onChange={(e) => setGpuIds(e.target.value)} sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }} InputLabelProps={{ style: { color: '#90caf9' } }} />
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#90caf9' }}>Square Size</InputLabel>
              <Select
                label="Square Size"
                value={size}
                onChange={(e) => { const val = Number(e.target.value); setSize(val); setVars(v => ({ ...v, WIDTH: val, HEIGHT: val })); }}
                sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' } }}
              >
                <MenuItem value={512}>512 × 512</MenuItem>
                <MenuItem value={768}>768 × 768</MenuItem>
                <MenuItem value={1024}>1024 × 1024</MenuItem>
              </Select>
            </FormControl>
            {/* Dataset folder with inline export button */}
            <div className="col-span-2">
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  fullWidth
                  label="Dataset Folder"
                  value={vars.DATASET_FOLDER}
                  onChange={(e) => setVars(v => ({ ...v, DATASET_FOLDER: e.target.value }))}
                  sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }}
                  InputLabelProps={{ style: { color: '#90caf9' } }}
                />
                <Button variant="outlined" onClick={handleExportDatasetToAiToolkit} disabled={busy}>
                  Export to AI Toolkit
                </Button>
              </Stack>
            </div>
            <TextField
              fullWidth
              label="STEPS"
              type="number"
              value={vars.STEPS}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') return;
                const n = Number(val);
                if (Number.isNaN(n)) return;
                setVars(v => ({ ...v, STEPS: n }));
                // sync calculator steps and optionally LR
                const bs = calcValues.batchSize || 1;
                if (autoAdjustLR) {
                  const newLR = (baseline.lr * (bs / baseline.batchSize) * ((baseline.steps || 1) / (n || 1)));
                  setCalcValues(cv => ({ ...cv, steps: n, epochs: (datasetSize > 0 ? (n * bs) / datasetSize : 0), lr: newLR }));
                } else {
                  setCalcValues(cv => ({ ...cv, steps: n, epochs: (datasetSize > 0 ? (n * bs) / datasetSize : 0) }));
                }
              }}
              sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }}
              InputLabelProps={{ style: { color: '#90caf9' } }}
            />
            <TextField fullWidth label="RANK" type="number" value={vars.RANK} onChange={(e) => setVars(v => ({ ...v, RANK: Number(e.target.value) }))} sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }} InputLabelProps={{ style: { color: '#90caf9' } }} />
            <TextField
              fullWidth
              label="LR"
              type="number"
              value={vars.LR}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') return;
                const n = Number(val);
                if (Number.isNaN(n)) return;
                setVars(v => ({ ...v, LR: n }));
                setCalcValues(cv => ({ ...cv, lr: n }));
              }}
              sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }}
              InputLabelProps={{ style: { color: '#90caf9' } }}
            />
            <TextField fullWidth label="MODEL_NAME" value={vars.MODEL_NAME} onChange={(e) => setVars(v => ({ ...v, MODEL_NAME: e.target.value }))} sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }} InputLabelProps={{ style: { color: '#90caf9' } }} />
            <FormControlLabel control={<Checkbox checked={!!vars.QUANTIZE} onChange={(e) => setVars(v => ({ ...v, QUANTIZE: e.target.checked }))} />} label="Quantize" />
          </div>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="contained" color="primary" onClick={handleCreateAndStart} disabled={busy}>
              Create/Update & Start Job
            </Button>
            {busy && <CircularProgress size={20} />}
            {!!status && <span className="text-gray-300">{status}</span>}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Derived/Advanced parameters */}
      <Accordion expanded={expandedDerived} onChange={(_, ex) => setExpandedDerived(ex)} sx={{ backgroundColor: '#1e1e1e', color: 'white', mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#90caf9' }} />}>
          Derived Paths & Advanced
        </AccordionSummary>
        <AccordionDetails>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <TextField fullWidth label="AI Toolkit Base Path" value={derived.basePath} InputProps={{ readOnly: true }} sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }} InputLabelProps={{ style: { color: '#90caf9' } }} />
            <TextField fullWidth label=".venv Path" value={derived.venvPath} InputProps={{ readOnly: true }} sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }} InputLabelProps={{ style: { color: '#90caf9' } }} />
            <TextField fullWidth label="Training Output Path" value={derived.outputPath} InputProps={{ readOnly: true }} sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }} InputLabelProps={{ style: { color: '#90caf9' } }} />
            <TextField fullWidth label="Dataset Folder" value={derived.datasetFolder} InputProps={{ readOnly: true }} sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }} InputLabelProps={{ style: { color: '#90caf9' } }} />
            <TextField fullWidth label="AI Toolkit Base URL" value={aitkBaseUrl} onChange={(e) => setAitkBaseUrl(e.target.value)} sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }} InputLabelProps={{ style: { color: '#90caf9' } }} />
          </div>
          {/* Show the JSON that will be sent (optional, for review) */}
          <pre className="bg-black text-green-400 p-3 rounded max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(buildJobConfig(), null, 2)}</pre>
        </AccordionDetails>
      </Accordion>

      {/* Training Calculator */}
      <Accordion defaultExpanded sx={{ backgroundColor: '#1e1e1e', color: 'white', mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#90caf9' }} />}>
          Training Calculator — Epochs & Balans
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info" sx={{ mb: 2 }}>
            Epochs = (steps × batch_size) / dataset_size. Vergrendel velden en laat er precies één vrij; bij wijzigingen wordt het vrije veld herberekend.
          </Alert>
  <div className="grid grid-cols-2 gap-4 mb-2">
            <TextField
              fullWidth
              label="Dataset size (aantal afbeeldingen)"
              type="number"
              value={datasetSize}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') return; // ignore empty while typing
                const ds = Number(val);
                if (!Number.isNaN(ds)) { setDatasetSize(ds); recompute(undefined, undefined, ds); }
              }}
              sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }}
              InputLabelProps={{ style: { color: '#90caf9' } }}
            />


            <FormControl fullWidth>
              <InputLabel sx={{ color: '#90caf9' }}>Modus</InputLabel>
              <Select
                label="Modus"
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
                sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' } }}
              >
                <MenuItem value={'fast'}>Snel</MenuItem>
                <MenuItem value={'balanced'}>Gebalanceerd</MenuItem>
                <MenuItem value={'quality'}>Kwaliteit</MenuItem>
                <MenuItem value={'custom'}>Custom</MenuItem>
              </Select>
            </FormControl>

            <div className="col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Steps */}
              <div className="flex items-center gap-2">
                <TextField
                  fullWidth
                  label="Steps"
                  type="number"
                  value={calcValues.steps}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') return;
                    const n = Number(val);
                    if (!Number.isNaN(n)) recompute({ steps: n });
                  }}
                  helperText={'Invoer'}
                  sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }}
                  InputLabelProps={{ style: { color: '#90caf9' } }}
                />
              </div>

              {/* Batch Size */}
              <div className="flex items-center gap-2">
                <TextField
                  fullWidth
                  label="Batch Size"
                  type="number"
                  value={calcValues.batchSize}
                  onChange={() => { /* fixed at 1 for job config; not editable */ }}
                  disabled
                  helperText={'Vast: 1'}
                  sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }}
                  InputLabelProps={{ style: { color: '#90caf9' } }}
                />
              </div>

              {/* Epochs */}
              <div className="flex items-center gap-2">
                <TextField
                  fullWidth
                  label="Epochs"
                  type="number"
                  value={Number.isFinite(calcValues.epochs) ? Number(calcValues.epochs.toFixed(2)) : 0}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') return;
                    const ep = Number(val);
                    if (!Number.isNaN(ep)) recompute({ epochs: ep });
                  }}
                  disabled
                  helperText={'Berekend'}
                  sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }}
                  InputLabelProps={{ style: { color: '#90caf9' } }}
                />
              </div>

              {/* Learning Rate */}
              <div className="flex items-center gap-2">
                <TextField
                  fullWidth
                  label="Learning Rate"
                  type="number"
                  value={calcValues.lr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') return;
                    const lr = Number(val);
                    if (!Number.isNaN(lr)) {
                      if (autoAdjustLR) return; // ignore manual edits when auto mode
                      setCalcValues(cv => ({ ...cv, lr }));
                    }
                  }}
                  disabled={autoAdjustLR}
                  helperText={autoAdjustLR ? 'Berekend' : `Invoer • Aanbevolen: ${recommendLR(calcValues.steps, calcValues.batchSize).toExponential(5)}`}
                  sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }}
                  InputLabelProps={{ style: { color: '#90caf9' } }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <Chip color={zone.color} label={`Epochs: ${Number.isFinite(calcValues.epochs) ? calcValues.epochs.toFixed(2) : '—'} • ${zone.emoji} ${zone.label}`} />
            <Chip color={lrZone.color} label={`LR: ${calcValues.lr} • ${lrZone.emoji} ${lrZone.label}`} />
            <span className="text-gray-300 text-sm">{tips}</span>
          </div>

          <div className="text-gray-400 text-sm mb-2">
            <div>LR scaling: lr_nieuw = lr_basis × (batch_size_nieuw / batch_size_basis).</div>
            <div>Stappen bij LR-verandering (indicatie): steps_nieuw ≈ steps_basis × (lr_basis / lr_nieuw).</div>
            <div>Huidige basis: lr_basis = {baseline.lr}, batch_size_basis = {baseline.batchSize}, steps_basis = {baseline.steps}</div>
          </div>

          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="outlined" onClick={() => setBaseline({ lr: calcValues.lr, batchSize: calcValues.batchSize, steps: calcValues.steps })}>
              Stel huidige waarden in als basis
            </Button>
            <FormControlLabel control={<Checkbox checked={autoAdjustLR} onChange={(e) => setAutoAdjustLR(e.target.checked)} />} label="Auto-aanpassen LR bij Steps" />
            {mode !== 'custom' && (
              <Button variant="outlined" onClick={applyRecommendation}>Pas aanbeveling toe</Button>
            )}
            <Button variant="contained" onClick={applyToPrimary}>Pas toe op STEPS/LR</Button>
          </Stack>
        </AccordionDetails>
      </Accordion>
      {jobId && (
        <div className="mt-4">
          <Stack direction="row" spacing={2} alignItems="center" className="mb-2">
            <Button variant="outlined" onClick={handleRefreshLog}>Refresh Log</Button>
            <span className="text-gray-400">Job ID: {jobId}</span>
          </Stack>
          <pre className="bg-black text-green-400 p-3 rounded max-h-64 overflow-auto whitespace-pre-wrap">{log || 'No log yet...'}</pre>
        </div>
      )}
    </div>
  );
};

export default TrainLoraTab;
