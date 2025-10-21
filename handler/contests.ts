import { ContestModel, ObjectId, param, Types } from 'hydrooj';
import { CCSAdapter } from '../lib/adapter';
import { CCSContestBaseHandler } from './base';

export class ContestAccessHandler extends CCSContestBaseHandler {
    @param('contestId', Types.String)
    async get() {
        this.response.type = 'application/json';
        this.response.body = {
            capabilities: [],
            endpoints: [
                /* eslint-disable max-len */
                { type: 'contest', properties: ['id', 'name', 'formal_name', 'start_time', 'duration', 'scoreboard_type', 'scoreboard_freeze_duration', 'penalty_time'] },
                { type: 'state', properties: ['started', 'frozen', 'ended', 'thawed', 'finalized', 'end_of_updates'] },
                { type: 'languages', properties: ['id', 'name'] },
                { type: 'problems', properties: ['id', 'label', 'name', 'ordinal', 'rgb', 'color', 'time_limit', 'test_data_count'] },
                { type: 'groups', properties: ['id', 'name'] },
                { type: 'organizations', properties: ['id', 'name', 'formal_name'] },
                { type: 'teams', properties: ['id', 'name', 'label', 'display_name', 'organization_id', 'group_ids'] },
                { type: 'judgement-types', properties: ['id', 'name', 'penalty', 'solved'] },
                { type: 'submissions', properties: ['id', 'language_id', 'problem_id', 'team_id', 'time', 'contest_time'] },
                { type: 'judgements', properties: ['id', 'submission_id', 'judgement_type_id', 'start_time', 'start_contest_time', 'end_time', 'end_contest_time'] },
                { type: 'event-feed', properties: [] },
                /* eslint-enable max-len */
            ],
        };
    }
}

export class ContestHandler extends CCSContestBaseHandler {
    @param('contestId', Types.String)
    async get(domainId: string, contestId: string) {
        const tdoc = await ContestModel.get(domainId, new ObjectId(contestId));
        const contest = CCSAdapter.toContest(tdoc);
        this.response.body = contest;
    }
}

export class ContestStateHandler extends CCSContestBaseHandler {
    @param('contestId', Types.String)
    async get(domainId: string, contestId: string) {
        const tdoc = await ContestModel.get(domainId, new ObjectId(contestId));
        this.response.body = CCSAdapter.toState(tdoc);
    }
}
