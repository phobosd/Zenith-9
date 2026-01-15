import { CombatStats } from '../components/CombatStats';

export enum DamageSeverity {
    GLANCING = 0,
    LIGHT = 1,
    GOOD_HIT = 2,
    GOOD_STRIKE = 3,
    SOLID = 4,
    HARD = 5,
    STRONG = 6,
    HEAVY = 7,
    VERY_HEAVY = 8,
    EXTREMELY_HEAVY = 9,
    POWERFUL = 10,
    MASSIVE = 11,
    AWESOME = 12,
    VICIOUS = 13,
    EARTH_SHAKING = 14,
    DEMOLISHING = 15,
    SPINE_RATTLING = 16,
    DEVASTATING = 17,
    OVERWHELMING = 18,
    OBLITERATING = 19,
    ANNIHILATING = 20,
    CATACLYSMIC = 21
}

export class HealthDescriptor {
    static getDamageDescriptor(damage: number): string {
        // Map damage to severity tier
        // This mapping might need tuning based on typical damage values
        // Assuming typical weapon damage is 5-50 range

        let tier = 0;
        if (damage <= 0) tier = 0;
        else if (damage < 5) tier = 1;
        else if (damage < 10) tier = 2;
        else if (damage < 15) tier = 3;
        else if (damage < 20) tier = 4; // Solid
        else if (damage < 25) tier = 5;
        else if (damage < 30) tier = 6;
        else if (damage < 35) tier = 7;
        else if (damage < 40) tier = 8;
        else if (damage < 45) tier = 9;
        else if (damage < 50) tier = 10; // Powerful
        else if (damage < 60) tier = 11;
        else if (damage < 70) tier = 12;
        else if (damage < 80) tier = 13;
        else if (damage < 90) tier = 14;
        else if (damage < 100) tier = 15; // Demolishing
        else if (damage < 120) tier = 16;
        else if (damage < 140) tier = 17;
        else if (damage < 160) tier = 18;
        else if (damage < 180) tier = 19;
        else if (damage < 200) tier = 20;
        else tier = 21;

        switch (tier) {
            case 0: return "glancing hit"; // or grazing, harmless
            case 1: return "light hit";
            case 2: return "good hit";
            case 3: return "good strike";
            case 4: return "solid hit";
            case 5: return "hard hit";
            case 6: return "strong hit";
            case 7: return "heavy strike";
            case 8: return "very heavy hit";
            case 9: return "extremely heavy hit";
            case 10: return "powerful strike";
            case 11: return "massive strike";
            case 12: return "awesome strike";
            case 13: return "vicious strike";
            case 14: return "earth-shaking strike";
            case 15: return "demolishing hit";
            case 16: return "spine-rattling strike";
            case 17: return "devastating hit";
            case 18: return "overwhelming strike";
            case 19: return "obliterating hit";
            case 20: return "annihilating strike";
            default: return "cataclysmic strike";
        }
    }

    static getStatusDescriptor(currentHp: number, maxHp: number): string {
        const percentage = (currentHp / maxHp) * 100;

        if (percentage >= 100) return "Pristine";
        if (percentage >= 75) return "Scratched";
        if (percentage >= 50) return "Wounded";
        if (percentage >= 25) return "Battered";
        if (percentage >= 10) return "Critical";
        return "Near Death";
    }

    static getDetailedStatus(stats: CombatStats, maxFatigue: number = 100): string {
        const status = this.getStatusDescriptor(stats.hp, stats.maxHp);
        let detail = `Status: ${status}`;

        // Add fatigue info
        if (stats.fatigue < maxFatigue * 0.2) {
            detail += " (Exhausted)";
        } else if (stats.fatigue < maxFatigue * 0.5) {
            detail += " (Tired)";
        }

        return detail;
    }
}
