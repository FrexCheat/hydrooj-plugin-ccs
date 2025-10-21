import { ObjectId } from 'hydrooj';

export type EventType =
    | 'contest'
    | 'judgement-types'
    | 'languages'
    | 'problems'
    | 'groups'
    | 'organizations'
    | 'teams'
    | 'state'
    | 'submissions'
    | 'judgements';

export interface CCSEventDoc {
    _id: ObjectId;
    tid: ObjectId;
    type: EventType;
    data: any;
}

export interface CCSEventContest {
    domainId: string;
    tid: ObjectId;
    ended: boolean;
    thawed: boolean;
    finalized: boolean;
}

export interface CCSContest {
    id: string;
    name: string;
    formal_name: string;
    start_time: string;
    duration: string;
    scoreboard_type: string;
    scoreboard_freeze_duration: string;
    penalty_time: number;
}

export interface CCState {
    started: string | null;
    ended: string | null;
    frozen: string | null;
    thawed: string | null;
    finalized: string | null;
    end_of_updates: string | null;
}

export interface CCSLanguage {
    id: string;
    name: string;
}

export interface CCSProblem {
    id: string;
    label: string;
    name: string;
    ordinal: number;
    color: string;
    rgb: string;
    time_limit: string;
    test_data_count: number;
}

export interface CCSGroup {
    id: string;
    name: string;
}

export interface CCSOrganization {
    id: string;
    name: string;
    formal_name: string;
}

export interface CCSTeam {
    id: string;
    label: string;
    name: string;
    display_name: string;
    organization_id: string;
    group_ids: string[];
}

export interface CCSJudgementType {
    id: string;
    name: string;
    penalty: boolean;
    solved: boolean;
}

export interface CCSubmission {
    id: string;
    language_id: string;
    problem_id: string;
    team_id: string;
    time: string;
    contest_time: string;
}

export interface CCSJudgement {
    id: string;
    submission_id: string;
    judgement_type_id: string;
    start_time: string;
    start_contest_time: string;
    end_time: string;
    end_contest_time: string;
}
