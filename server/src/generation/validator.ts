import { Proposal, ProposalType, ItemPayload, NPCPayload, RoomPayload } from './proposals/schemas';
import { GuardrailService } from '../services/GuardrailService';

export class ProposalValidator {
    private guardrails: GuardrailService;

    constructor(guardrails: GuardrailService) {
        this.guardrails = guardrails;
    }

    public validate(proposal: Proposal): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const config = this.guardrails.getConfig();

        // 1. Content Filter Check (Flavor text)
        if (proposal.flavor) {
            if (proposal.flavor.rationale && !this.guardrails.checkContent(proposal.flavor.rationale)) {
                errors.push("Rationale contains banned words.");
            }
            if (proposal.flavor.lore && !this.guardrails.checkContent(proposal.flavor.lore)) {
                errors.push("Lore contains banned words.");
            }
        }

        // 2. Type-Specific Checks
        switch (proposal.type) {
            case ProposalType.ITEM:
                this.validateItem(proposal.payload as ItemPayload, errors);
                break;
            case ProposalType.NPC:
                this.validateNPC(proposal.payload as NPCPayload, errors);
                break;
            case ProposalType.WORLD_EXPANSION:
                this.validateRoom(proposal.payload as RoomPayload, errors);
                break;
            // Add other types as needed
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    private validateItem(item: ItemPayload, errors: string[]) {
        // Check Cost
        if (item.cost > this.guardrails.getConfig().budgets.maxItemValue) {
            errors.push(`Item cost ${item.cost} exceeds budget ${this.guardrails.getConfig().budgets.maxItemValue}`);
        }

        // Check Damage (if weapon)
        if (item.type === 'weapon' && item.attributes) {
            const damage = (item.attributes as any).damage;
            if (typeof damage === 'number' && damage > this.guardrails.getConfig().budgets.maxWeaponDamage) {
                errors.push(`Weapon damage ${damage} exceeds limit ${this.guardrails.getConfig().budgets.maxWeaponDamage}`);
            }
        }

        // Check Defense (if armor)
        if (item.type === 'armor' && item.attributes) {
            const defense = (item.attributes as any).defense;
            if (typeof defense === 'number' && defense > this.guardrails.getConfig().budgets.maxArmorDefense) {
                errors.push(`Armor defense ${defense} exceeds limit ${this.guardrails.getConfig().budgets.maxArmorDefense}`);
            }
        }
    }

    private validateNPC(npc: NPCPayload, errors: string[]) {
        // Check Health
        if (npc.stats.health > this.guardrails.getConfig().budgets.maxNPCHealth) {
            errors.push(`NPC health ${npc.stats.health} exceeds limit ${this.guardrails.getConfig().budgets.maxNPCHealth}`);
        }

        // Check Name Content
        if (!this.guardrails.checkContent(npc.name)) {
            errors.push(`NPC name '${npc.name}' contains banned words.`);
        }
    }

    private validateRoom(room: RoomPayload, errors: string[]) {
        if (!this.guardrails.checkContent(room.name)) {
            errors.push(`Room name '${room.name}' contains banned words.`);
        }
        if (!this.guardrails.checkContent(room.description)) {
            errors.push(`Room description contains banned words.`);
        }
    }
}
