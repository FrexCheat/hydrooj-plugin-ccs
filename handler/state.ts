import { ContestModel, ObjectId, param, Types } from 'hydrooj';
import { BaseHandler } from './base';

export class ContestStateHandler extends BaseHandler {
    @param('contestId', Types.String)
    async get(domainId: string, contestId: string) {
        const tdoc = await ContestModel.get(domainId, new ObjectId(contestId));
        this.response.body = this.adapter.toState(tdoc);
    }
}
