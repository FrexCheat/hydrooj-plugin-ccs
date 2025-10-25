import { ContestModel, ObjectId, param, RecordModel, Types } from 'hydrooj';
import { BaseHandler } from './base';

export class RunsHandler extends BaseHandler {
    @param('contestId', Types.String)
    @param('id', Types.String, true)
    async get(domainId: string, contestId: string, id: string) {
        const tdoc = await ContestModel.get(domainId, new ObjectId(contestId));
        const records = await RecordModel.getMulti(tdoc.domainId, { contest: tdoc._id }).sort({ _id: 1 }).toArray();
        if (id) {
            const rdoc = records.find((r) => r._id.toString() === id.split('-')[1]);
            const testCaseId = +(id.split('-')[2]);
            const testCase = rdoc?.testCases.find((tc) => tc.id === testCaseId);
            if (!testCase || !rdoc) {
                this.response.status = 404;
                this.response.body = { message: 'Run not found' };
                return;
            }
            const run = this.adapter.toRun(tdoc, rdoc, testCase);
            this.response.body = run;
        } else {
            const runs = [];
            for (const rdoc of records) {
                for (const testCase of rdoc.testCases) {
                    runs.push(this.adapter.toRun(tdoc, rdoc, testCase));
                }
            }
            this.response.body = runs;
        }
    }
}
