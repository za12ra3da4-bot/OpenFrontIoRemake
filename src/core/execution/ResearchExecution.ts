import { Execution, Game, Player } from "../game/Game";

const NAVAL_COSTS: Record<number, bigint> = {
  1: 5_000_000n,
  2: 10_000_000n,
  3: 15_000_000n,
};

const LAND_COSTS: Record<number, bigint> = {
  1: 10_000_000n,
  2: 20_000_000n,
  3: 30_000_000n,
};

export class ResearchExecution implements Execution {
  private active = true;

  constructor(
    private player: Player,
    private tree: "naval" | "land",
  ) {}

  init(_mg: Game, _ticks: number): void {}

  tick(_ticks: number): void {
    this.active = false;

    const currentLevel =
      this.tree === "naval"
        ? this.player.navalTechLevel()
        : this.player.landTechLevel();

    const nextLevel = currentLevel + 1;
    if (nextLevel > 3) return;

    const costs = this.tree === "naval" ? NAVAL_COSTS : LAND_COSTS;
    const cost = costs[nextLevel];
    if (cost === undefined) return;

    if (this.player.gold() < cost) return;

    this.player.removeGold(cost);
    if (this.tree === "naval") {
      this.player.setNavalTechLevel(nextLevel);
    } else {
      this.player.setLandTechLevel(nextLevel);
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
