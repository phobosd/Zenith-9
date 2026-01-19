import { Component } from '../ecs/Component';

export interface ScheduleEntry {
    startTime: number; // Hour (0-23)
    endTime: number;
    location: { x: number, y: number };
    activity: string;
}

export class Schedule extends Component {
    static type = 'Schedule';

    constructor(
        public entries: ScheduleEntry[] = []
    ) {
        super();
    }

    getCurrentEntry(hour: number): ScheduleEntry | null {
        // Handle wrapping around midnight (e.g., 22:00 to 06:00)
        return this.entries.find(e => {
            if (e.startTime <= e.endTime) {
                return hour >= e.startTime && hour < e.endTime;
            } else {
                // Wrap around case
                return hour >= e.startTime || hour < e.endTime;
            }
        }) || null;
    }
}
