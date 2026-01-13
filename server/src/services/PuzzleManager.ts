import { Server } from 'socket.io';
import { IEngine } from '../ecs/IEngine';
import { WorldQuery } from '../utils/WorldQuery';
import { Position } from '../components/Position';
import { Description } from '../components/Description';
import { PuzzleObject } from '../components/PuzzleObject';
import { Item } from '../components/Item';
import { Inventory } from '../components/Inventory';
import { Container } from '../components/Container';
import { PrefabFactory } from '../factories/PrefabFactory';

import { MessageService } from '../services/MessageService';

export class PuzzleManager {
    constructor(private io: Server, private messageService: MessageService) { }

    handleTurn(entityId: string, engine: IEngine, targetName: string, direction: string) {
        const player = WorldQuery.getEntityById(engine, entityId);
        if (!player) return;

        const playerPos = player.getComponent(Position);
        if (!playerPos) return;

        // Find the target object in the room
        const targetEntity = engine.getEntitiesWithComponent(Description).find(e => {
            const pos = e.getComponent(Position);
            const desc = e.getComponent(Description);
            return pos && desc && pos.x === playerPos.x && pos.y === playerPos.y &&
                desc.title.toLowerCase().includes(targetName.toLowerCase());
        });

        if (!targetEntity) {
            this.messageService.info(entityId, `You don't see ${targetName} here.`);
            return;
        }

        const puzzleObj = targetEntity.getComponent(PuzzleObject);
        if (!puzzleObj) {
            this.messageService.info(entityId, `You can't turn that.`);
            return;
        }

        // Check if it's the Terra Bust (cannot be turned)
        const desc = targetEntity.getComponent(Description);
        if (desc && desc.title === "Terra Bust") {
            this.messageService.info(entityId, "The bust is fused to its base and cannot be turned.");
            return;
        }

        // Normalize direction
        const validDirs = ['north', 'south', 'east', 'west'];
        const dir = direction.toLowerCase();
        if (!validDirs.includes(dir)) {
            this.messageService.info(entityId, `Invalid direction. Try north, south, east, or west.`);
            return;
        }

        // Update Direction
        puzzleObj.currentDirection = dir;

        // Update Description
        if (desc) {
            // Remove old direction text if present (assuming it ends with "It is currently facing...")
            const baseDesc = desc.description.split(" It is currently facing")[0];
            desc.description = `${baseDesc} It is currently facing ${dir.charAt(0).toUpperCase() + dir.slice(1)}.`;
        }

        this.messageService.action(entityId, `You turn the ${targetName} to face ${dir}.`);

        // Atmospheric Hints for Wrong Directions
        if (desc) {
            if (desc.title === "Ignis Bust" && dir === "north") {
                this.messageService.info(entityId, "The ruby eyes of the bust catch the light, but it feels misplaced facing the north.");
            } else if (desc.title === "Ignis Bust" && dir !== "west") {
                // Generic hint for other wrong directions for Ignis? Or just leave it.
            }

            if (desc.title === "Aqua Bust" && dir !== "south") {
                // Hint for Aqua?
            }
        }

        // Check Puzzle Completion
        this.checkPuzzleCompletion(puzzleObj.puzzleId, engine, playerPos, entityId);
    }

    private checkPuzzleCompletion(puzzleId: string, engine: IEngine, pos: Position, playerId: string) {
        // Find all objects with this puzzleId
        const puzzleObjects = engine.getEntitiesWithComponent(PuzzleObject).filter(e => {
            const p = e.getComponent(PuzzleObject);
            return p && p.puzzleId === puzzleId;
        });

        // Check if all are correct
        let allCorrect = true;
        for (const obj of puzzleObjects) {
            const p = obj.getComponent(PuzzleObject);
            if (p && p.targetDirection && p.currentDirection !== p.targetDirection) {
                allCorrect = false;
                break;
            }
        }

        if (allCorrect) {
            // Check if already solved (to prevent infinite rewards)
            const rewardInRoom = engine.getEntitiesWithComponent(Item).some(e => {
                const item = e.getComponent(Item);
                const p = e.getComponent(Position);
                return item && item.name === "Platinum Hard Disk" && p && p.x === pos.x && p.y === pos.y;
            });

            // Check if player has the reward
            const player = WorldQuery.getEntityById(engine, playerId);
            let playerHasReward = false;
            if (player) {
                const inventory = player.getComponent(Inventory);
                if (inventory) {
                    // Check hands
                    if (inventory.leftHand) {
                        const lItem = WorldQuery.getEntityById(engine, inventory.leftHand);
                        if (lItem?.getComponent(Item)?.name === "Platinum Hard Disk") playerHasReward = true;
                    }
                    if (inventory.rightHand) {
                        const rItem = WorldQuery.getEntityById(engine, inventory.rightHand);
                        if (rItem?.getComponent(Item)?.name === "Platinum Hard Disk") playerHasReward = true;
                    }
                    // Check backpack/equipment
                    if (!playerHasReward) {
                        for (const [slot, itemId] of inventory.equipment) {
                            const item = WorldQuery.getEntityById(engine, itemId);
                            if (item?.getComponent(Item)?.name === "Platinum Hard Disk") {
                                playerHasReward = true;
                                break;
                            }
                            // Check inside container (backpack)
                            const container = item?.getComponent(Container);
                            if (container) {
                                for (const subId of container.items) {
                                    const subItem = WorldQuery.getEntityById(engine, subId);
                                    if (subItem?.getComponent(Item)?.name === "Platinum Hard Disk") {
                                        playerHasReward = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (!rewardInRoom && !playerHasReward) {
                this.messageService.success(playerId, `CLICK! You hear a mechanical latch unlock inside the stone table. A compartment slides open!`);

                // Update Table Description
                const table = engine.getEntitiesWithComponent(Description).find(e => {
                    const p = e.getComponent(Position);
                    const d = e.getComponent(Description);
                    return p && d && p.x === pos.x && p.y === pos.y && d.title === "Stone Table";
                });

                if (table) {
                    const d = table.getComponent(Description);
                    if (d) {
                        d.description = "A heavy stone table with an open compartment revealing a shiny object. The inscription reads: 'The sun sets in the west, the rain falls to the mud, and the wind blows toward the dawn.'";
                    }
                }

                // Spawn Reward
                const reward = PrefabFactory.createItem("platinum_disk");
                if (reward) {
                    reward.addComponent(new Position(pos.x, pos.y));
                    engine.addEntity(reward);
                } else {
                    console.error("Failed to create platinum_disk reward. Check items.csv and ItemRegistry.");
                    this.messageService.system(playerId, "Error: Reward item not found in database.");
                }
            } else {
                this.messageService.system(playerId, "The mechanism clicks, but nothing happens. It seems the compartment is already open.");
            }

            // Reset Puzzle (Scramble Busts)
            puzzleObjects.forEach(obj => {
                const p = obj.getComponent(PuzzleObject);
                const d = obj.getComponent(Description);
                if (p && d) {
                    p.currentDirection = 'north'; // Reset to default
                    const baseDesc = d.description.split(" It is currently facing")[0];
                    d.description = `${baseDesc} It is currently facing North.`;
                }
            });
            this.messageService.action(playerId, `The busts mechanically whir and reset to their original positions.`);
        }
    }
}
