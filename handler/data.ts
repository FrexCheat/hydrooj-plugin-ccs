import { ObjectId, param, Types } from 'hydrooj';
import { CCSAdapter } from '../lib/adapter';
import { CCSContestBaseHandler } from './base';

export class LanguagesHandler extends CCSContestBaseHandler {
    async get() {
        this.response.type = 'application/json';
        this.response.body = [
            { id: 'c', name: 'C' },
            { id: 'cpp', name: 'C++' },
            { id: 'cc', name: 'C++' },
            { id: 'java', name: 'Java' },
            { id: 'python', name: 'Python' },
            { id: 'py', name: 'Python' },
            { id: 'kotlin', name: 'Kotlin' },
            { id: 'kt', name: 'Kotlin' },
            { id: 'rust', name: 'Rust' },
            { id: 'go', name: 'Go' },
        ];
    }
}

export class ProblemsHandler extends CCSContestBaseHandler {
    @param('contestId', Types.String)
    async get(domainId: string, contestId: string) {
        const { tdoc, pdict } = await this.getContestData(domainId, new ObjectId(contestId));
        const problems = tdoc.pids.map((pid, index) => (CCSAdapter.toProblem(tdoc, pdict, index, pid)));
        this.response.body = problems;
    }
}
