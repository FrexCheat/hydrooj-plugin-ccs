import { ContestModel, ObjectId, param, Types } from 'hydrooj';
import { BaseHandler } from './base';

export class ContestStateHandler extends BaseHandler {
    @param('contestId', Types.ObjectId)
    async get(domainId: string, contestId: ObjectId) {
        const tdoc = await ContestModel.get(domainId, contestId);
        this.response.body = this.adapter.toState(tdoc);
    }
}
