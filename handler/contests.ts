import { ContestModel, ObjectId, param, Types } from 'hydrooj';
import { BaseHandler } from './base';

export class ContestsHandler extends BaseHandler {
    @param('contestId', Types.String, true)
    async get(domainId: string, contestId: string) {
        if (contestId) {
            const tdoc = await ContestModel.get(domainId, new ObjectId(contestId));
            const contest = this.adapter.toContest(tdoc);
            this.response.body = contest;
        } else {
            const docs = await this.eventManager.contestCollection.find({ domainId }, { projection: { tid: 1 } }).toArray();
            const tdocs = await ContestModel.getMulti(domainId, { _id: { $in: docs.map((c) => c.tid) } }).toArray();
            const contests = tdocs.map((tdoc) => ({
                ...this.adapter.toContest(tdoc),
            }));
            this.response.body = contests;
        }
    }
}
