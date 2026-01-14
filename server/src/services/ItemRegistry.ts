import * as fs from 'fs';
import * as path from 'path';
// import { parse } from 'csv-parse/sync';
const { parse } = require('csv-parse/sync');
import { Logger } from '../utils/Logger';

export interface ItemDefinition {
    id: string;
    name: string;
    shortName: string;
    description: string;
    weight: number;
    size: string;
    legality: string;
    attributes: string;
    cost: number;
    type: 'item' | 'weapon' | 'container' | 'cyberware' | 'armor';
    slot?: string | null;
    rarity?: string;
    extraData: any;
}

export class ItemRegistry {
    private static instance: ItemRegistry;
    private items: Map<string, ItemDefinition> = new Map();

    private constructor() {
        this.loadItems();
    }

    public static getInstance(): ItemRegistry {
        if (!ItemRegistry.instance) {
            ItemRegistry.instance = new ItemRegistry();
        }
        return ItemRegistry.instance;
    }

    private loadItems() {
        try {
            const dataDir = path.join(process.cwd(), 'data');
            const jsonPath = path.join(dataDir, 'items.json');
            const csvPath = path.join(dataDir, 'items.csv');

            if (fs.existsSync(jsonPath)) {
                Logger.info('ItemRegistry', `Loading items from JSON: ${jsonPath}`);
                const content = fs.readFileSync(jsonPath, 'utf-8');
                const items = JSON.parse(content);
                for (const item of items) {
                    // Swap name and shortName for hardcoded items
                    const prettyName = item.shortName || item.name;
                    const slug = item.name;
                    item.name = prettyName;
                    item.shortName = slug;

                    this.items.set(item.id.toString().trim(), item);
                    this.items.set(item.name.toLowerCase().trim(), item);
                    if (item.shortName) {
                        this.items.set(item.shortName.toLowerCase().trim(), item);
                    }
                }
                Logger.info('ItemRegistry', `Loaded ${items.length} items from JSON.`);
                return;
            }

            if (fs.existsSync(csvPath)) {
                Logger.info('ItemRegistry', `Loading items from CSV: ${csvPath}`);
                const fileContent = fs.readFileSync(csvPath, 'utf-8');
                const records = parse(fileContent, {
                    columns: true,
                    skip_empty_lines: true,
                    trim: true
                });

                for (const record of records) {
                    try {
                        const def: ItemDefinition = {
                            id: record.id,
                            name: record.shortName || record.name, // Swap: shortName is the pretty name in CSV
                            shortName: record.name, // Swap: name is the slug in CSV
                            description: record.description,
                            weight: parseFloat(record.weight) || 0,
                            size: record.size,
                            legality: record.legality,
                            attributes: record.attributes,
                            cost: parseInt(record.cost) || 0,
                            type: record.type as any,
                            extraData: record.extraData ? JSON.parse(record.extraData) : {}
                        };
                        this.items.set(def.id.toString().trim(), def);
                        this.items.set(def.name.toLowerCase().trim(), def);
                        if (def.shortName) {
                            this.items.set(def.shortName.toLowerCase().trim(), def);
                        }
                    } catch (err) {
                        Logger.error('ItemRegistry', `Failed to parse CSV record: ${record.id}`, err);
                    }
                }
                Logger.info('ItemRegistry', `Loaded ${this.items.size / 2} items from CSV.`);
                return;
            }

            Logger.error('ItemRegistry', "No items.json or items.csv found!");
        } catch (error) {
            Logger.error('ItemRegistry', "Failed to load items:", error);
        } finally {
            this.loadGeneratedItems();
        }
    }

    public reloadGeneratedItems() {
        this.loadGeneratedItems();
    }

    private loadGeneratedItems() {
        try {
            const generatedDir = path.join(process.cwd(), 'data', 'generated', 'items');
            if (!fs.existsSync(generatedDir)) return;

            const files = fs.readdirSync(generatedDir).filter(f => f.endsWith('.json'));
            Logger.info('ItemRegistry', `Loading ${files.length} generated items...`);

            for (const file of files) {
                try {
                    const content = fs.readFileSync(path.join(generatedDir, file), 'utf-8');
                    const item = JSON.parse(content);

                    // Map generated payload to ItemDefinition
                    const def: ItemDefinition = {
                        id: item.id,
                        name: item.name,
                        shortName: item.shortName,
                        description: item.description,
                        weight: item.weight || 1,
                        size: "Medium",
                        legality: "Legal",
                        attributes: "",
                        cost: item.cost || 0,
                        type: item.type === 'junk' ? 'item' : item.type,
                        rarity: item.rarity,
                        extraData: item.attributes || {}
                    };

                    this.items.set(def.id.toString().trim(), def);
                    this.items.set(def.name.toLowerCase().trim(), def);
                    if (def.shortName) {
                        this.items.set(def.shortName.toLowerCase().trim(), def);
                    }
                } catch (err) {
                    Logger.error('ItemRegistry', `Failed to load generated item ${file}:`, err);
                }
            }
        } catch (err) {
            Logger.error('ItemRegistry', "Failed to load generated items:", err);
        }
    }

    public getItem(id: string): ItemDefinition | undefined {
        if (!id) return undefined;
        return this.items.get(id.toLowerCase().trim());
    }

    public getAllItems(): ItemDefinition[] {
        return Array.from(this.items.values());
    }

    public getUniqueItemNames(): string[] {
        const names = new Set<string>();
        for (const item of this.items.values()) {
            names.add(item.name);
        }
        return Array.from(names);
    }

    public deleteItem(id: string): boolean {
        const item = this.items.get(id);
        if (!item) return false;

        // Remove from map
        this.items.delete(id);
        this.items.delete(item.name.toLowerCase().trim());
        if (item.shortName) {
            this.items.delete(item.shortName.toLowerCase().trim());
        }

        // Try to delete file if it's generated
        try {
            const generatedDir = path.join(process.cwd(), 'data', 'generated', 'items');
            const files = fs.readdirSync(generatedDir);
            for (const file of files) {
                const content = fs.readFileSync(path.join(generatedDir, file), 'utf-8');
                const json = JSON.parse(content);
                if (json.id === id) {
                    fs.unlinkSync(path.join(generatedDir, file));
                    Logger.info('ItemRegistry', `Deleted generated item file: ${file}`);
                    return true;
                }
            }
        } catch (err) {
            Logger.warn('ItemRegistry', `Could not delete file for item ${id} (might be hardcoded or error): ${err}`);
        }

        return true;
    }

    public updateItem(id: string, updates: Partial<ItemDefinition>): boolean {
        const item = this.items.get(id);
        if (!item) return false;

        // Update in memory
        Object.assign(item, updates);
        this.items.set(id, item); // Re-set to ensure map is up to date

        // Try to update file if it's generated
        try {
            const generatedDir = path.join(process.cwd(), 'data', 'generated', 'items');
            if (!fs.existsSync(generatedDir)) return false;

            const files = fs.readdirSync(generatedDir);
            for (const file of files) {
                const filePath = path.join(generatedDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const json = JSON.parse(content);

                if (json.id === id) {
                    // Merge updates into the JSON structure
                    // Note: ItemDefinition structure is slightly different from the JSON payload structure
                    // We need to map back carefully

                    if (updates.name) json.name = updates.name;
                    if (updates.description) json.description = updates.description;
                    if (updates.cost !== undefined) json.cost = updates.cost;
                    if (updates.weight !== undefined) json.weight = updates.weight;
                    if (updates.rarity) json.rarity = updates.rarity;

                    // Handle extraData / attributes
                    if (updates.extraData) {
                        json.attributes = { ...json.attributes, ...updates.extraData };
                    }

                    fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
                    Logger.info('ItemRegistry', `Updated generated item file: ${file}`);
                    return true;
                }
            }
        } catch (err) {
            Logger.warn('ItemRegistry', `Could not update file for item ${id}: ${err}`);
        }

        return true;
    }
}
