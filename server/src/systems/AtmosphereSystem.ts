import { System } from '../ecs/System';
import { IEngine } from '../ecs/IEngine';
import { Atmosphere } from '../components/Atmosphere';
import { IsCyberspace } from '../components/IsCyberspace';
import { MessageService } from '../services/MessageService';
import { Logger } from '../utils/Logger';

interface WeatherState {
    sky: string;
    lighting: string;
    contrast: string;
    message: string;
}

const WEATHER_STATES: WeatherState[] = [
    {
        sky: "Dead Channel",
        lighting: "Mercury-Vapor",
        contrast: "High",
        message: "The sky flickers and settles into a dull, static grey."
    },
    {
        sky: "Corrosive Amber",
        lighting: "Flickering Sodium",
        contrast: "Low",
        message: "A thick, amber haze descends, smelling of ozone and sulfur. Acid rain begins to pit the polycarbon streets."
    },
    {
        sky: "Electric Violet",
        lighting: "Diffused Magenta",
        contrast: "Very Low",
        message: "The smog turns a vibrant violet, catching the diffused glow of distant neon signs."
    },
    {
        sky: "Static White",
        lighting: "Strobe Pulse",
        contrast: "Extreme",
        message: "A data-storm breaks overhead, blinding white static arcing between the arcologies."
    },
    {
        sky: "Onyx Void",
        lighting: "Distant Arc-Light",
        contrast: "High",
        message: "The clouds part briefly, revealing a pitch-black sky pierced by the harsh, sweeping beams of security arc-lights."
    },
    {
        sky: "Ochre Haze",
        lighting: "Muted Amber",
        contrast: "Low",
        message: "The air grows heavy with industrial particulates, bathing the sprawl in a sickly, muted orange glow."
    }
];

export class AtmosphereSystem extends System {
    private timer: number = 0;
    private readonly CHANGE_INTERVAL = 60000; // Change every 1 minute (60,000 ms)
    private currentStateIndex: number = 0;

    constructor(private messageService: MessageService) {
        super();
    }

    update(engine: IEngine, deltaTime: number): void {
        this.timer += deltaTime;

        // Log every 10 seconds to verify it's ticking
        if (Math.floor(this.timer / 100) % 100 === 0) {
            // Logger.info('Atmosphere', `Timer: ${this.timer}/${this.CHANGE_INTERVAL}`);
        }

        if (this.timer >= this.CHANGE_INTERVAL) {
            this.timer = 0;
            this.triggerWeatherChange(engine);
        }
    }

    triggerWeatherChange(engine: IEngine) {
        // Pick a new state different from the current one
        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * WEATHER_STATES.length);
        } while (nextIndex === this.currentStateIndex);

        this.currentStateIndex = nextIndex;
        const newState = WEATHER_STATES[this.currentStateIndex];

        Logger.info('Atmosphere', `Weather changing to: ${newState.sky}`);

        // Update all non-cyberspace atmospheres
        const entities = engine.getEntitiesWithComponent(Atmosphere);
        entities.forEach(entity => {
            if (entity.hasComponent(IsCyberspace)) return;

            const atmosphere = entity.getComponent(Atmosphere);
            if (atmosphere) {
                atmosphere.skyState = newState.sky;
                atmosphere.lighting = newState.lighting;
                atmosphere.contrast = newState.contrast;
            }
        });

        // Broadcast the change to all players
        this.messageService.broadcast(`<atmosphere>The sky shifts: ${newState.message} (${newState.sky})</atmosphere>`);
    }

    getCurrentWeather() {
        return WEATHER_STATES[this.currentStateIndex];
    }
}
