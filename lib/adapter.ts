import { ContestModel, parseTimeMS, ProblemConfig, RecordDoc, STATUS_SHORT_TEXTS, Tdoc, User } from 'hydrooj';
import { CCSContest, CCSJudgement, CCSOrganization, CCSProblem, CCState, CCSTeam, CCSubmission } from './types';
import { TimeUtils } from './utils';

export class CCSAdapter {
    static toContest(tdoc: Tdoc): CCSContest {
        return {
            id: tdoc.docId.toHexString(),
            name: tdoc.title,
            formal_name: tdoc.title,
            start_time: TimeUtils.formatTime(tdoc.beginAt),
            duration: TimeUtils.formatDuration(tdoc.endAt.getTime() - tdoc.beginAt.getTime()),
            scoreboard_type: 'pass-fail',
            scoreboard_freeze_duration: tdoc.lockAt
                ? TimeUtils.formatDuration(tdoc.endAt.getTime() - tdoc.lockAt.getTime())
                : null,
            penalty_time: 20,
        };
    }

    static toState(tdoc: Tdoc, finalized: boolean = false): CCState {
        const nowTime = new Date();
        const started = TimeUtils.formatTime(tdoc.beginAt);
        const ended = ContestModel.isDone(tdoc) ? TimeUtils.formatTime(tdoc.endAt) : null;
        const frozen = tdoc.lockAt ? TimeUtils.formatTime(tdoc.lockAt) : null;
        const thawed = (ContestModel.isDone(tdoc) && tdoc.unlocked) ? TimeUtils.formatTime(nowTime) : null;
        const finalizedTime = finalized ? TimeUtils.formatTime(nowTime) : null;
        const endOfUpdates = finalized ? TimeUtils.formatTime(new Date(nowTime.getTime() + 1000 * 60 * 5)) : null;
        return {
            started,
            frozen,
            ended,
            thawed,
            finalized: finalizedTime,
            end_of_updates: endOfUpdates,
        };
    }

    static toProblem(tdoc: Tdoc, pdict: any, index: number, pid: number): CCSProblem {
        return {
            id: `${pid}`,
            label: String.fromCharCode(65 + index),
            name: pdict[pid].title,
            ordinal: index,
            color: (typeof (tdoc.balloon?.[index]) === 'object' ? tdoc.balloon[index].name : tdoc.balloon?.[index]) || 'white',
            rgb: (typeof (tdoc.balloon?.[index]) === 'object' ? tdoc.balloon[index].color : null) || '#ffffff',
            time_limit: (parseTimeMS((pdict[pid].config as ProblemConfig).timeMax) / 1000).toFixed(1),
            test_data_count: 20,
        };
    }

    static toTeam(udoc: User, unrank: boolean): CCSTeam {
        return {
            id: `team-${udoc._id}`,
            label: `team-${udoc._id}`,
            name: udoc.displayName || udoc.uname,
            display_name: (unrank ? '⭐' : '') + (udoc.displayName || udoc.uname),
            organization_id: btoa(udoc.school || udoc.uname).replace(/=/g, ''),
            group_ids: [unrank ? 'observers' : 'participants'],
        };
    }

    static toOrganization(orgId: string, udoc: User): CCSOrganization {
        return {
            id: orgId,
            name: udoc.school || udoc.uname,
            formal_name: udoc.school || udoc.uname,
        };
    }

    static toSubmission(tdoc: Tdoc, rdoc: RecordDoc): CCSubmission {
        const submitTime = TimeUtils.formatTime(rdoc._id.getTimestamp());
        const contestTime = TimeUtils.getContestTime(tdoc, rdoc._id.getTimestamp());
        return {
            id: rdoc._id.toHexString(),
            language_id: rdoc.lang?.split('.')[0] || 'cpp',
            problem_id: `${rdoc.pid}`,
            team_id: `team-${rdoc.uid}`,
            time: submitTime,
            contest_time: contestTime,
        };
    }

    static toJudgement(tdoc: Tdoc, rdoc: RecordDoc): CCSJudgement {
        const spendTimeMs = rdoc.time;
        const judgedDate = rdoc.judgeAt;
        const judgedTime = TimeUtils.formatTime(judgedDate);
        const startDate = new Date(judgedDate.getTime() - spendTimeMs);
        const startTime = TimeUtils.formatTime(startDate);
        return {
            id: `j-${rdoc._id.toHexString()}`,
            submission_id: rdoc._id.toHexString(),
            judgement_type_id: STATUS_SHORT_TEXTS[rdoc.status as keyof typeof STATUS_SHORT_TEXTS],
            start_time: startTime,
            start_contest_time: TimeUtils.getContestTime(tdoc, startDate),
            end_time: judgedTime,
            end_contest_time: TimeUtils.getContestTime(tdoc, judgedDate),
        };
    }
}
