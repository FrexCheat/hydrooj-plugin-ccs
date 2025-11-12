import { ContestModel, ObjectId, param, RecordModel, Types } from 'hydrooj';
import { BaseHandler } from './base';

export class JudgementsHandler extends BaseHandler {
    @param('contestId', Types.ObjectId)
    @param('id', Types.String, true)
    async get(domainId: string, contestId: ObjectId, id: string) {
        const tdoc = await ContestModel.get(domainId, contestId);
        const records = await RecordModel.getMulti(tdoc.domainId, { contest: tdoc._id }).sort({ _id: 1 }).toArray();
        if (id) {
            const rdoc = records.find((r) => r._id.toString() === id.split('-').pop());
            if (!rdoc || rdoc.judgeAt === null) {
                this.response.status = 404;
                this.response.body = { message: 'Judgement not found' };
                return;
            }
            const judgement = this.adapter.toJudgement(tdoc, rdoc);
            this.response.body = judgement;
        } else {
            const judgements = records.filter((rdoc) => rdoc.judgeAt !== null).map((rdoc) => {
                return this.adapter.toJudgement(tdoc, rdoc);
            });
            this.response.body = judgements;
        }
    }
}
