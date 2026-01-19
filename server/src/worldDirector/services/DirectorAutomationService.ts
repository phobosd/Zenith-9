import { WorldDirector } from '../Director';
import { DirectorLogLevel } from '../DirectorTypes';
import { IsRoom } from '../../components/IsRoom';
import { Position } from '../../components/Position';
import { RoomRegistry } from '../../services/RoomRegistry';
import { ProposalStatus, ProposalType } from '../../generation/proposals/schemas';

export class DirectorAutomationService {
    private director: WorldDirector;
    private automationInterval: NodeJS.Timeout | null = null;

    constructor(director: WorldDirector) {
        this.director = director;
    }

    public start() {
        if (this.automationInterval) clearInterval(this.automationInterval);

        this.automationInterval = setInterval(async () => {
            if (this.director.management.isPaused) {
                this.director.think("System paused. Standing by.");
                return;
            }

            this.director.think("Evaluating world state for autonomous actions...");

            // Check for expired events
            this.director.content.checkActiveEvents();

            // 1. Random Event Trigger (if Aggression is high)
            const aggressionRoll = Math.random();
            const aggressionThreshold = this.director.management.personality.aggression.value * this.director.guardrails.getConfig().budgets.aggressionProbability;

            if (this.director.management.personality.aggression.enabled) {
                if (aggressionRoll < aggressionThreshold) {
                    this.director.think(`Aggression check PASSED (Roll: ${aggressionRoll.toFixed(4)} < Threshold: ${aggressionThreshold.toFixed(4)}). Triggering event...`);
                    await this.director.content.triggerWorldEvent('MOB_INVASION');
                } else {
                    this.director.think(`Aggression check FAILED (Roll: ${aggressionRoll.toFixed(4)} >= Threshold: ${aggressionThreshold.toFixed(4)}). No hostile events triggered.`);
                }
            } else {
                this.director.think("Aggression disabled. Skipping hostile event checks.");
            }

            // 2. Autonomous World Expansion
            const expansionRoll = Math.random();
            const expansionThreshold = this.director.management.personality.expansion.value * this.director.guardrails.getConfig().budgets.expansionProbability;

            if (this.director.management.personality.expansion.enabled) {
                if (expansionRoll < expansionThreshold) {
                    this.director.think(`Expansion check PASSED (Roll: ${expansionRoll.toFixed(4)} < Threshold: ${expansionThreshold.toFixed(4)}). Searching for expansion spot...`);
                    const spot = this.findAdjacentEmptySpot();
                    if (spot) {
                        this.director.think(`Found expansion spot at ${spot.x}, ${spot.y}. Generating proposal...`);
                        this.director.log(DirectorLogLevel.INFO, `Autonomous expansion: Targeting spot at ${spot.x}, ${spot.y}`);
                        try {
                            const proposal = await this.director.roomGen.generate(this.director.guardrails.getConfig(), this.director.llm, {
                                generatedBy: 'Autonomous',
                                x: spot.x,
                                y: spot.y,
                                existingNames: RoomRegistry.getInstance().getAllRooms().map(r => r.name)
                            });
                            if (proposal) {
                                if (!proposal.flavor) proposal.flavor = {};
                                proposal.flavor.rationale = `Autonomous expansion triggered by Expansion personality (${(this.director.management.personality.expansion.value * 100).toFixed(0)}%). ${proposal.flavor.rationale || ''}`;
                                this.director.proposals.push(proposal);
                                this.director.adminNamespace.emit('director:proposals_update', this.director.proposals);
                                this.director.log(DirectorLogLevel.SUCCESS, `Autonomous expansion proposal created for ${spot.x}, ${spot.y}`);
                            }
                        } catch (err) {
                            this.director.think(`Expansion generation FAILED: ${err}`);
                            this.director.log(DirectorLogLevel.ERROR, `Autonomous expansion failed: ${err}`);
                        }
                    } else {
                        this.director.think("No suitable expansion spots found adjacent to existing rooms.");
                    }
                } else {
                    this.director.think(`Expansion check FAILED (Roll: ${expansionRoll.toFixed(4)} >= Threshold: ${expansionThreshold.toFixed(4)}). No expansion triggered.`);
                }
            } else {
                this.director.think("Expansion disabled. Skipping world growth checks.");
            }

            // 3. Chaos Check (just for thoughts)
            if (this.director.management.personality.chaos.enabled) {
                const chaosRoll = Math.random();
                if (chaosRoll < this.director.management.personality.chaos.value * this.director.guardrails.getConfig().budgets.chaosProbability) {
                    this.director.think(`Chaos roll high (${chaosRoll.toFixed(4)}). The Matrix feels unstable...`);
                }
            }

            // 4. Activity & Intervention Logic
            this.director.activity.update();
            const quietZones = this.director.activity.getQuietZones();
            if (quietZones.length > 0) {
                this.director.think(`Detected ${quietZones.length} quiet zones. Considering intervention...`);

                // 20% chance to intervene if quiet
                if (Math.random() < 0.2) {
                    const zoneToIntervene = quietZones[Math.floor(Math.random() * quietZones.length)];
                    const [zx, zy] = zoneToIntervene.split(',').map(Number);

                    this.director.think(`Intervening in quiet zone ${zoneToIntervene}. Spawning activity...`);
                    this.director.log(DirectorLogLevel.INFO, `Intervention: Spawning activity in quiet zone ${zoneToIntervene}`);

                    // Trigger a random event or spawn NPCs
                    await this.director.content.triggerWorldEvent('MOB_INVASION'); // For now, just trigger invasion
                }
            }

        }, 10000); // Check every 10 seconds
    }

    public stop() {
        if (this.automationInterval) {
            clearInterval(this.automationInterval);
            this.automationInterval = null;
        }
    }

    public findAdjacentEmptySpot(): { x: number, y: number } | null {
        // Query the engine for ALL entities with IsRoom component (includes static and generated rooms)
        const roomEntities = this.director.engine.getEntitiesWithComponent(IsRoom);

        if (roomEntities.length === 0) {
            // If truly empty, start at a reasonable center
            return { x: 10, y: 10 };
        }

        // Shuffle rooms to pick a random starting point for expansion
        const shuffledRooms = [...roomEntities].sort(() => Math.random() - 0.5);

        for (const roomEntity of shuffledRooms) {
            const pos = roomEntity.getComponent(Position);
            if (!pos) continue;

            const { x, y } = pos;
            const adjacents = [
                { x: x + 1, y },
                { x: x - 1, y },
                { x, y: y + 1 },
                { x, y: y - 1 }
            ];

            // Shuffle adjacents to avoid bias
            for (const spot of adjacents.sort(() => Math.random() - 0.5)) {
                // 1. Check if a room already exists at this spot in the engine
                const existingRoom = roomEntities.find(r => {
                    const rPos = r.getComponent(Position);
                    return rPos && rPos.x === spot.x && rPos.y === spot.y;
                });

                if (!existingRoom) {
                    // 2. Check if this spot is already in a pending proposal
                    const isPending = this.director.proposals.some(p =>
                        p.type === ProposalType.WORLD_EXPANSION &&
                        p.payload.coordinates.x === spot.x &&
                        p.payload.coordinates.y === spot.y
                    );

                    if (!isPending) return spot;
                }
            }
        }

        return null;
    }
}
