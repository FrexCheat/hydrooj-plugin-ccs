import { ObjectId, param, STATUS, STATUS_SHORT_TEXTS, STATUS_TEXTS, Types } from 'hydrooj';
import { CCSAdapter } from '../lib/adapter';
import { CCSContestBaseHandler } from './base';

export class JudgementTypesHandler extends CCSContestBaseHandler {
    async get() {
        this.response.type = 'application/json';
        this.response.body = [
            ...Object.keys(STATUS_SHORT_TEXTS).map((i) => {
                return {
                    id: STATUS_SHORT_TEXTS[i as unknown as keyof typeof STATUS_SHORT_TEXTS],
                    name: STATUS_TEXTS[i as unknown as keyof typeof STATUS_TEXTS],
                    penalty: ![STATUS.STATUS_ACCEPTED, STATUS.STATUS_COMPILE_ERROR, STATUS.STATUS_SYSTEM_ERROR].includes(+i),
                    solved: +i === STATUS.STATUS_ACCEPTED,
                };
            }),
        ];
    }
}

export class SubmissionsHandler extends CCSContestBaseHandler {
    @param('contestId', Types.String)
    async get(domainId: string, contestId: string) {
        const { tdoc, records } = await this.getContestData(domainId, new ObjectId(contestId));
        const submissions = records.map((rdoc) => {
            return CCSAdapter.toSubmission(tdoc, rdoc);
        });
        this.response.body = submissions;
    }
}

export class JudgementsHandler extends CCSContestBaseHandler {
    @param('contestId', Types.String)
    async get(domainId: string, contestId: string) {
        const { tdoc, records } = await this.getContestData(domainId, new ObjectId(contestId));
        const judgements = records.filter((rdoc) => rdoc.judgeAt !== null).map((rdoc) => {
            return CCSAdapter.toJudgement(tdoc, rdoc);
        });
        this.response.body = judgements;
    }
}
