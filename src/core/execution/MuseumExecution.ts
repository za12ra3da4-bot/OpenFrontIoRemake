import { Execution, Game, Unit } from "../game/Game";

export class MuseumExecution implements Execution {
  private mg: Game;
  private active: boolean = true;

  constructor(private museum: Unit) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
  }

  tick(ticks: number): void {
    if (!this.museum.isActive()) {
      this.active = false;
      return;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
