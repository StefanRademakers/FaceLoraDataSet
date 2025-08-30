# Person LoRA — Orthogonal Coverage & Balance TODO

Aim: Reach / maintain an overall orthogonal coverage score ≥ 85–90% (A range) and balanced shot mix (Close 40–50%, Medium 20–30%, Wide 20–30%).

## 1. ShotType Balance
- [ ] Ensure Close images are ~45% (range 40–50%)
- [ ] Medium 20–30%
- [ ] Wide 20–30% (treat any frame including knees/ankles/feet as Wide)
- [ ] Add missing Extreme Close (facial details) if < 3 exist (not scored in current mix table but valuable for likeness refinement)

Actions:
- If a category is under range: add images until minimum range edge is reached.
- If a category is over range: plan future additions in underrepresented categories first (do **not** delete unless severe skew > +15%).

## 2. Angle Coverage (target ≥3 each)
- [ ] frontal ≥3
- [ ] three-quarter ≥3
- [ ] profile ≥3
- [ ] back ≥3
- [ ] low-angle ≥3
- [ ] high-angle ≥3

Actions:
- Fill any ❌ (0) first (add 3).
- Upgrade any ⚠️ (1–2) to ✅ (3) after missing ones are solved.
- If frontal >60% AND any other angle is ⚠️/❌ → prioritize those angles next.

## 3. Lighting Coverage (target ≥3 each)
- [ ] daylight ≥3
- [ ] indoor ≥3
- [ ] night ≥3
- [ ] sunset ≥3
- [ ] studio ≥3

Actions:
- If any single lighting >50%: add the weakest 2–3 others until each hits 3.

## 4. Environment Coverage (target ≥3 each)
- [ ] neutral ≥3
- [ ] indoor ≥3
- [ ] outdoor ≥3
- [ ] nature ≥3
- [ ] city ≥3
- [ ] sky ≥3

Actions:
- If outdoor or nature dominate (>50–55%): add indoor, neutral, city. Sky can be short but still aim for 3.

## 5. Action Diversity (need ≥3 images for at least 3 actions)
- [ ] stand (cap at <70% preferably)
- [ ] sit ≥3
- [ ] walk ≥3
- [ ] gesture ≥3
- [ ] hold-object ≥3
- [ ] interact ≥3
- [ ] none (optional, but ensure not dominating)

Actions:
- If stand >70%: batch-generate/collect sit, walk, gesture, hold-object, interact.

## 6. Mood Diversity (≥3 images across ≥4 moods)
- [ ] neutral ≥3
- [ ] smiling ≥3
- [ ] serious ≥3
- [ ] surprised ≥3
- [ ] dreamy ≥3
- [ ] stern ≥3
- [ ] relaxed ≥3
- [ ] contemplative ≥3

Actions:
- Fill any missing expressions that help future prompting variety (start with smiling/serious/relaxed/contemplative baseline set, then add surprised/dreamy/stern).

## 7. Quality & Consistency Checks
- [ ] Remove obvious duplicates (same pose & background & framing)
- [ ] Replace any soft‑focus / motion‑blur / compression artifact images
- [ ] Maintain consistent clothing variations (some repetition fine, avoid over-randomization)
- [ ] Ensure captions reflect distinctive elements (avoid generic repetition)

## 8. Metadata Integrity
- [ ] Regenerate metadata for any blank angle/lighting/environment/action/mood
- [ ] Manually correct misclassified shotType (especially borderline medium vs wide)
- [ ] Spot-check 10 random images for correct angle vs perspective (low-angle/high-angle vs frontal)

## 9. Next Improvement Ideas
- [ ] Add confidence scoring (0–1) to metadata generator for future weighting
- [ ] Auto-suggest next needed categories on Images tab (click-to-filter)
- [ ] Optional weighting file to down-weight over-represented subsets during training
- [ ] Export a coverage JSON summary alongside zip exports

## 10. When To Train
Start a first training pass once all angle & lighting categories are ✅ and at least 3 non-stand actions are ✅. Target overall orthogonal score ≥80% before long training; ≥85% for final high-quality LoRA.

---
Keep this list updated; check it after every new batch import. Achieving all checkboxes puts the dataset in the A zone for orthogonal balance.
