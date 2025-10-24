import { ContestModel, ObjectId, param, ProblemModel, Types } from 'hydrooj';
import { BaseHandler } from './base';

export class ProblemsHandler extends BaseHandler {
    @param('contestId', Types.String)
    @param('id', Types.ProblemId, true)
    async get(domainId: string, contestId: string, id: number) {
        const tdoc = await ContestModel.get(domainId, new ObjectId(contestId));
        const pdict = await ProblemModel.getList(tdoc.domainId, tdoc.pids, true, false, ProblemModel.PROJECTION_CONTEST_DETAIL, true);
        if (id) {
            const pid = tdoc.pids[id];
            if (!pid || !pdict[pid]) {
                this.response.status = 404;
                this.response.body = { message: 'Problem not found' };
                return;
            }
            const problem = await this.adapter.toProblem(tdoc, pdict, id, pid);
            this.response.body = problem;
        } else {
            const problems = await Promise.all(tdoc.pids.map((pid, index) => (this.adapter.toProblem(tdoc, pdict, index, pid))));
            this.response.body = problems;
        }
    }
}
