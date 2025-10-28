/* eslint-disable max-len */
import crypto from 'crypto';
import { PassThrough } from 'stream';
import { Collection } from 'mongodb';
import { ContestModel, Context, ForbiddenError, ObjectId, ProblemModel, RecordDoc, RecordModel, STATUS, STATUS_SHORT_TEXTS, STATUS_TEXTS, Tdoc, UserModel } from 'hydrooj';
import { CCSAdapter } from './adapter';
import { CCSEventContest, CCSEventDoc, CCState, EventType } from './types';
/* eslint-enable max-len */

export class EventFeedManager {
    private adapter = new CCSAdapter();
    public eventCollection: Collection<CCSEventDoc>;
    public contestCollection: Collection<CCSEventContest>;

    constructor(ctx: Context) {
        this.eventCollection = ctx.db.collection('ccs.event');
        this.contestCollection = ctx.db.collection('ccs.contest');
    }

    async resetContest(tdoc: Tdoc) {
        await this.contestCollection.deleteOne({ domainId: tdoc.domainId, tid: tdoc._id });
        await this.eventCollection.deleteMany({ tid: tdoc._id });
    }

    async isContestInitialized(tdoc: Tdoc) {
        const existed = await this.contestCollection.findOne({ domainId: tdoc.domainId, tid: tdoc._id });
        if (!existed) return false;
        return true;
    }

    async addEvent(tid: ObjectId, type: EventType, data: any) {
        const edoc: CCSEventDoc = { _id: new ObjectId(), tid, type, data };
        await this.eventCollection.insertOne(edoc);
        return edoc;
    }

    async getEvents(tid: ObjectId, sinceId: ObjectId | null = null, type: EventType | null = null) {
        const query = { ...(sinceId ? { _id: { $gt: sinceId } } : {}), tid, ...(type ? { type } : {}) };
        return this.eventCollection.find(query).toArray();
    }

    public writeEventToStream(passthrough: PassThrough, event: CCSEventDoc) {
        const result = {
            type: event.type as EventType,
            id: event.data.id ? `${event.data.id}` : null,
            data: event.data,
            token: `${event._id.toHexString()}`,
        };
        passthrough.write(`${JSON.stringify(result)}\n`);
    }

    async addMissingStateEvent(tdoc: Tdoc) {
        const stateEvents = await this.getEvents(tdoc._id, null, 'state');
        const lastStateEvent = stateEvents.reverse()[0];
        const stateData: CCState | null = lastStateEvent ? lastStateEvent.data as CCState : null;
        if (!stateData) {
            await this.addEvent(tdoc._id, 'state', this.adapter.toState(tdoc));
        } else if (ContestModel.isOngoing(tdoc) && !stateData.started) {
            await this.addEvent(tdoc._id, 'state', this.adapter.toState(tdoc));
        } else if (ContestModel.isOngoing(tdoc) && ContestModel.isLocked(tdoc) && !stateData.frozen) {
            await this.addEvent(tdoc._id, 'state', this.adapter.toState(tdoc));
        } else if (ContestModel.isDone(tdoc) && !stateData.frozen) {
            await this.addEvent(tdoc._id, 'state', this.adapter.toState(tdoc));
        } else if (ContestModel.isDone(tdoc) && !stateData.ended) {
            await this.addEvent(tdoc._id, 'state', this.adapter.toState(tdoc));
        } else if (ContestModel.isDone(tdoc) && !ContestModel.isLocked(tdoc) && !stateData.thawed) {
            await this.addEvent(tdoc._id, 'state', this.adapter.toState(tdoc));
        }
    }

    async handleRecordChange(rdoc: RecordDoc, $set: any, $push: any) {
        if (!rdoc.contest || rdoc.contest.toHexString() === '000000000000000000000000') return;
        const tdoc = await ContestModel.get(rdoc.domainId, rdoc.contest);
        if (!tdoc) return;
        if (!(await this.isContestInitialized(tdoc))) return;
        if (rdoc.status === 0) {
            await this.addEvent(tdoc._id, 'submissions', this.adapter.toSubmission(tdoc, rdoc));
            await this.addEvent(tdoc._id, 'judgements', this.adapter.toJudgement(tdoc, rdoc));
        } else if (rdoc.judgeAt) {
            await this.addEvent(tdoc._id, 'judgements', this.adapter.toJudgement(tdoc, rdoc));
        } else if ($push.testCases) {
            await this.addEvent(tdoc._id, 'runs', this.adapter.toRun(tdoc, rdoc, $push.testCases));
        }
    }

    async initializeEvent(tdoc: Tdoc) {
        // contest
        await this.addEvent(tdoc._id, 'contest', this.adapter.toContest(tdoc));

        // state
        await this.addEvent(tdoc._id, 'state', this.adapter.toState(tdoc));

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

        /* eslint-disable no-await-in-loop */
        // problems
        const pdict = await ProblemModel.getList(tdoc.domainId, tdoc.pids, true, false, ProblemModel.PROJECTION_CONTEST_DETAIL, true);
        for (const [index, pid] of tdoc.pids.entries()) {
            const problem = await this.adapter.toProblem(tdoc, pdict, index, pid);
            await this.addEvent(tdoc._id, 'problems', problem);
        }
        /* eslint-enable no-await-in-loop */

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
            orgMap[orgId] ||= this.adapter.toOrganization(orgId, udoc);
        }
        await Promise.all(Object.values(orgMap).map((org) => this.addEvent(tdoc._id, 'organizations', org)));

        // teams
        const teams = tudocs.map((i) => {
            const udoc = udict[i.uid];
            return this.adapter.toTeam(udoc, i.unrank);
        });
        await Promise.all(teams.map((team) => this.addEvent(tdoc._id, 'teams', team)));

        // judgement-types
        await Promise.all(Object.keys(STATUS_SHORT_TEXTS).map((i) => this.addEvent(tdoc._id, 'judgement-types', {
            id: STATUS_SHORT_TEXTS[i],
            name: STATUS_TEXTS[i],
            penalty: ![STATUS.STATUS_ACCEPTED, STATUS.STATUS_COMPILE_ERROR, STATUS.STATUS_SYSTEM_ERROR].includes(+i),
            solved: +i === STATUS.STATUS_ACCEPTED,
        })));

        /* eslint-disable no-await-in-loop */
        // submissions & judgements
        const records = await RecordModel.getMulti(tdoc.domainId, { contest: tdoc._id }).sort({ _id: 1 }).toArray();
        for (const rdoc of records) {
            await this.addEvent(tdoc._id, 'submissions', this.adapter.toSubmission(tdoc, rdoc));
            await this.addEvent(tdoc._id, 'judgements', this.adapter.toJudgement(tdoc, rdoc));
            for (const testCase of rdoc.testCases) {
                await this.addEvent(tdoc._id, 'runs', this.adapter.toRun(tdoc, rdoc, testCase));
            }
        }
        /* eslint-enable no-await-in-loop */
    }

    async initializeContest(tdoc: Tdoc) {
        const isInitialized = await this.isContestInitialized(tdoc);
        const hasProblems = tdoc.pids && tdoc.pids.length > 0;
        const hasParticipants = await ContestModel.countStatus(tdoc.domainId, { docId: tdoc._id }) > 0;
        if (isInitialized) {
            throw new ForbiddenError('CCS Contest already initialized.');
        }
        if (!hasProblems) {
            throw new ForbiddenError('Contest has no problems.');
        }
        if (!hasParticipants) {
            throw new ForbiddenError('Contest has no participants.');
        }
        await this.contestCollection.insertOne({ _id: new ObjectId(), domainId: tdoc.domainId, tid: tdoc._id });
        await this.initializeEvent(tdoc);
    }
}
