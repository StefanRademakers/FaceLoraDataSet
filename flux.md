# Doel

Train een **natuurgetrouwe** persona‑LoRA op **FLUX.1-Krea-dev** met focus op **realistische huid**, **stabiele identiteit** en **weinig “waxy/plastic”** artefacten. Uitgangspunten:

- Resolutie: **1024×1024**
- VRAM: **32 GB** (voldoende voor niet‑gequantiseerde training)
- Tijdsduur is minder belangrijk dan kwaliteit

---

## 1) Dataset & Captions

**Kernidee:** identiteit = (unieke trigger + class) + variatie in poses/lighting.

**Checklist**

- 80–300 foto’s van het subject (meer = beter, maar liever *divers* dan veel van hetzelfde).
- Mix van kadrering: **30–40% close-ups**, **40–50% medium**, **10–20% full‑body**.
- Licht: daglicht, schaduw, tegenlicht, binnenshuis. Vermijd uitsluitend “beauty/retouch” fotos.
- Voeg **10–30 face‑crops (256–512px)** met zichtbare poriën toe naast 1024s.
- Overweeg **reg‑set**: 50–200 generieke *person* foto’s (geen fashion/beauty) met caption `person`.

**Captions**

- Formaat: `kvthvmi_ person, <korte beschrijving>`
- Houd het kort. Voorbeeld:
  - `kvthvmi_ person, middle-aged Indian guru, dark skin, long wavy black hair, full beard`
- Zet **caption\_dropout\_rate: 0.18–0.25** → model leunt op **trigger** i.p.v. alles te memoriseren.

---

## 2) Netwerkkeuze (LoRA/LoKr)

- **LoRA ranks**: start met `linear=64, alpha=32`, `conv=16, alpha=16`. (Jouw huidige 32/16 werkt; 64 voor net wat meer identiteit.)
- **LoKr**: `lokr_full_rank: true` is prima; laat `lokr_factor: -1` staan tenzij VRAM krap is.

---

## 3) Precisie & Quantization

- **Training**: **uit** laten als VRAM het toelaat → `quantize: false`, `quantize_te: false`.
  - Quantize pas bij **inference** toepassen indien nodig.
- **dtype**: `bf16` ok; saves als `fp16` is prima.

---

## 4) Training‑schema (kwaliteit‑gericht)

**Doel:** rustige convergentie, minimale over‑denoise look.

- **LR**: `5e-5` (0.00005) voor UNet.
- **Steps**: 6000–8000; **kies best checkpoint** via vaste eval‑set (zie §6).
- **EMA**: aan → `use_ema: true`, `ema_decay: 0.999`.
- **Gradient checkpointing**: aanhouden voor VRAM; mag.
- **Text‑Encoder (TE) late finetune** (optioneel, aan te bevelen):
  - Eerste \~80–85% van de stappen: **TE uit** (`train_text_encoder: false`).
  - Laatste ~~15–20%: ~~~~**TE aan**~~~~ met ~~~~**lage effectieve LR**~~~~ (~~**5e-6**).
  - Als je tool geen aparte `te_lr` ondersteunt, **verlaag globale LR** naar \~`3e-5` zodra TE aan gaat.

> Waarom: TE‑late‑tune verbetert naam/identiteit/skin‑nuance zonder vroege taaldrift.

---

## 5) Samplen (anti‑waxy defaults)

- **Sampler**: `flowmatch` (zoals bij jou), `timestep_type: sigmoid` ok.
- **Guidance**: start **3.5–3.8** (lager dan 4 reduceert “gloss”).
- **Steps**: **32–36** voor quality‑pass.
- **Negatives (compact, gericht):**
  ```
  ```

plastic skin, waxy, over-smooth, over-denoised, porcelain, airbrushed, glossy highlights, beauty-dish glare, heavy skin retouch

````
- **Positieve textuur‑hints (één tegelijk):**
- `visible skin pores, fine microtexture`
- `soft natural side light, unretouched look`
- `subtle film grain`

---

## 6) Evaluatie & Checkpoint‑keuze
**Vaste eval‑set** (8–12 prompts), render **elke 250 stappen**:
- Frontal close‑up (daylight), profile left (indoor), eyes closed (outdoor), smile (neutral background), full‑body (street), B&W variant, low‑light indoor, backlight/sidelight.
- Matrix: guidance **3.5 / 3.6 / 3.8**, steps **32 / 36**.
- Criteria (100% zoom): zichtbare poriën, geen “plastic” specular, geen muddy shading rond wangen/neus, handen correct.
- Kies het **beste subjectieve checkpoint**, niet per se het laatste.

---

## 7) Annotated YAML (HQ‑profiel 1024p, 32GB)
> **Let op:** alleen parameters die typisch door jouw trainer worden ondersteund. Pas namen aan je tool aan waar nodig.

```yaml
job: extension
config:
name: Kuthumi_HQ_1024
process:
- type: ui_trainer
  training_folder: D:\ai-toolkit\output
  sqlite_db_path: D:\ai-toolkit\aitk_db.db
  device: cuda
  trigger_word: kvthvmi_
  performance_log_every: 10
  network:
    type: lora
    linear: 64           # ↑ iets hogere rank voor identiteit
    linear_alpha: 32
    conv: 16
    conv_alpha: 16
    lokr_full_rank: true
    lokr_factor: -1
    network_kwargs:
      ignore_if_contains: []
  save:
    dtype: fp16
    save_every: 250
    max_step_saves_to_keep: 8
    save_format: diffusers
    push_to_hub: false
  datasets:
  - folder_path: D:\ai-toolkit\datasets\Kuthumi
    default_caption: "kvthvmi_ person, middle-aged Indian guru, dark skin"
    caption_ext: txt
    caption_dropout_rate: 0.22   # ↑ helpt trigger‑leren
    cache_latents_to_disk: false
    is_reg: false
    network_weight: 1
    resolution: [1024]
    mask_path: null
    mask_min_value: 0.1
    controls: []
  # (optioneel) extra reg-set tegen over‑fitting/‘outfit lock‑in’
  - folder_path: D:\ai-toolkit\datasets\generic_person_reg
    default_caption: "person"
    is_reg: true
    network_weight: 1
    resolution: [512, 768, 1024]

  train:
    batch_size: 1
    steps: 7000              # 6k–8k; kies later beste ckpt
    gradient_accumulation: 1
    train_unet: true
    train_text_encoder: false # TE pas later aanzetten (zie notes)
    gradient_checkpointing: true
    noise_scheduler: flowmatch
    timestep_type: sigmoid
    optimizer: adamw8bit
    optimizer_params:
      weight_decay: 0.01     # iets hoger tegen ‘over-smooth’
    lr: 0.00005              # 5e-5 voor stabiele convergentie
    ema_config:
      use_ema: true
      ema_decay: 0.999
    dtype: bf16
    diff_output_preservation: false
    diff_output_preservation_multiplier: 1
    diff_output_preservation_class: person

  model:
    name_or_path: black-forest-labs/FLUX.1-Krea-dev
    arch: flux
    low_vram: false
    quantize: false          # uit tijdens training voor max kwaliteit
    quantize_te: false
    model_kwargs: {}

  sample:
    sampler: flowmatch
    sample_every: 250
    width: 1024
    height: 1024
    guidance_scale: 3.6      # lager = minder waxy
    sample_steps: 36         # quality‑pass
    num_frames: 1
    fps: 1
    seed: 42
    walk_seed: true
    neg: "plastic skin, waxy, over-smooth, over-denoised, porcelain, airbrushed, glossy highlights, beauty-dish glare, heavy skin retouch"
    prompts:
    - "Close-up portrait of kvthvmi_ person in soft natural side light, visible skin pores, fine microtexture, unretouched look"
    - "Medium shot kvthvmi_ person indoors low-key lighting, subtle film grain"
    - "Profile left kvthvmi_ person outdoor daylight"
    - "Full-body kvthvmi_ person street scene daylight"
    - "Frontal kvthvmi_ person smiling, indoor warm light"
````

**TE‑late‑tune (handmatig omschakelen)**

- Rond **step 5600–6000**: toggle
  - `train_text_encoder: true`
  - verlaag **lr** tijdelijk naar `0.00003` (3e-5)
  - draai door tot **7000–8000**
- Bewaar checkpoints op **6000 / 6500 / 7000 / 7500** en kies de beste via de eval‑matrix.

---

## 8) Troubleshooting (gericht)

- **Waxy / plastic huid** → guidance **omlaag** (3.5–3.8), **steps omhoog** (32–36), neg‑prompt zoals hierboven, extra close‑up crops toevoegen, LR iets omlaag.
- **Identiteit nog zwak** → iets hogere LoRA‑rank (64), **TE‑late‑tune** inschakelen, meer diverse close‑ups.
- **Outfit/background “lock‑in”** → reg‑set toevoegen en captions compacter maken.
- **Muddy shading** (wangen/neus) → steps 36, guidance 3.5, licht‑hint `soft natural side light` toevoegen.
- **Overfit vroeg** → verlaag LR naar **3e-5**, voeg reg‑set toe, of verhoog caption\_dropout.

---

## 9) Inference tips

- Start met dezelfde **guidance/steps** als je beste eval. Schakel **quantize aan** *alleen* als je latency/VRAM moet drukken.
- Bewaar 2–3 “beste” checkpoints; soms werkt een iets eerder ckpt beter voor bepaalde lichtomstandigheden.

---

## 10) Werkwijze in 5 stappen

1. **Dataset cureren** (divers, close‑ups, reg‑set optioneel) + korte captions met trigger + class.
2. **HQ‑YAML** instellen (quantize uit, EMA aan, LR 5e‑5).
3. **Train tot \~6000** met vaste eval‑renders elke 250.
4. **TE‑late‑tune** aan voor laatste 1000–2000 stappen met lagere LR.
5. **Kies best checkpoint** per eval‑matrix en finetune je inference‑prompts.

— *Wil je dat ik dit omzet naar jouw huidige YAML‑bestand met exacte paden en een apart blokje voor de TE‑late‑tune fase (zodat je alleen een flag/LR hoeft te togglen)?*

