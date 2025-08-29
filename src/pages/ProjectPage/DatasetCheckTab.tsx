import React from 'react';
import { AppState } from '../../interfaces/AppState';

interface DistributionRow {
  key: 'close' | 'medium' | 'wide';
  label: string;
  actualPct: number;
  idealPct: number;
  deltaPct: number; // actual - ideal
  stars: number; // 0-5
  status: 'green' | 'yellow' | 'red';
  count: number;
  targetRange: [number, number];
  neededDiff: number; // + means need more, - means excess
}

interface DatasetCheckTabProps {
  appState: AppState;
}

// Utility scoring
function scoreStars(delta: number, inRange: boolean): number {
  if (inRange) return 5;
  const ad = Math.abs(delta);
  if (ad <= 5) return 4;
  if (ad <= 10) return 3;
  if (ad <= 20) return 2;
  if (ad <= 30) return 1;
  return 0;
}

function statusColor(delta: number, inRange: boolean): 'green' | 'yellow' | 'red' {
  if (inRange) return 'green';
  if (Math.abs(delta) <= 10) return 'yellow';
  return 'red';
}

function grade(overall: number): string {
  if (overall >= 4.5) return 'A+';
  if (overall >= 4.0) return 'A';
  if (overall >= 3.5) return 'B';
  if (overall >= 2.5) return 'C';
  if (overall >= 1.5) return 'D';
  return 'E';
}

const DatasetCheckTab: React.FC<DatasetCheckTabProps> = ({ appState }) => {
  // Collect shots
  const allSlots = Object.values(appState.grids).flat().filter((s): s is NonNullable<typeof s> => !!s && !!s.metadata && !!s.metadata.shotType);
  const totalDetected = allSlots.length;
  // Counts
  const closeCount = allSlots.filter(s => ['close','extreme-close'].includes(s.metadata!.shotType)).length;
  const mediumCount = allSlots.filter(s => s.metadata!.shotType === 'medium').length;
  const wideCount = allSlots.filter(s => s.metadata!.shotType === 'wide').length;
  const totalImages = Object.values(appState.grids).flat().filter(Boolean).length;
  const captioned = Object.values(appState.grids).flat().filter(s => s && s.caption && s.caption.trim()).length;
  const withFullMetadata = Object.values(appState.grids).flat().filter(s => s && s.metadata && s.metadata.shotType && s.metadata.angle && s.metadata.lighting && s.metadata.environment && s.metadata.mood && s.metadata.action).length;

  const pct = (count: number) => totalDetected ? (count / totalDetected) * 100 : 0;

  // Ideal definitions
  const ideals = {
    close: { ideal: 45, range: [40,50] as [number,number] },
    medium: { ideal: 25, range: [20,30] as [number,number] },
    wide: { ideal: 30, range: [20,30] as [number,number] },
  };

  const rows: DistributionRow[] = [
    { key: 'close' as const, label: 'Close', count: closeCount, idealPct: ideals.close.ideal, targetRange: ideals.close.range, actualPct: pct(closeCount), deltaPct: pct(closeCount) - ideals.close.ideal, stars: 0, status: 'red', neededDiff: 0 },
    { key: 'medium' as const, label: 'Medium', count: mediumCount, idealPct: ideals.medium.ideal, targetRange: ideals.medium.range, actualPct: pct(mediumCount), deltaPct: pct(mediumCount) - ideals.medium.ideal, stars: 0, status: 'red', neededDiff: 0 },
    { key: 'wide' as const, label: 'Wide', count: wideCount, idealPct: ideals.wide.ideal, targetRange: ideals.wide.range, actualPct: pct(wideCount), deltaPct: pct(wideCount) - ideals.wide.ideal, stars: 0, status: 'red', neededDiff: 0 },
  ].map(r => {
    const inRange = r.actualPct >= r.targetRange[0] && r.actualPct <= r.targetRange[1];
    const stars = scoreStars(r.deltaPct, inRange);
    const status = statusColor(r.deltaPct, inRange);
    // Needed diff in counts to reach nearest point in range
    let neededDiff = 0;
    if (r.actualPct < r.targetRange[0]) {
      const targetPct = r.targetRange[0];
      neededDiff = Math.ceil((targetPct - r.actualPct)/100 * totalDetected);
    } else if (r.actualPct > r.targetRange[1]) {
      const targetPct = r.targetRange[1];
      neededDiff = -Math.ceil((r.actualPct - targetPct)/100 * totalDetected);
    }
    return { ...r, stars, status, neededDiff };
  });

  const overallStars = rows.reduce((acc, r) => acc + r.stars * (ideals[r.key].ideal/100), 0);
  const overallGrade = grade(overallStars);

  // Recommendations
  const recommendations: string[] = [];
  rows.forEach(r => {
    if (r.neededDiff > 0) {
      recommendations.push(`Add +${r.neededDiff} ${r.label.toLowerCase()} images to reach balance.`);
    } else if (r.neededDiff < 0) {
      recommendations.push(`Reduce or diversify (remove ~${Math.abs(r.neededDiff)}) ${r.label.toLowerCase()} images.`);
    }
  });
  if (totalDetected === 0) recommendations.push('No metadata yet – generate metadata first.');

  // Lighting health (simple): flag if any lighting category < 5 when totalDetected >= 30
  if (totalDetected >= 30) {
    const lightingCounts: Record<string, number> = {};
    allSlots.forEach(s => { const l = s.metadata!.lighting; if (!l) return; lightingCounts[l] = (lightingCounts[l]||0)+1; });
    ['daylight','indoor','night','sunset','studio'].forEach(l => {
      if ((lightingCounts[l]||0) < 5) recommendations.push(`Lighting '${l}' low (${lightingCounts[l]||0}/5). Add more for variety.`);
    });
  }

  // Training readiness table (steps = totalDetected * preset factor)
  const steps = (factor: number) => totalDetected * factor;
  const trainingRows = [
    { preset: 'Fast', stepsPerImg: 15, lr: '1.0e-4', rank: '16 / on', ema: '0.99', captionDropout: '0.00–0.05', resolutions: '512, 768, 1024', notes: 'Quick turnaround; checkpoint often' },
    { preset: 'Medium', stepsPerImg: 25, lr: '8.0e-5', rank: '32 / on', ema: '0.99', captionDropout: '0.05–0.10', resolutions: '512, 768, 1024', notes: 'Balanced; sweet spot' },
    { preset: 'High', stepsPerImg: 40, lr: '7.0e-5', rank: '32–48 / on', ema: '0.99', captionDropout: '0.00–0.05', resolutions: '512, 768, 1024, 1280', notes: 'Highest likeness; more VRAM' },
  ];

  return (
    <div className="space-y-10">
      <h2 className="text-2xl font-bold">Dataset Check</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl">
        {[
          { label: 'Total Images', value: totalImages },
          { label: 'Detected (with shotType)', value: totalDetected },
          { label: 'Captioned', value: `${captioned} (${totalImages?Math.round(captioned/totalImages*100):0}%)` },
          { label: 'Complete Metadata', value: `${withFullMetadata} (${totalImages?Math.round(withFullMetadata/totalImages*100):0}%)` },
        ].map(c => (
          <div key={c.label} className="p-4 rounded bg-[#262b30] border border-[#3a4045]">
            <div className="text-xs opacity-70 mb-1">{c.label}</div>
            <div className="text-lg font-semibold">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Balance Assessment */}
      <section>
        <h3 className="text-xl font-semibold mb-2">Balance Assessment</h3>
        <div className="text-sm leading-relaxed whitespace-pre-line mb-4 opacity-80">
          {`Close-ups target 45% (range 40–50)\nMediums target 25% (range 20–30)\nWides target 30% (range 20–30)\nDetected images: ${totalDetected}\nCurrent mix: ${totalDetected?`${Math.round(pct(closeCount))}% close / ${Math.round(pct(mediumCount))}% medium / ${Math.round(pct(wideCount))}% wide`:'n/a'}\nOverall score: ${overallStars.toFixed(1)}/5.0 (${overallGrade})`}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[600px] text-sm border border-[#333] rounded overflow-hidden">
            <thead className="bg-[#1f2428]">
              <tr className="text-left">
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Your %</th>
                <th className="py-2 px-3">Ideal %</th>
                <th className="py-2 px-3">Delta</th>
                <th className="py-2 px-3">Stars</th>
                <th className="py-2 px-3">Needed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key} className="border-t border-[#333]">
                  <td className="py-1.5 px-3">{r.label}</td>
                  <td className="py-1.5 px-3">{r.actualPct.toFixed(0)}%</td>
                  <td className="py-1.5 px-3">{r.idealPct}%</td>
                  <td className={`py-1.5 px-3 ${r.deltaPct===0?'':' '}${r.deltaPct>0?'text-green-400':(r.deltaPct<0?'text-red-400':'')}`}>{r.deltaPct>0?`+${r.deltaPct.toFixed(0)}`:r.deltaPct.toFixed(0)}%</td>
                  <td className="py-1.5 px-3">{'★★★★★'.slice(0,r.stars) || '—'}</td>
                  <td className="py-1.5 px-3">{r.neededDiff===0?'—':(r.neededDiff>0?`+${r.neededDiff}`:r.neededDiff)}</td>
                </tr>
              ))}
              <tr className="border-t border-[#444] bg-[#1f2428] font-semibold">
                <td className="py-2 px-3">Weighted</td>
                <td className="py-2 px-3">Overall Score</td>
                <td className="py-2 px-3" colSpan={2}>{overallStars.toFixed(1)}</td>
                <td className="py-2 px-3" colSpan={2}>{overallGrade}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs opacity-60">Ideal mix targets: Close 45% (range 40–50), Medium 25% (20–30), Wide 30% (20–30). Stars rewarded for being inside range, then distance bands (±5, ±10, ±20%).</div>
      </section>

      {/* Training Readiness */}
      <section>
        <h3 className="text-xl font-semibold mb-2">Training Readiness</h3>
        <div className="text-sm opacity-80 mb-3">Total detected images: {totalDetected} | Close: {closeCount} | Medium: {mediumCount} | Wide: {wideCount}</div>
        <div className="overflow-x-auto mb-2">
          <table className="min-w-[700px] text-xs border border-[#333] rounded">
            <thead className="bg-[#1f2428]">
              <tr className="text-left">
                <th className="py-2 px-2">Preset</th>
                <th className="py-2 px-2">Steps (≈/img)</th>
                <th className="py-2 px-2">LR</th>
                <th className="py-2 px-2">Rank / Linear</th>
                <th className="py-2 px-2">EMA</th>
                <th className="py-2 px-2">Caption Dropout</th>
                <th className="py-2 px-2">Resolutions</th>
                <th className="py-2 px-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {trainingRows.map(tr => (
                <tr key={tr.preset} className="border-t border-[#333]">
                  <td className="py-1.5 px-2 font-semibold">{tr.preset}</td>
                  <td className="py-1.5 px-2">{steps(tr.stepsPerImg)} ({tr.stepsPerImg})</td>
                  <td className="py-1.5 px-2">{tr.lr}</td>
                  <td className="py-1.5 px-2">{tr.rank}</td>
                  <td className="py-1.5 px-2">{tr.ema}</td>
                  <td className="py-1.5 px-2">{tr.captionDropout}</td>
                  <td className="py-1.5 px-2">{tr.resolutions}</td>
                  <td className="py-1.5 px-2">{tr.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs opacity-60">Checkpoint every 250 steps; many good checkpoints appear at 0.5–0.8 × medium total steps.</div>
      </section>

      {/* Recommendations */}
      <section>
        <h3 className="text-xl font-semibold mb-2">Recommendations</h3>
        {recommendations.length === 0 && <div className="text-sm opacity-70">All primary distribution targets look balanced.</div>}
        <ul className="list-disc ml-6 text-sm space-y-1">
          {recommendations.map((r,i)=>(<li key={i}>{r}</li>))}
        </ul>
      </section>

      {/* Orthogonal Coverage Report (appended, less prominent) */}
      <section>
        <h2 className="text-xl font-bold mt-12 mb-4 opacity-90">Orthogonal Coverage Report</h2>
        {(() => {
          // Reuse metadata slots
          const images = allSlots; // already filtered for metadata
          const N = images.length;
          const ANGLES = ['frontal','three-quarter','profile','back','low-angle','high-angle'] as const;
          const LIGHTING = ['daylight','indoor','night','sunset','studio'] as const;
          const ENVIRONMENT = ['neutral','indoor','outdoor','nature','city','sky'] as const;
          const ACTION = ['stand','sit','walk','gesture','hold-object','interact','none'] as const;
          const MOOD = ['neutral','smiling','serious','surprised','dreamy','stern','relaxed','contemplative'] as const;

          function tally<T extends readonly string[]>(values: T, getter: (im: typeof images[number]) => string) {
            const map: Record<string, number> = Object.fromEntries(values.map(v => [v,0]));
            images.forEach(im => { const v = getter(im); if (map[v] !== undefined) map[v]++; });
            return map as Record<T[number], number>;
          }
          const angleCounts = tally(ANGLES, im => im.metadata!.angle);
          const lightingCounts = tally(LIGHTING, im => im.metadata!.lighting);
          const environmentCounts = tally(ENVIRONMENT, im => im.metadata!.environment);
          const actionCounts = tally(ACTION, im => im.metadata!.action);
            const moodCounts = tally(MOOD, im => im.metadata!.mood);
          const badge = (c: number) => c >= 3 ? '✅' : c >=1 ? '⚠️' : '❌';
          const need = (c: number) => Math.max(0, 3 - c);
          const overRep = (map: Record<string,number>, thresholdPct=50) => Object.entries(map).filter(([_,c])=>N>0 && (c/N*100)>thresholdPct).map(([k,c])=>({k,pct: Math.round(c/N*100)}));

          const lightingOver = overRep(lightingCounts).map(o=>`Too many ${o.k} shots (${o.pct}%) → add daylight/indoor/sunset`);
          const envOver = overRep(environmentCounts).map(o=>`${o.k} dominates (${o.pct}%) → add indoor/neutral/city`);
          const frontalPct = N? Math.round(angleCounts['frontal']/N*100):0;
          const underAngles = ANGLES.filter(a=> a!=='frontal' && badge(angleCounts[a])!=='✅');
          const angleOver = (frontalPct>60 && underAngles.length)? [`Frontal ${frontalPct}% & other angles low → add ${underAngles.join('/')}`]:[];
          const standPct = N? Math.round(actionCounts['stand']/N*100):0;
          const diversifyActions = ACTION.filter(a=>a!=='stand' && badge(actionCounts[a])!=='✅');
          const actionOver = (standPct>70 && diversifyActions.length)? [`Stand ${standPct}% → add ${diversifyActions.join('/')}`]:[];

          const covAngles = { covered: ANGLES.filter(a=>angleCounts[a]>=3).length, total: ANGLES.length };
          const covLighting = { covered: LIGHTING.filter(l=>lightingCounts[l]>=3).length, total: LIGHTING.length };
          const covEnvironment = { covered: ENVIRONMENT.filter(e=>environmentCounts[e]>=3).length, total: ENVIRONMENT.length };
          const actionDiversity = ACTION.filter(a=>actionCounts[a]>=3).length;
          const moodDiversity = MOOD.filter(m=>moodCounts[m]>=3).length;
          const actionPct = Math.round(actionDiversity/ACTION.length*100);
          const moodPct = Math.round(moodDiversity/MOOD.length*100);
          const overallOrthogonal = Math.round(((covAngles.covered/covAngles.total)+(covLighting.covered/covLighting.total)+(covEnvironment.covered/covEnvironment.total)+(actionDiversity/ACTION.length)+(moodDiversity/MOOD.length))/5*100);

          const lines = (values: readonly string[], counts: Record<string,number>, showAdvice=true) => values.map(v => `${v}: ${counts[v]} ${badge(counts[v])}${showAdvice && badge(counts[v])!=='✅' ? ` add ${need(counts[v])}`: ''}`).join('\n');

          return (
            <div className="space-y-6 text-sm">
              <div className="p-3 rounded bg-[#262b30] border border-[#3a4045] w-fit">Total images: {N}</div>
              <div>
                <h4 className="font-semibold mb-1">Angles (target ≥ 3 each)</h4>
                <pre className="bg-[#1f2428] p-3 rounded border border-[#333] whitespace-pre-wrap">{lines(ANGLES, angleCounts)}</pre>
                <div className="text-xs opacity-70 mt-1">Over-rep check: {angleOver.length? angleOver.join(' | '):'none'}</div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Lighting (target ≥ 3 each)</h4>
                <pre className="bg-[#1f2428] p-3 rounded border border-[#333] whitespace-pre-wrap">{lines(LIGHTING, lightingCounts, false)}</pre>
                <div className="text-xs opacity-70 mt-1">Over-rep check: {lightingOver.length? lightingOver.join(' | '):'none'}</div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Environment (target ≥ 3 each)</h4>
                <pre className="bg-[#1f2428] p-3 rounded border border-[#333] whitespace-pre-wrap">{lines(ENVIRONMENT, environmentCounts, false)}</pre>
                <div className="text-xs opacity-70 mt-1">Over-rep check: {envOver.length? envOver.join(' | '):'none'}</div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Action (target ≥ 3 for at least 3 different actions)</h4>
                <pre className="bg-[#1f2428] p-3 rounded border border-[#333] whitespace-pre-wrap">{lines(ACTION, actionCounts)}</pre>
                <div className="text-xs opacity-70 mt-1">Over-rep check: {actionOver.length? actionOver.join(' | '):'none'}</div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Mood (target ≥ 3 across at least 4 moods)</h4>
                <pre className="bg-[#1f2428] p-3 rounded border border-[#333] whitespace-pre-wrap">{lines(MOOD, moodCounts)}</pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Coverage scores</h4>
                <pre className="bg-[#1f2428] p-3 rounded border border-[#333] whitespace-pre-wrap">{`Angles coverage: ${covAngles.covered}/${covAngles.total} → ${Math.round(covAngles.covered/covAngles.total*100)}%\nLighting coverage: ${covLighting.covered}/${covLighting.total} → ${Math.round(covLighting.covered/covLighting.total*100)}%\nEnvironment coverage: ${covEnvironment.covered}/${covEnvironment.total} → ${Math.round(covEnvironment.covered/covEnvironment.total*100)}%\nAction diversity: ${actionDiversity} values ≥3\nMood diversity: ${moodDiversity} values ≥3\nOverall orthogonal score: ${overallOrthogonal}%`}</pre>
              </div>
            </div>
          );
        })()}
      </section>
    </div>
  );
};

export default DatasetCheckTab;