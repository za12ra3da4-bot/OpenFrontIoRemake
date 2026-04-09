import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { EventBus } from "../../../core/EventBus";
import { GameView } from "../../../core/game/GameView";
import { ResearchTechIntentEvent } from "../../Transport";
import { renderNumber } from "../../Utils";
import { Layer } from "./Layer";

interface TechLevel {
  level: number;
  name: string;
  cost: bigint;
  effects: string[];
}

const NAVAL_TECH: TechLevel[] = [
  {
    level: 1,
    name: "NAVAL EXPANSION",
    cost: 5_000_000n,
    effects: [
      "Send up to 6 boats at a time",
      "Boats travel 1.25× faster",
      "Boats have higher durability",
    ],
  },
  {
    level: 2,
    name: "NAVAL ECONOMY",
    cost: 10_000_000n,
    effects: [
      "Trade ships 75% chance to evade warship radar",
      "Trade ships travel 1.25× faster",
      "Trade ships detect incoming nukes",
    ],
  },
  {
    level: 3,
    name: "NAVAL DOMINATION",
    cost: 15_000_000n,
    effects: [
      "Warship patrol range ×1.75",
      "Warship health ×2",
      "Warship reload time −25%",
      "Warships detect incoming nukes",
    ],
  },
];

const LAND_TECH: TechLevel[] = [
  {
    level: 1,
    name: "LAND EXPANSION",
    cost: 10_000_000n,
    effects: [
      "Concentrated attacks (max 2 at a time)",
      "Defense posts survive capture",
      "50% defense post coverage prevents annexation",
    ],
  },
  {
    level: 2,
    name: "LAND ECONOMY",
    cost: 20_000_000n,
    effects: [
      "Trains generate +5,000 gold per structure",
      "Stacking factories increases radius",
      "Railway bridges span 10× larger water",
    ],
  },
  {
    level: 3,
    name: "LAND DOMINATION",
    cost: 30_000_000n,
    effects: [
      "+15% troop attacking speed",
      "−25% troop loss",
      "+35% troop generation speed",
      "Infinitely stackable defense posts",
    ],
  },
];

// ── Global styles injected once ───────────────────────────────────────────────
const STYLE_ID = "research-tree-scroll-style";
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=IM+Fell+English:ital@0;1&display=swap');

    /* ── modal backdrop ── */
    .rt-bg {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,0.78);
      display: flex; align-items: center; justify-content: center;
    }

    /* ── outer scroll wrapper ── */
    .rt-scroll {
      position: relative;
      width: 92vw; max-width: 870px;
      display: flex; flex-direction: column;
      align-items: stretch;
      filter: drop-shadow(0 12px 40px rgba(0,0,0,0.85));
    }

    /* ── roller (top / bottom) ── */
    .rt-roller {
      position: relative;
      height: 54px;
      flex-shrink: 0;
      z-index: 3;
      display: flex; align-items: center;
    }

    /* The cylindrical rod */
    .rt-rod {
      flex: 1;
      height: 54px;
      border-radius: 27px;
      background: linear-gradient(180deg,
        #1a0e04 0%,
        #8b5c10 6%,
        #f0c840 14%,
        #fde880 22%,
        #d4a020 34%,
        #f8dc60 46%,
        #c89018 58%,
        #fde060 70%,
        #c08010 82%,
        #7a4c08 92%,
        #2a1404 100%
      );
      box-shadow:
        0 4px 14px rgba(0,0,0,0.6),
        inset 0 2px 3px rgba(255,248,180,0.35),
        inset 0 -2px 3px rgba(0,0,0,0.4);
    }

    /* Engraved line on rod */
    .rt-rod::before {
      content: '';
      position: absolute; left: 50px; right: 50px;
      top: 50%; transform: translateY(-50%);
      height: 2px;
      background: linear-gradient(90deg,
        transparent, rgba(80,40,0,0.5) 10%,
        rgba(80,40,0,0.5) 90%, transparent);
      border-radius: 1px;
    }

    /* ── ornamental ball at each corner ── */
    .rt-orb {
      position: absolute;
      width: 64px; height: 64px;
      top: 50%; transform: translateY(-50%);
      z-index: 5;
    }
    .rt-orb svg { width: 100%; height: 100%; }

    .rt-orb-tl { left:  -18px; }
    .rt-orb-tr { right: -18px; }
    .rt-orb-bl { left:  -18px; }
    .rt-orb-br { right: -18px; }

    /* ── paper section ── */
    .rt-paper {
      position: relative; z-index: 2;
      /* parchment gradient */
      background:
        linear-gradient(90deg,
          rgba(140,100,40,0.55) 0%,
          rgba(180,140,70,0.2) 5%,
          transparent 12%,
          transparent 88%,
          rgba(180,140,70,0.2) 95%,
          rgba(140,100,40,0.55) 100%
        ),
        radial-gradient(ellipse at 50% 40%, #f8ecc0 0%, #f0de98 40%, #e0c870 80%, #d4b858 100%);
      /* torn edge mask using clip-path */
      clip-path: polygon(
        0.5% 0%, 1.2% 1.5%, 0.3% 3%, 1.5% 5%, 0.2% 7.5%,
        1.0% 10%, 0.4% 13%, 1.3% 16%, 0.2% 20%, 1.1% 24%,
        0.3% 28%, 1.4% 33%, 0.1% 38%, 1.2% 43%, 0.3% 48%,
        1.0% 53%, 0.4% 58%, 1.3% 63%, 0.2% 68%, 1.1% 73%,
        0.3% 78%, 1.4% 83%, 0.2% 88%, 1.0% 92%, 0.4% 96%, 0.5% 100%,
        99.5% 100%, 98.8% 98.5%, 99.7% 97%, 98.5% 95%, 99.8% 92.5%,
        99.0% 90%, 99.6% 87%, 98.7% 84%, 99.8% 80%, 98.9% 76%,
        99.7% 72%, 98.6% 67%, 99.9% 62%, 98.8% 57%, 99.7% 52%,
        99.0% 47%, 99.6% 42%, 98.7% 37%, 99.8% 32%, 98.9% 27%,
        99.7% 22%, 98.6% 17%, 99.9% 12%, 98.8% 7%, 99.5% 3%, 99.5% 0%
      );
      overflow: hidden;
    }

    /* inner shadow on paper to simulate curl at edges */
    .rt-paper::before {
      content: '';
      position: absolute; inset: 0; pointer-events: none; z-index: 10;
      background:
        linear-gradient(90deg,
          rgba(100,60,10,0.30) 0%, rgba(120,80,20,0.10) 4%, transparent 10%,
          transparent 90%, rgba(120,80,20,0.10) 96%, rgba(100,60,10,0.30) 100%
        ),
        linear-gradient(180deg,
          rgba(80,50,10,0.22) 0%, transparent 8%,
          transparent 92%, rgba(80,50,10,0.22) 100%
        );
    }

    /* subtle paper texture */
    .rt-paper::after {
      content: '';
      position: absolute; inset: 0; pointer-events: none; z-index: 9;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E");
    }

    /* ── content inside paper ── */
    .rt-content {
      position: relative; z-index: 11;
      padding: 18px 28px 22px;
      max-height: 78vh; overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(140,90,20,0.5) transparent;
    }

    /* ── header row ── */
    .rt-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 2px solid rgba(140,90,20,0.4);
    }
    .rt-title {
      font-family: 'Cinzel', 'Times New Roman', serif;
      font-size: 1.2rem; font-weight: 700; letter-spacing: 0.15em;
      color: #2a1400;
      text-shadow: 0 1px 0 rgba(255,230,140,0.6);
      display: flex; align-items: center; gap: 8px;
    }
    .rt-gold-badge {
      font-family: 'Cinzel', serif;
      font-size: 0.85rem; font-weight: 700;
      color: #6a3c00; background: rgba(180,120,10,0.15);
      border: 1px solid rgba(160,100,10,0.4);
      border-radius: 5px; padding: 3px 10px;
    }
    .rt-close {
      background: rgba(100,60,10,0.18); border: 1.5px solid rgba(140,90,20,0.5);
      color: #5a3000; font-size: 1rem; cursor: pointer;
      border-radius: 6px; width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .rt-close:hover { background: rgba(100,60,10,0.35); }

    /* ── two columns ── */
    .rt-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .rt-col  { display: flex; flex-direction: column; gap: 3px; }

    /* column header */
    .rt-col-head {
      font-family: 'Cinzel', serif;
      font-size: 0.78rem; font-weight: 700; letter-spacing: 0.12em;
      text-align: center; padding: 7px 10px; border-radius: 6px;
      margin-bottom: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,240,180,0.15);
    }
    .rt-col-head.naval {
      background: linear-gradient(175deg, #1a4878 0%, #0c2a50 100%);
      border: 1.5px solid #3a78c0; color: #90caf0;
    }
    .rt-col-head.land {
      background: linear-gradient(175deg, #2a5c12 0%, #163808 100%);
      border: 1.5px solid #52aa28; color: #96e060;
    }

    /* ── tech card ── */
    .rt-card {
      border-radius: 6px; padding: 10px 12px 9px;
      position: relative;
      font-family: 'IM Fell English', Georgia, serif;
    }
    .rt-card.unlocked {
      background: linear-gradient(150deg, #c8e8b0 0%, #a8d890 100%);
      border: 1.5px solid #52962a;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(210,255,180,0.5);
    }
    .rt-card.available {
      background: linear-gradient(150deg, #ccdcee 0%, #b0c8e2 100%);
      border: 1.5px solid #4878b8;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(200,228,255,0.5);
      cursor: pointer;
    }
    .rt-card.available:hover {
      box-shadow: 0 4px 14px rgba(0,0,0,0.25), 0 0 10px rgba(80,140,220,0.3);
      transform: translateY(-1px);
    }
    .rt-card.locked {
      background: linear-gradient(150deg, #c8bca0 0%, #b4a888 100%);
      border: 1.5px solid #8a7848; opacity: 0.7;
    }

    .rt-card-top {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 5px;
    }
    .rt-card-name {
      font-family: 'Cinzel', serif;
      font-size: 0.76rem; font-weight: 700; letter-spacing: 0.06em;
    }
    .rt-card.unlocked  .rt-card-name { color: #183808; }
    .rt-card.available .rt-card-name { color: #082040; }
    .rt-card.locked    .rt-card-name { color: #3a2c10; }

    .rt-badge {
      font-family: 'Cinzel', serif;
      font-size: 0.58rem; font-weight: 700; letter-spacing: 0.06em;
      padding: 2px 6px; border-radius: 3px;
    }
    .rt-badge.unlocked  { background: #184810; color: #72d840; border: 1px solid #387820; }
    .rt-badge.available { background: #0c2848; color: #60a8e8; border: 1px solid #285888; }
    .rt-badge.locked    { background: #2a2010; color: #8a7040; border: 1px solid #504030; }

    .rt-divline {
      height: 1px; background: rgba(80,50,10,0.2); margin: 4px 0 6px;
    }

    .rt-effects { list-style: none; padding: 0; margin: 0; }
    .rt-fx { font-size: 0.73rem; padding: 1.5px 0; }
    .rt-card.unlocked  .rt-fx { color: #1c4008; }
    .rt-card.available .rt-fx { color: #0a1e3c; }
    .rt-card.locked    .rt-fx { color: #4a3820; }

    .rt-btn {
      width: 100%; padding: 6px; border-radius: 5px; border: none;
      font-family: 'Cinzel', serif; font-size: 0.72rem; font-weight: 700;
      letter-spacing: 0.05em; margin-top: 7px; cursor: pointer;
      transition: background 0.15s, box-shadow 0.15s;
    }
    .rt-btn.naval-on {
      background: linear-gradient(180deg, #1e5aaa 0%, #0c3470 100%);
      color: #c0e4ff; border: 1px solid #3a80d0;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(140,200,255,0.2);
    }
    .rt-btn.naval-on:hover {
      background: linear-gradient(180deg, #2870cc 0%, #144090 100%);
    }
    .rt-btn.land-on {
      background: linear-gradient(180deg, #387820 0%, #1c4810 100%);
      color: #c0f0a0; border: 1px solid #58a830;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(140,220,100,0.2);
    }
    .rt-btn.land-on:hover {
      background: linear-gradient(180deg, #489028 0%, #245a14 100%);
    }
    .rt-btn.off {
      background: rgba(60,40,10,0.2); color: #8a7040;
      border: 1px solid rgba(100,70,20,0.3); cursor: not-allowed;
    }
    .rt-cost { color: #9a5800; font-weight: 700; }
    .rt-no-gold { color: #983010; font-size: 0.65rem; }
    .rt-hint { font-size: 0.65rem; color: #6a5020; text-align: center; margin-top: 4px; font-style: italic; }

    .rt-arrow { text-align: center; color: #9a7828; font-size: 1rem; opacity: 0.65; line-height: 1; margin: 0; }
  `;
  document.head.appendChild(s);
}

// SVG ornamental ball for scroll corners
function orbSVG(flip = false) {
  const sx = flip ? "-1,1" : "1,1";
  return `
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="og${flip ? "f" : "n"}" cx="38%" cy="32%" r="58%">
          <stop offset="0%"   stop-color="#fff8c0"/>
          <stop offset="18%"  stop-color="#f8d840"/>
          <stop offset="42%"  stop-color="#c48c14"/>
          <stop offset="68%"  stop-color="#8a5808"/>
          <stop offset="100%" stop-color="#2a1404"/>
        </radialGradient>
        <radialGradient id="ig${flip ? "f" : "n"}" cx="42%" cy="36%" r="55%">
          <stop offset="0%"   stop-color="#fff4a0"/>
          <stop offset="25%"  stop-color="#e8c030"/>
          <stop offset="55%"  stop-color="#a07010"/>
          <stop offset="100%" stop-color="#3a1c04"/>
        </radialGradient>
      </defs>
      <!-- outer ball -->
      <circle cx="32" cy="32" r="30" fill="url(#og${flip ? "f" : "n"})" />
      <!-- rim groove -->
      <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(40,20,0,0.35)" stroke-width="2"/>
      <!-- inner detail -->
      <circle cx="32" cy="32" r="19" fill="url(#ig${flip ? "f" : "n"})"/>
      <circle cx="32" cy="32" r="19" fill="none" stroke="rgba(40,20,0,0.3)" stroke-width="1.5"/>
      <!-- cross engrave -->
      <g stroke="rgba(60,30,0,0.28)" stroke-width="1.2" fill="none">
        <line x1="13" y1="32" x2="51" y2="32"/>
        <line x1="32" y1="13" x2="32" y2="51"/>
      </g>
      <!-- petal ornament  -->
      <g transform="translate(32,32) scale(${sx})" fill="rgba(255,220,80,0.18)" stroke="rgba(80,40,0,0.25)" stroke-width="0.8">
        <ellipse rx="5" ry="9" transform="rotate(0)"/>
        <ellipse rx="5" ry="9" transform="rotate(45)"/>
        <ellipse rx="5" ry="9" transform="rotate(90)"/>
        <ellipse rx="5" ry="9" transform="rotate(135)"/>
      </g>
      <!-- highlight -->
      <ellipse cx="24" cy="22" rx="8" ry="5" fill="rgba(255,255,220,0.22)" transform="rotate(-30 24 22)"/>
    </svg>
  `;
}

@customElement("research-tree-layer")
export class ResearchTreeLayer extends LitElement implements Layer {
  public game: GameView;
  public eventBus: EventBus;

  @state() private visible = false;

  createRenderRoot() { return this; }
  init() {} tick() {} redraw() {} renderLayer() {}
  shouldTransform() { return false; }

  toggle() {
    this.visible = !this.visible;
    this.requestUpdate();
  }

  private getMyPlayer() {
    return this.game?.myPlayer();
  }

  private renderTechCard(tech: TechLevel, currentLevel: number, tree: "naval" | "land") {
    const player = this.getMyPlayer();
    const isUnlocked  = currentLevel >= tech.level;
    const isNext      = currentLevel === tech.level - 1;
    const canAfford   = player ? player.gold() >= tech.cost : false;
    const isAvailable = isNext && canAfford && player?.isAlive();

    const cardCls  = isUnlocked ? "unlocked" : isNext ? "available" : "locked";
    const badgeCls = cardCls;
    const statusTx = isUnlocked ? "✓ UNLOCKED" : isNext ? "AVAILABLE" : "LOCKED";

    let btnCls = "rt-btn off";
    if (isAvailable) btnCls = `rt-btn ${tree === "naval" ? "naval-on" : "land-on"}`;

    return html`
      <div class=${"rt-card " + cardCls}>
        <div class="rt-card-top">
          <span class="rt-card-name">LV${tech.level} — ${tech.name}</span>
          <span class=${"rt-badge " + badgeCls}>${statusTx}</span>
        </div>
        <div class="rt-divline"></div>
        <ul class="rt-effects">
          ${tech.effects.map((e) => html`<li class="rt-fx">▸ ${e}</li>`)}
        </ul>
        ${!isUnlocked && isNext ? html`
          <button class=${btnCls} ?disabled=${!isAvailable} @click=${() => this.onResearch(tree)}>
            Research — <span class="rt-cost">⊙ ${renderNumber(tech.cost)}</span>
            ${!canAfford ? html`<span class="rt-no-gold"> (need more gold)</span>` : ""}
          </button>` : ""}
        ${!isUnlocked && !isNext ? html`
          <div class="rt-hint">Unlock Level ${tech.level - 1} first</div>` : ""}
      </div>
    `;
  }

  private onResearch(tree: "naval" | "land") {
    this.eventBus.emit(new ResearchTechIntentEvent(tree));
  }

  render() {
    if (!this.visible) return html``;

    const player     = this.getMyPlayer();
    const navalLevel = player?.navalTechLevel() ?? 0;
    const landLevel  = player?.landTechLevel()  ?? 0;
    const gold       = player?.gold() ?? 0n;

    return html`
      <div class="rt-bg"
        @click=${(e: Event) => { if (e.target === e.currentTarget) this.visible = false; }}
      >
        <div class="rt-scroll" @click=${(e: Event) => e.stopPropagation()}>

          <!-- TOP ROLLER -->
          <div class="rt-roller">
            <div class="rt-orb rt-orb-tl" .innerHTML=${orbSVG(false)}></div>
            <div class="rt-rod"></div>
            <div class="rt-orb rt-orb-tr" .innerHTML=${orbSVG(true)}></div>
          </div>

          <!-- PAPER -->
          <div class="rt-paper">
            <div class="rt-content">

              <!-- header -->
              <div class="rt-header">
                <div class="rt-title">📜 Research Tree</div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="rt-gold-badge">⊙ ${renderNumber(gold)}</div>
                  <button class="rt-close" @click=${() => { this.visible = false; }}>✕</button>
                </div>
              </div>

              <!-- two tech columns -->
              <div class="rt-cols">

                <div class="rt-col">
                  <div class="rt-col-head naval">⚓ NAVAL TECHNOLOGY</div>
                  ${NAVAL_TECH.map((tech, i) => html`
                    ${this.renderTechCard(tech, navalLevel, "naval")}
                    ${i < NAVAL_TECH.length - 1 ? html`<div class="rt-arrow">↓</div>` : ""}
                  `)}
                </div>

                <div class="rt-col">
                  <div class="rt-col-head land">⚔ LAND TECHNOLOGY</div>
                  ${LAND_TECH.map((tech, i) => html`
                    ${this.renderTechCard(tech, landLevel, "land")}
                    ${i < LAND_TECH.length - 1 ? html`<div class="rt-arrow">↓</div>` : ""}
                  `)}
                </div>

              </div>
            </div>
          </div>

          <!-- BOTTOM ROLLER -->
          <div class="rt-roller">
            <div class="rt-orb rt-orb-bl" .innerHTML=${orbSVG(false)}></div>
            <div class="rt-rod"></div>
            <div class="rt-orb rt-orb-br" .innerHTML=${orbSVG(true)}></div>
          </div>

        </div>
      </div>
    `;
  }
}
