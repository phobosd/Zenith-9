import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Position } from '../components/Position';
import { NPC } from '../components/NPC';
import { CombatStats } from '../components/CombatStats';
import { EngagementTier } from '../types/CombatTypes';
import { Server } from 'socket.io';
import { WorldQuery } from '../utils/WorldQuery';
import { IsRoom } from '../components/IsRoom';
import { IEngine } from '../commands/CommandRegistry';
import { Roundtime } from '../components/Roundtime';
import { Stats } from '../components/Stats';

import { MessageService } from '../services/MessageService';
import { MessageFormatter } from '../utils/MessageFormatter';

export class NPCSystem extends System {
    private io: Server;
    private messageService: MessageService;
    private lastBarkTime: Map<string, number> = new Map();
    private lastMoveTime: Map<string, number> = new Map();
    private combatSystem: any; // Using any to avoid circular dependency issues if they arise, but ideally CombatSystem

    constructor(io: Server, messageService: MessageService) {
        super();
        this.io = io;
        this.messageService = messageService;
    }

    setCombatSystem(combatSystem: any) {
        this.combatSystem = combatSystem;
    }

    update(engine: IEngine, deltaTime: number): void {
        const now = Date.now();
        const npcs = engine.getEntitiesWithComponent(NPC);

        for (const npc of npcs) {
            this.handleNPCBehavior(npc, now, engine);
        }
    }

    // Called when an NPC is spawned to immediately detect nearby players
    public onNPCSpawned(npc: Entity, engine: IEngine): void {
        const npcComp = npc.getComponent(NPC);
        const pos = npc.getComponent(Position);
        const combatStats = npc.getComponent(CombatStats);

        if (!npcComp || !pos || !combatStats || !npcComp.isAggressive) return;

        // Immediately detect players in the room
        const players = engine.getEntitiesWithComponent(Position).filter(e => {
            const ePos = e.getComponent(Position);
            return e.hasComponent(CombatStats) && !e.hasComponent(NPC) && ePos?.x === pos.x && ePos?.y === pos.y;
        });

        if (players.length > 0) {
            const target = players[Math.floor(Math.random() * players.length)];
            combatStats.isHostile = true;
            combatStats.targetId = target.id;
            combatStats.engagementTier = EngagementTier.DISENGAGED; // Start at disengaged
            console.log(`[NPC AI] ${npcComp.typeName} (${npc.id}) immediately noticed player ${target.id} on spawn`);
            this.messageService.combat(target.id, `<enemy>${npcComp.typeName} notices you and prepares to attack!</enemy>`);
        }
    }

    private handleNPCBehavior(npc: Entity, now: number, engine: IEngine) {
        const npcComp = npc.getComponent(NPC);
        const pos = npc.getComponent(Position);

        if (!npcComp || !pos) return;

        // 1. Random Movement (every 15-30 seconds)
        if (!this.lastMoveTime.has(npc.id)) this.lastMoveTime.set(npc.id, now);
        if (now - this.lastMoveTime.get(npc.id)! > 15000 + Math.random() * 15000) {
            this.moveRandomly(npc, pos, engine);
            this.lastMoveTime.set(npc.id, now);
        }

        // 2. Random Barks (every 10-20 seconds)
        if (!this.lastBarkTime.has(npc.id)) this.lastBarkTime.set(npc.id, now);
        if (now - this.lastBarkTime.get(npc.id)! > 10000 + Math.random() * 10000) {
            this.bark(npc, npcComp, pos, engine);
            this.lastBarkTime.set(npc.id, now);
        }

        // 3. Combat Behavior
        if (this.combatSystem) {
            this.handleNPCCombat(npc, npcComp, pos, engine);
        }
    }

    private handleNPCCombat(npc: Entity, npcComp: NPC, pos: Position, engine: IEngine) {
        const combatStats = npc.getComponent(CombatStats);
        if (!combatStats) return;

        // 1. Detection (if aggressive and no target)
        if (npcComp.isAggressive && !combatStats.targetId) {
            // Find players in the room
            const players = engine.getEntitiesWithComponent(Position).filter(e => {
                const ePos = e.getComponent(Position);
                return e.hasComponent(CombatStats) && !e.hasComponent(NPC) && ePos?.x === pos.x && ePos?.y === pos.y;
            });

            if (players.length > 0) {
                const target = players[Math.floor(Math.random() * players.length)];
                combatStats.isHostile = true;
                combatStats.targetId = target.id;
                combatStats.engagementTier = EngagementTier.DISENGAGED; // Start at disengaged
                console.log(`[NPC AI] ${npcComp.typeName} (${npc.id}) noticed player ${target.id}`);
                this.messageService.combat(target.id, `<enemy>${npcComp.typeName} notices you and prepares to attack!</enemy>`);
            }
        }

        if (!combatStats.isHostile || !combatStats.targetId) return;

        // 2. Validate Target
        const target = engine.getEntity(combatStats.targetId);
        const targetPos = target?.getComponent(Position);
        if (!target || !targetPos || targetPos.x !== pos.x || targetPos.y !== pos.y) {
            console.log(`[NPC AI] ${npcComp.typeName} (${npc.id}) lost target ${combatStats.targetId}`);
            combatStats.isHostile = false;
            combatStats.targetId = null;
            combatStats.engagementTier = EngagementTier.DISENGAGED;
            return;
        }

        // 3. Advancing / Attacking
        const targetCombatStats = target.getComponent(CombatStats);
        if (!targetCombatStats) return;

        // Check if NPC can act (not in Roundtime)
        const rt = npc.getComponent(Roundtime) as any;
        if (rt && rt.secondsRemaining > 0) {
            console.log(`[NPC AI] ${npcComp.typeName} (${npc.id}) in roundtime: ${rt.secondsRemaining.toFixed(1)}s`);
            return;
        }

        const isAtAttackRange = combatStats.engagementTier === EngagementTier.MELEE || combatStats.engagementTier === EngagementTier.CLOSE_QUARTERS;

        if (!isAtAttackRange) {
            console.log(`[NPC AI] ${npcComp.typeName} (${npc.id}) checking advance: current tier=${combatStats.engagementTier}, target=${target.id}`);
            // Attempt to Advance (15% chance per tick if aggressive)
            if (Math.random() < 0.15) {
                console.log(`[NPC AI] ${npcComp.typeName} (${npc.id}) attempting advance (passed 15% check)`);
                // RNG/Skill Check
                const npcStats = npc.getComponent(Stats) as Stats; // NPCs might not have Stats, fallback to base
                const npcAgility = npcStats?.attributes?.get('AGI')?.value || 10;
                const targetStats = target.getComponent(Stats) as Stats;
                const targetAgility = targetStats?.attributes?.get('AGI')?.value || 10;

                let successChance = 0.5 + (npcAgility - targetAgility) * 0.05;
                if (targetCombatStats.isHangingBack) {
                    successChance -= 0.4; // Hanging back makes it much harder
                }

                console.log(`[NPC AI] ${npcComp.typeName} (${npc.id}) advance check: chance=${successChance.toFixed(2)}, AGI=${npcAgility} vs ${targetAgility}, hangback=${targetCombatStats.isHangingBack}`);

                if (Math.random() < successChance) {
                    // Advance to next tier
                    const tiers = Object.values(EngagementTier);
                    const currentIndex = tiers.indexOf(combatStats.engagementTier);
                    if (currentIndex < tiers.length - 1) {
                        combatStats.engagementTier = tiers[currentIndex + 1];
                        console.log(`[NPC AI] ${npcComp.typeName} advances on ${target.id}. New Range: ${combatStats.engagementTier}`);

                        // Send message to target
                        const targetMsg = `<advance>${npcComp.typeName} advances toward you! (Range: <range>${combatStats.engagementTier}</range>)</advance>`;
                        this.messageService.combat(target.id, targetMsg);

                        // Send message to other players in the room
                        const playersInRoom = engine.getEntitiesWithComponent(Position).filter(e => {
                            const ePos = e.getComponent(Position);
                            return e.hasComponent(CombatStats) && !e.hasComponent(NPC) &&
                                ePos?.x === pos.x && ePos?.y === pos.y && e.id !== target.id;
                        });

                        for (const observer of playersInRoom) {
                            const observerMsg = `<advance>${npcComp.typeName} advances toward another combatant! (Range: <range>${combatStats.engagementTier}</range>)</advance>`;
                            this.messageService.combat(observer.id, observerMsg);
                        }

                        // Set mutual engagement for polearm and closer
                        if ([EngagementTier.POLEARM, EngagementTier.MELEE, EngagementTier.CLOSE_QUARTERS].includes(combatStats.engagementTier)) {
                            console.log(`[NPC AI] Syncing ${target.id} engagement to ${combatStats.engagementTier}`);
                            targetCombatStats.engagementTier = combatStats.engagementTier;
                            this.messageService.combat(target.id, `<advance>You are now engaged with ${npcComp.typeName} at <range>${combatStats.engagementTier}</range> range!</advance>`);
                        }

                        // Apply Roundtime for advancing (4 seconds)
                        this.combatSystem.applyRoundtime(npc.id, 4, engine);
                    }
                } else {
                    console.log(`[NPC AI] ${npcComp.typeName} (${npc.id}) advance failed`);
                    if (targetCombatStats.isHangingBack) {
                        this.messageService.combat(target.id, `<info>You successfully keep ${npcComp.typeName} at bay.</info>`);
                    } else if (Math.random() < 0.1) { // 10% chance to show stalking message if check failed
                        const stalkingMessages = [
                            `${npcComp.typeName} circles you warily, looking for an opening.`,
                            `${npcComp.typeName} crouches low, eyes fixed on you.`,
                            `${npcComp.typeName} inches closer, testing your defenses.`
                        ];
                        const msg = stalkingMessages[Math.floor(Math.random() * stalkingMessages.length)];
                        this.messageService.combat(target.id, `<advance>${msg}</advance>`);
                    }
                }
            } else {
                console.log(`[NPC AI] ${npcComp.typeName} (${npc.id}) did not attempt advance (failed 15% check)`);
            }
        }

        if (combatStats.engagementTier === EngagementTier.MELEE || combatStats.engagementTier === EngagementTier.CLOSE_QUARTERS) {
            this.combatSystem.handleNPCAttack(npc.id, target.id, engine);
        }
    }

    private moveRandomly(npc: Entity, pos: Position, engine: IEngine) {
        const npcComp = npc.getComponent(NPC);

        // Check if NPC is allowed to move
        if (npcComp && !npcComp.canMove) {
            return;
        }

        // Check if NPC is engaged in combat
        const combatStats = npc.getComponent(CombatStats);
        if (combatStats) {
            if ([EngagementTier.MELEE, EngagementTier.CLOSE_QUARTERS, EngagementTier.POLEARM].includes(combatStats.engagementTier)) {
                return; // Cannot move while engaged
            }
        }

        const directions = [
            { x: 0, y: -1, name: 'north', reverse: 'south' },
            { x: 0, y: 1, name: 'south', reverse: 'north' },
            { x: 1, y: 0, name: 'east', reverse: 'west' },
            { x: -1, y: 0, name: 'west', reverse: 'east' }
        ];
        const move = directions[Math.floor(Math.random() * directions.length)];

        const newX = pos.x + move.x;
        const newY = pos.y + move.y;

        // Check if the new position is a valid room
        const targetRoom = WorldQuery.findRoomAt(engine, newX, newY);

        if (targetRoom) {
            const name = npcComp ? npcComp.typeName : 'Something';

            // Broadcast leaving message to old room
            this.broadcastToRoom(engine, pos.x, pos.y, `<movement>${name} has left to the ${move.name}.</movement>`);

            pos.x = newX;
            pos.y = newY;

            // Reset engagement tier on room change
            if (combatStats) {
                combatStats.engagementTier = EngagementTier.DISENGAGED;
            }

            // Broadcast entering message to new room
            if (npcComp && npcComp.tag === 'turing') {
                this.broadcastToRoom(engine, pos.x, pos.y, `<movement>The air grows cold as a man in a sharp charcoal suit enters, his eyes shielded by mirrored Steiner-Optics.</movement>`);
            } else {
                this.broadcastToRoom(engine, pos.x, pos.y, `<movement>${name} has entered from the ${move.reverse}.</movement>`);
            }
        }
    }

    private broadcastToRoom(engine: IEngine, x: number, y: number, message: string) {
        for (const entity of engine.getEntities().values()) {
            if (!entity.hasComponent(NPC)) {
                const pos = entity.getComponent(Position);
                if (pos && pos.x === x && pos.y === y) {
                    this.messageService.info(entity.id, message);
                }
            }
        }
    }

    private bark(npc: Entity, npcComp: NPC, pos: Position, engine: IEngine) {
        const bark = npcComp.barks[Math.floor(Math.random() * npcComp.barks.length)];
        const message = MessageFormatter.speech(npcComp.typeName, bark);

        // Broadcast to players in the same room
        for (const entity of engine.getEntities().values()) {
            // Check if entity is a player (has socket ID as ID usually)
            // For now, we assume entities with no NPC component are players
            if (entity.hasComponent(NPC)) continue;

            const entityPos = entity.getComponent(Position);
            if (entityPos) {
                // Exact match check
                if (entityPos.x === pos.x && entityPos.y === pos.y) {
                    this.messageService.info(entity.id, message);
                }
            }
        }
    }
}
