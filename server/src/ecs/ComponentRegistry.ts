import { ComponentClass } from './Component';
import { Position } from '../components/Position';
import { Description } from '../components/Description';
import { IsRoom } from '../components/IsRoom';
import { Item } from '../components/Item';
import { Inventory } from '../components/Inventory';
import { Container } from '../components/Container';
import { Stats } from '../components/Stats';
import { CombatStats } from '../components/CombatStats';
import { Stance } from '../components/Stance';
import { NPC } from '../components/NPC';
import { Shop } from '../components/Shop';
import { Terminal } from '../components/Terminal';
import { PuzzleObject } from '../components/PuzzleObject';
import { Credits } from '../components/Credits';
import { Magazine } from '../components/Magazine';
import { Weapon } from '../components/Weapon';
import { IsCyberspace } from '../components/IsCyberspace';
import { IsPersona } from '../components/IsPersona';
import { IsICE } from '../components/IsICE';
import { Atmosphere } from '../components/Atmosphere';
import { Cyberware } from '../components/Cyberware';
import { Portal } from '../components/Portal';
import { Visuals } from '../components/Visuals';
import { Momentum } from '../components/Momentum';
import { Reputation } from '../components/Reputation';
import { Heat } from '../components/Heat';
import { Humanity } from '../components/Humanity';
import { Role } from '../components/Role';
import { CombatBuffer } from '../components/CombatBuffer';
import { Roundtime } from '../components/Roundtime';
import { LogoutTimer } from '../components/LogoutTimer';
import { QuestGiver } from '../components/QuestGiver';
import { PlayerQuests } from '../components/PlayerQuests';
import { Armor } from '../components/Armor'; // Added based on the provided Code Edit
import { Loot } from '../components/Loot'; // Added based on the provided Code Edit

export class ComponentRegistry {
    private static instance: ComponentRegistry;
    private componentMap: Map<string, any> = new Map();

    private constructor() {
        this.registerComponents();
    }

    public static getInstance(): ComponentRegistry {
        if (!ComponentRegistry.instance) {
            ComponentRegistry.instance = new ComponentRegistry();
        }
        return ComponentRegistry.instance;
    }

    public static get(name: string): any {
        return this.getInstance().componentMap.get(name);
    }

    public static init() {
        this.getInstance();
    }

    private registerComponents() {
        this.componentMap.set('Position', Position);
        this.componentMap.set('Visuals', Visuals);
        this.componentMap.set('Description', Description);
        this.componentMap.set('IsRoom', IsRoom);
        this.componentMap.set('Room', IsRoom); // Alias for backward compatibility
        this.componentMap.set('Atmosphere', Atmosphere);
        this.componentMap.set('Item', Item);
        this.componentMap.set('Container', Container);
        this.componentMap.set('NPC', NPC);
        this.componentMap.set('Stats', Stats);
        this.componentMap.set('CombatStats', CombatStats);
        this.componentMap.set('Inventory', Inventory);
        this.componentMap.set('Weapon', Weapon);
        this.componentMap.set('Armor', Armor);
        this.componentMap.set('Cyberware', Cyberware);
        this.componentMap.set('Terminal', Terminal);
        this.componentMap.set('Shop', Shop);
        this.componentMap.set('Portal', Portal);
        this.componentMap.set('Loot', Loot);
        this.componentMap.set('Roundtime', Roundtime);
        this.componentMap.set('CombatBuffer', CombatBuffer);
        this.componentMap.set('Stance', Stance);
        this.componentMap.set('Momentum', Momentum);
        this.componentMap.set('IsCyberspace', IsCyberspace);
        this.componentMap.set('IsPersona', IsPersona);
        this.componentMap.set('IsICE', IsICE);
        this.componentMap.set('PuzzleObject', PuzzleObject);
        this.componentMap.set('Credits', Credits);
        this.componentMap.set('Magazine', Magazine);
        this.componentMap.set('LogoutTimer', LogoutTimer);
        this.componentMap.set('Reputation', Reputation);
        this.componentMap.set('Heat', Heat);
        this.componentMap.set('Humanity', Humanity);
        this.componentMap.set('Role', Role);
        this.componentMap.set('QuestGiver', QuestGiver);
        this.componentMap.set('PlayerQuests', PlayerQuests);
    }
}
