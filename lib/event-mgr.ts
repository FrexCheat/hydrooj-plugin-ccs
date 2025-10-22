/* eslint-disable max-len */
import crypto from 'crypto';
import { ContestModel, Context, ForbiddenError, ObjectId, ProblemModel, RecordDoc, RecordModel, STATUS, STATUS_SHORT_TEXTS, STATUS_TEXTS, Tdoc, UserModel } from 'hydrooj';
import { CCSAdapter } from './adapter';
import { CCSEventDoc, EventType } from './types';
/* eslint-enable max-len */

export class EventFeedManager {
    private ctx: Context;

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    async initializeContest(tdoc: Tdoc) {
        const coll = this.ctx.db.collection('ccs.contest');
        if (await this.isContestInitialized(tdoc)) throw new ForbiddenError('CCS Contest already initialized.');
        const hasProblems = tdoc.pids && tdoc.pids.length > 0;
        if (!hasProblems) throw new ForbiddenError('Contest has no problems.');
        const hasParticipants = await ContestModel.countStatus(tdoc.domainId, { docId: tdoc._id }) > 0;
        if (!hasParticipants) throw new ForbiddenError('Contest has no participants.');
        await coll.insertOne({
            _id: new ObjectId(),
            domainId: tdoc.domainId,
            tid: tdoc._id,
            ended: ContestModel.isDone(tdoc),
            thawed: ContestModel.isDone(tdoc) ? tdoc.unlocked : false,
            finalized: false,
        });
        await this.initializeEvent(tdoc);
    }

    async resetContest(tdoc: Tdoc) {
        const coll = this.ctx.db.collection('ccs.contest');
        await coll.deleteOne({ domainId: tdoc.domainId, tid: tdoc._id });
        const collEvent = this.ctx.db.collection('ccs.event');
        await collEvent.deleteMany({ tid: tdoc._id });
    }

    async isContestInitialized(tdoc: Tdoc) {
        const coll = this.ctx.db.collection('ccs.contest');
        const existed = await coll.findOne({ domainId: tdoc.domainId, tid: tdoc._id });
        if (!existed) return false;
        return true;
    }

    async isContestEnded(tdoc: Tdoc) {
        const coll = this.ctx.db.collection('ccs.contest');
        const existed = await coll.findOne({ domainId: tdoc.domainId, tid: tdoc._id });
        return existed.ended;
    }

    async setContestEnded(tdoc: Tdoc) {
        const coll = this.ctx.db.collection('ccs.contest');
        await coll.updateOne({ domainId: tdoc.domainId, tid: tdoc._id }, { $set: { ended: true } });
    }

    async isContestThawed(tdoc: Tdoc) {
        const coll = this.ctx.db.collection('ccs.contest');
        const existed = await coll.findOne({ domainId: tdoc.domainId, tid: tdoc._id });
        return existed.thawed;
    }

    async setContestThawed(tdoc: Tdoc) {
        const coll = this.ctx.db.collection('ccs.contest');
        await coll.updateOne({ domainId: tdoc.domainId, tid: tdoc._id }, { $set: { thawed: true } });
    }

    async isContestFinalized(tdoc: Tdoc) {
        const coll = this.ctx.db.collection('ccs.contest');
        const existed = await coll.findOne({ domainId: tdoc.domainId, tid: tdoc._id });
        return existed.finalized;
    }

    async setContestFinalized(tdoc: Tdoc) {
        const coll = this.ctx.db.collection('ccs.contest');
        await coll.updateOne({ domainId: tdoc.domainId, tid: tdoc._id }, { $set: { finalized: true } });
        await this.addEvent(tdoc._id, 'state', CCSAdapter.toState(tdoc, true));
    }

    async addEvent(tid: ObjectId, type: EventType, data: any) {
        const coll = this.ctx.db.collection('ccs.event');
        const edoc: CCSEventDoc = { _id: new ObjectId(), tid, type, data };
        await coll.insertOne(edoc);
        return edoc;
    }

    async getEvents(tid: ObjectId, sinceId: ObjectId | null = null): Promise<CCSEventDoc[]> {
        const collEvent = this.ctx.db.collection('ccs.event');
        const query: any = sinceId ? { _id: { $gt: sinceId }, tid } : { tid };
        return collEvent.find(query).sort({ _id: 1 }).toArray();
    }

    async handleSubmission(rdoc: RecordDoc) {
        if (!rdoc.contest || rdoc.contest.toHexString() === '000000000000000000000000') return;
        const tdoc = await ContestModel.get(rdoc.domainId, rdoc.contest);
        if (!tdoc) return;
        if (!(await this.isContestInitialized(tdoc)) || (await this.isContestFinalized(tdoc))) return;
        const collEvent = this.ctx.db.collection('ccs.event');
        const submissionId = rdoc._id.toHexString();
        const existed = await collEvent.findOne({ tid: tdoc._id, type: 'submissions', 'data.id': submissionId });
        if (existed) return;
        await this.addEvent(tdoc._id, 'submissions', CCSAdapter.toSubmission(tdoc, rdoc));
    }

    async handleJudgement(rdoc: RecordDoc) {
        if (!rdoc.contest || rdoc.contest.toHexString() === '000000000000000000000000') return;
        const tdoc = await ContestModel.get(rdoc.domainId, rdoc.contest);
        if (!tdoc) return;
        if (!(await this.isContestInitialized(tdoc)) || (await this.isContestFinalized(tdoc))) return;
        if (rdoc.judgeAt !== null) {
            await this.addEvent(tdoc._id, 'judgements', CCSAdapter.toJudgement(tdoc, rdoc));
        }
    }

    async initializeEvent(tdoc: Tdoc) {
        // contest
        await this.addEvent(tdoc._id, 'contest', CCSAdapter.toContest(tdoc));

        // state
        await this.addEvent(tdoc._id, 'state', CCSAdapter.toState(tdoc));

        // languages
        await this.addEvent(tdoc._id, 'languages', { id: 'c', name: 'C' });
        await this.addEvent(tdoc._id, 'languages', { id: 'cpp', name: 'C++' });
        await this.addEvent(tdoc._id, 'languages', { id: 'cc', name: 'C++' });
        await this.addEvent(tdoc._id, 'languages', { id: 'java', name: 'Java' });
        await this.addEvent(tdoc._id, 'languages', { id: 'python', name: 'Python' });
        await this.addEvent(tdoc._id, 'languages', { id: 'py', name: 'Python' });
        await this.addEvent(tdoc._id, 'languages', { id: 'kotlin', name: 'Kotlin' });
        await this.addEvent(tdoc._id, 'languages', { id: 'kt', name: 'Kotlin' });
        await this.addEvent(tdoc._id, 'languages', { id: 'rust', name: 'Rust' });
        await this.addEvent(tdoc._id, 'languages', { id: 'go', name: 'Go' });

        // problems
        const pdict = await ProblemModel.getList(tdoc.domainId, tdoc.pids, true, false, ProblemModel.PROJECTION_LIST, true);
        const problems = tdoc.pids.map((pid, index) => (CCSAdapter.toProblem(tdoc, pdict, index, pid)));
        await Promise.all(problems.map((p) => this.addEvent(tdoc._id, 'problems', p)));

        // groups
        await this.addEvent(tdoc._id, 'groups', { id: 'participants', name: '正式队伍' });
        await this.addEvent(tdoc._id, 'groups', { id: 'observers', name: '打星队伍' });

        // organizations
        const tudocs = await ContestModel.getMultiStatus(tdoc.domainId, { docId: tdoc._id }).toArray();
        const udict = await UserModel.getList(tdoc.domainId, tudocs.map((i) => i.uid));
        const orgMap: Record<string, { id: string, name: string, formal_name: string }> = {};
        for (const i of tudocs) {
            const udoc = udict[i.uid];
            const orgId = crypto.createHash('md5').update(udoc.school || udoc.uname).digest('hex');
            orgMap[orgId] ||= CCSAdapter.toOrganization(orgId, udoc);
        }
        await Promise.all(Object.values(orgMap).map((org) => this.addEvent(tdoc._id, 'organizations', org)));

        // teams
        const teams = tudocs.map((i) => {
            const udoc = udict[i.uid];
            return CCSAdapter.toTeam(udoc, i.unrank);
        });
        await Promise.all(teams.map((team) => this.addEvent(tdoc._id, 'teams', team)));

        // judgement-types
        await Promise.all(Object.keys(STATUS_SHORT_TEXTS).map((i) => this.addEvent(tdoc._id, 'judgement-types', {
            id: STATUS_SHORT_TEXTS[i],
            name: STATUS_TEXTS[i],
            penalty: ![STATUS.STATUS_ACCEPTED, STATUS.STATUS_COMPILE_ERROR, STATUS.STATUS_SYSTEM_ERROR].includes(+i),
            solved: +i === STATUS.STATUS_ACCEPTED,
        })));

        // submissions & judgements
        const records = await RecordModel.getMulti(tdoc.domainId, { contest: tdoc._id }).sort({ _id: 1 }).toArray();
        await Promise.all(records.map((rdoc) => this.handleSubmission(rdoc)));
        await Promise.all(records.map((rdoc) => this.handleJudgement(rdoc)));
    }
}
