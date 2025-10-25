import { ContestModel, ObjectId, param, RecordModel, Types } from 'hydrooj';
import { BaseHandler } from './base';

export class SubmissionsHandler extends BaseHandler {
    @param('contestId', Types.String)
    @param('id', Types.String, true)
    async get(domainId: string, contestId: string, id: string) {
        const tdoc = await ContestModel.get(domainId, new ObjectId(contestId));
        const records = await RecordModel.getMulti(tdoc.domainId, { contest: tdoc._id }).sort({ _id: 1 }).toArray();
        if (id) {
            const rdoc = records.find((r) => r._id.toString() === id);
            if (!rdoc) {
                this.response.status = 404;
                this.response.body = { message: 'Submission not found' };
                return;
            }
            const submission = this.adapter.toSubmission(tdoc, rdoc);
            this.response.body = submission;
        } else {
            const submissions = records.map((rdoc) => {
                return this.adapter.toSubmission(tdoc, rdoc);
            });
            this.response.body = submissions;
        }
    }
}
