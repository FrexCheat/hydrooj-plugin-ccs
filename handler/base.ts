import { ContestModel, ForbiddenError, Handler, NotFoundError, ObjectId, param, ProblemModel, RecordModel, Types, UserModel } from 'hydrooj';
import { CCSAdapter } from '../lib/adapter';
import { EventFeedManager } from '../lib/event-mgr';

export class CCSContestBaseHandler extends Handler {
    async getContestData(domainId: string, contestId: ObjectId) {
        const tdoc = await ContestModel.get(domainId, contestId);
        const tudocs = await ContestModel.getMultiStatus(tdoc.domainId, { docId: tdoc._id }).toArray();
        const [pdict, udict] = await Promise.all([
            ProblemModel.getList(tdoc.domainId, tdoc.pids, true, false, ProblemModel.PROJECTION_LIST, true),
            UserModel.getList(tdoc.domainId, tudocs.map((i) => i.uid)),
        ]);
        const records = await RecordModel.getMulti(tdoc.domainId, { contest: tdoc._id }).toArray();

        return { tdoc, pdict, tudocs, udict, records };
    }

    checkAuth() {
        const authHeader = this.request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Basic ')) return false;
        const base64Credentials = authHeader.substring(6);
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');
        if (username !== this.ctx.setting.get('ccs.username') || password !== this.ctx.setting.get('ccs.password')) {
            return false;
        }
        return true;
    }

    @param('contestId', Types.String)
    async prepare(domainId: string, contestId: string) {
        const eventManager = new EventFeedManager(this.ctx);
        const tdoc = await ContestModel.get(domainId, new ObjectId(contestId));
        if (!tdoc) throw new NotFoundError('Contest not found.');
        if (!this.checkAuth()) throw new ForbiddenError('Unauthorized');
        if (!(await eventManager.isContestInitialized(tdoc))) {
            throw new ForbiddenError('Contest not initialized by ccs.');
        }
    }
}

export class CCSInfoHandler extends Handler {
    async get() {
        this.response.body = {
            version: '2023-06',
            version_url: 'https://ccs-specs.icpc.io/2023-06/contest_api',
            name: 'HydroOJ CCS API',
            provider: {
                name: 'HydroOJ CCS Plugin',
                version: '1.0.0',
            },
        };
        this.response.type = 'application/json';
    }
}

export class ContestsHandler extends Handler {
    async get({ domainId }: { domainId: string }) {
        const ccsContests = await this.ctx.db.collection('ccs.contest').find({ domainId }, { projection: { tid: 1 } }).toArray();
        const tdocs = await ContestModel.getMulti(domainId, { _id: { $in: ccsContests.map((c) => c.tid) } }).toArray();
        const contests = tdocs.map((tdoc) => ({
            ...CCSAdapter.toContest(tdoc),
        }));
        this.response.body = contests;
        this.response.type = 'application/json';
    }
}
