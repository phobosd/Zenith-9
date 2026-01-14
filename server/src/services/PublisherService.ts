import fs from 'fs';
import path from 'path';
import { Proposal, ProposalStatus } from '../generation/proposals/schemas';

export class PublisherService {
    private generatedDir: string;

    constructor(baseDir: string = process.cwd()) {
        this.generatedDir = path.join(baseDir, 'data', 'generated');
        this.ensureDirectory();
    }

    private ensureDirectory() {
        if (!fs.existsSync(this.generatedDir)) {
            fs.mkdirSync(this.generatedDir, { recursive: true });
        }

        // Create subdirectories for each type
        const types = ['NPC', 'ITEM', 'QUEST', 'BUILDING', 'EVENT', 'WORLD_EXPANSION'];
        types.forEach(type => {
            const typeDir = path.join(this.generatedDir, type.toLowerCase() + 's');
            if (!fs.existsSync(typeDir)) {
                fs.mkdirSync(typeDir, { recursive: true });
            }
        });
    }

    public async publish(proposal: Proposal): Promise<string> {
        if (proposal.status !== ProposalStatus.APPROVED) {
            throw new Error(`Cannot publish proposal in status: ${proposal.status}`);
        }

        const typeDir = path.join(this.generatedDir, proposal.type.toLowerCase() + 's');
        const fileName = `${proposal.payload.id}.json`;
        const filePath = path.join(typeDir, fileName);

        // Add metadata to the published file
        const output = {
            ...proposal.payload,
            _metadata: {
                proposalId: proposal.id,
                generatedAt: proposal.createdAt,
                publishedAt: Date.now(),
                seed: proposal.seed,
                flavor: proposal.flavor
            }
        };

        fs.writeFileSync(filePath, JSON.stringify(output, null, 2));

        proposal.status = ProposalStatus.PUBLISHED;
        return filePath;
    }

    public getPublishedFiles(type?: string): string[] {
        const targetDir = type ? path.join(this.generatedDir, type.toLowerCase() + 's') : this.generatedDir;
        if (!fs.existsSync(targetDir)) return [];

        return fs.readdirSync(targetDir, { recursive: true }) as string[];
    }
}
