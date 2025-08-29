import React, { useMemo } from 'react';
import { AppState } from '../../interfaces/AppState';

interface OrthogonalCoverageTabProps {
  appState: AppState;
}

type Badge = '✅' | '⚠️' | '❌';

const ANGLES = ['frontal','three-quarter','profile','back','low-angle','high-angle'] as const;
const LIGHTING = ['daylight','indoor','night','sunset','studio'] as const;
const ENVIRONMENT = ['neutral','indoor','outdoor','nature','city','sky'] as const;
const ACTION = ['stand','sit','walk','gesture','hold-object','interact','none'] as const;
const MOOD = ['neutral','smiling','serious','surprised','dreamy','stern','relaxed','contemplative'] as const;

function badge(count: number): Badge {
  return count >= 3 ? '✅' : count >= 1 ? '⚠️' : '❌';
}
function need(count: number): number { return Math.max(0, 3 - count); }

interface OverRepFlag { dim: string; value: string; pct: number; suggestion: string; }

const OrthogonalCoverageTab: React.FC<OrthogonalCoverageTabProps> = ({ appState }) => {
  const images = useMemo(() => Object.values(appState.grids).flat().filter((s): s is NonNullable<typeof s> => !!s && !!s.metadata), [appState.grids]);
  const N = images.length;

  function tally<T extends readonly string[]>(values: T, getter: (im: typeof images[number]) => string) {
    const map: Record<string, number> = Object.fromEntries(values.map(v => [v, 0]));
    images.forEach(im => { const v = getter(im); if (map[v] !== undefined) map[v]++; });
    return map as Record<T[number], number>;
  }

  const angleCounts = tally(ANGLES, im => im.metadata!.angle);
  const lightingCounts = tally(LIGHTING, im => im.metadata!.lighting);
  const environmentCounts = tally(ENVIRONMENT, im => im.metadata!.environment);
  const actionCounts = tally(ACTION, im => im.metadata!.action);
  const moodCounts = tally(MOOD, im => im.metadata!.mood);

  function overRep(map: Record<string, number>, thresholdPct = 50): OverRepFlag[] {
    const res: OverRepFlag[] = [];
    for (const [k, c] of Object.entries(map)) {
      if (N === 0) continue;
      const pct = Math.round((c / N) * 100);
      if (pct > thresholdPct) res.push({ dim: '', value: k, pct, suggestion: '' });
    }
    return res;
  }

  // Over-representation logic specialized per dimension
  const lightingOver = overRep(lightingCounts).map(f => ({ ...f, dim: 'lighting', suggestion: `Too many ${f.value} shots (${f.pct}%) → add other lighting types` }));
  const environmentOver = overRep(environmentCounts).map(f => ({ ...f, dim: 'environment', suggestion: `${f.value} dominates (${f.pct}%) → add indoor/neutral/city` }));

  let angleOver: OverRepFlag[] = [];
  if (N > 0) {
    const frontalPct = Math.round((angleCounts['frontal'] / N) * 100);
    const underAngles = ANGLES.filter(a => a !== 'frontal' && badge(angleCounts[a]) !== '✅');
    if (frontalPct > 60 && underAngles.length) {
      angleOver.push({ dim: 'angles', value: 'frontal', pct: frontalPct, suggestion: `Frontal ${frontalPct}% & other angles low → add ${underAngles.join('/')}` });
    }
  }

  let actionOver: OverRepFlag[] = [];
  if (N > 0) {
    const standPct = Math.round((actionCounts['stand'] / N) * 100);
    const diversify = ACTION.filter(a => a !== 'stand' && badge(actionCounts[a]) !== '✅');
    if (standPct > 70 && diversify.length) {
      actionOver.push({ dim: 'action', value: 'stand', pct: standPct, suggestion: `Stand ${standPct}% → add ${diversify.join('/')}` });
    }
  }

  // Coverage metrics
  const covAngles = { covered: ANGLES.filter(a => angleCounts[a] >= 3).length, total: ANGLES.length };
  const covLighting = { covered: LIGHTING.filter(l => lightingCounts[l] >= 3).length, total: LIGHTING.length };
  const covEnvironment = { covered: ENVIRONMENT.filter(e => environmentCounts[e] >= 3).length, total: ENVIRONMENT.length };
  const actionDiversity = ACTION.filter(a => actionCounts[a] >= 3).length; // show raw count & percent
  const moodDiversity = MOOD.filter(m => moodCounts[m] >= 3).length;

  const actionPct = Math.round((actionDiversity / ACTION.length) * 100);
  const moodPct = Math.round((moodDiversity / MOOD.length) * 100);
  const overallOrthogonal = Math.round(((covAngles.covered / covAngles.total) + (covLighting.covered / covLighting.total) + (covEnvironment.covered / covEnvironment.total) + (actionDiversity / ACTION.length) + (moodDiversity / MOOD.length)) / 5 * 100);

  // Recommendation generation
  const recommendations: string[] = [];
  function collectRecs(values: readonly string[], counts: Record<string, number>, label: string) {
    const misses = values.filter(v => counts[v] === 0);
    const lows = values.filter(v => counts[v] > 0 && counts[v] < 3);
    if (misses.length) recommendations.push(`${label}: missing ${misses.join(', ')} → add 3 each.`);
    if (lows.length) recommendations.push(`${label}: under-represented ${lows.map(v => `${v} (+${need(counts[v])})`).join(', ')}`);
  }
  collectRecs(ANGLES, angleCounts, 'Angles');
  collectRecs(LIGHTING, lightingCounts, 'Lighting');
  collectRecs(ENVIRONMENT, environmentCounts, 'Environment');
  collectRecs(ACTION, actionCounts, 'Action');
  collectRecs(MOOD, moodCounts, 'Mood');

  [...lightingOver, ...environmentOver, ...angleOver, ...actionOver].forEach(f => recommendations.push(f.suggestion));

  // Tailored aggregated advice examples
  const profileNeed = need(angleCounts['profile']);
  const lowNeed = need(angleCounts['low-angle']);
  if (profileNeed || lowNeed) {
    const parts = [] as string[];
    if (profileNeed) parts.push(`${profileNeed} profile`);
    if (lowNeed) parts.push(`${lowNeed} low-angle`);
    recommendations.unshift(`Add ${parts.join(' and ')} shots.`);
  }
  if (lightingOver.length) {
    const over = lightingOver[0];
    recommendations.unshift(`Too many ${over.value} shots (${over.pct}%) → add daylight & indoor (≥3 each).`);
  }

  if (!recommendations.length && N > 0) recommendations.push('Coverage looks solid. Maintain balance while adding new concepts.');
  if (N === 0) recommendations.push('No images with metadata. Generate or add metadata first.');

  interface Row { name: string; count: number; badge: Badge; advice?: string; }
  function buildRows(values: readonly string[], counts: Record<string, number>): Row[] {
    return values.map(v => ({ name: v, count: counts[v], badge: badge(counts[v]), advice: counts[v] >= 3 ? '' : (counts[v] === 0 ? 'add 3' : `add ${need(counts[v])}`) }));
  }

  const anglesRows = buildRows(ANGLES, angleCounts);
  const lightingRows = buildRows(LIGHTING, lightingCounts);
  const envRows = buildRows(ENVIRONMENT, environmentCounts);
  const actionRows = buildRows(ACTION, actionCounts);
  const moodRows = buildRows(MOOD, moodCounts);

  function LinesSection({ title, rows, overRep, subtitle }: { title: string; rows: Row[]; overRep?: OverRepFlag[]; subtitle?: string }) {
    return (
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-1">{title}</h3>
        {subtitle && <div className="text-xs opacity-60 mb-1">{subtitle}</div>}
        <pre className="text-sm leading-5 whitespace-pre-wrap bg-[#1f2428] p-3 rounded border border-[#333] overflow-x-auto">
{rows.map(r => `${r.name}: ${r.count} ${r.badge}${r.badge==='✅'?'':` ${r.advice}`}`).join('\n')}</pre>
        <div className="mt-2 text-xs opacity-70">Over-rep check: {overRep && overRep.length ? overRep.map(f => f.suggestion).join(' | ') : 'none'}</div>
      </section>
    );
  }

  return (
    <div className="space-y-10">
      <h2 className="text-2xl font-bold">Orthogonal Coverage Report</h2>
      <div className="p-4 rounded bg-[#262b30] border border-[#3a4045] max-w-md text-sm">
        <div className="font-semibold mb-1">Dataset</div>
        <div>Total images: {N}</div>
      </div>

  <LinesSection title="Angles (target ≥ 3 each)" rows={anglesRows} overRep={angleOver} />
  <LinesSection title="Lighting (target ≥ 3 each)" rows={lightingRows} overRep={lightingOver} />
  <LinesSection title="Environment (target ≥ 3 each)" rows={envRows} overRep={environmentOver} />
  <LinesSection title="Action (target ≥ 3 for at least 3 different actions)" rows={actionRows} overRep={actionOver} />
  <LinesSection title="Mood (target ≥ 3 across at least 4 moods)" rows={moodRows} />

      <section>
        <h3 className="text-xl font-semibold mb-2">Coverage Scores</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-w-4xl">
          <div className="p-3 rounded bg-[#262b30] border border-[#3a4045] text-sm">
            <div className="text-xs opacity-60 mb-1">Angles coverage</div>
            <div className="font-semibold">{covAngles.covered}/{covAngles.total} → {Math.round((covAngles.covered/covAngles.total)*100)}%</div>
          </div>
          <div className="p-3 rounded bg-[#262b30] border border-[#3a4045] text-sm">
            <div className="text-xs opacity-60 mb-1">Lighting coverage</div>
            <div className="font-semibold">{covLighting.covered}/{covLighting.total} → {Math.round((covLighting.covered/covLighting.total)*100)}%</div>
          </div>
            <div className="p-3 rounded bg-[#262b30] border border-[#3a4045] text-sm">
            <div className="text-xs opacity-60 mb-1">Environment coverage</div>
            <div className="font-semibold">{covEnvironment.covered}/{covEnvironment.total} → {Math.round((covEnvironment.covered/covEnvironment.total)*100)}%</div>
          </div>
          <div className="p-3 rounded bg-[#262b30] border border-[#3a4045] text-sm">
            <div className="text-xs opacity-60 mb-1">Action diversity</div>
            <div className="font-semibold">{actionDiversity} values ≥3 ({actionPct}%)</div>
          </div>
          <div className="p-3 rounded bg-[#262b30] border border-[#3a4045] text-sm">
            <div className="text-xs opacity-60 mb-1">Mood diversity</div>
            <div className="font-semibold">{moodDiversity} values ≥3 ({moodPct}%)</div>
          </div>
          <div className="p-3 rounded bg-[#262b30] border border-[#3a4045] text-sm">
            <div className="text-xs opacity-60 mb-1">Overall orthogonal score</div>
            <div className="font-semibold">{overallOrthogonal}%</div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-2">Recommendations</h3>
        <ul className="list-disc ml-5 space-y-1 text-sm">
          {recommendations.map((r,i)=>(<li key={i}>{r}</li>))}
        </ul>
      </section>
    </div>
  );
};

export default OrthogonalCoverageTab;
