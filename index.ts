import { Context, SettingModel } from 'hydrooj';
import * as handler from './handler';
import { EventFeedManager } from './lib/event-mgr';
import { CCSEventContest, CCSEventDoc } from './lib/types';

declare module 'hydrooj' {
    interface Collections {
        'ccs.contest': CCSEventContest;
        'ccs.event': CCSEventDoc;
    }
}

export default async function apply(ctx: Context) {
    const eventManager = new EventFeedManager(ctx);
    ctx.Route('ccs_operation', '/ccs/api/contests/:contestId/operation/:operation', handler.CCSOperationHandler);
    ctx.Route('ccs_api_info', '/ccs/api', handler.ApiInfoHandler);
    ctx.Route('ccs_contests', '/ccs/api/contests', handler.ContestsHandler);
    ctx.Route('ccs_contest', '/ccs/api/contests/:contestId', handler.ContestsHandler);
    ctx.Route('ccs_contest_state', '/ccs/api/contests/:contestId/state', handler.ContestStateHandler);
    ctx.Route('ccs_contest_languages', '/ccs/api/contests/:contestId/languages', handler.LanguagesHandler);
    ctx.Route('ccs_contest_language', '/ccs/api/contests/:contestId/languages/:id', handler.LanguagesHandler);
    ctx.Route('ccs_contest_problems', '/ccs/api/contests/:contestId/problems', handler.ProblemsHandler);
    ctx.Route('ccs_contest_problem', '/ccs/api/contests/:contestId/problems/:id', handler.ProblemsHandler);
    ctx.Route('ccs_contest_teams', '/ccs/api/contests/:contestId/teams', handler.TeamsHandler);
    ctx.Route('ccs_contest_team', '/ccs/api/contests/:contestId/teams/:id', handler.TeamsHandler);
    ctx.Route('ccs_contest_organizations', '/ccs/api/contests/:contestId/organizations', handler.OrganizationsHandler);
    ctx.Route('ccs_contest_organization', '/ccs/api/contests/:contestId/organizations/:id', handler.OrganizationsHandler);
    ctx.Route('ccs_contest_groups', '/ccs/api/contests/:contestId/groups', handler.GroupsHandler);
    ctx.Route('ccs_contest_group', '/ccs/api/contests/:contestId/groups/:id', handler.GroupsHandler);
    ctx.Route('ccs_contest_judgement_types', '/ccs/api/contests/:contestId/judgement-types', handler.JudgementTypesHandler);
    ctx.Route('ccs_contest_judgement_type', '/ccs/api/contests/:contestId/judgement-types/:id', handler.JudgementTypesHandler);
    ctx.Route('ccs_contest_submissions', '/ccs/api/contests/:contestId/submissions', handler.SubmissionsHandler);
    ctx.Route('ccs_contest_submission', '/ccs/api/contests/:contestId/submissions/:id', handler.SubmissionsHandler);
    ctx.Route('ccs_contest_judgements', '/ccs/api/contests/:contestId/judgements', handler.JudgementsHandler);
    ctx.Route('ccs_contest_judgement', '/ccs/api/contests/:contestId/judgements/:id', handler.JudgementsHandler);
    ctx.Route('ccs_contest_runs', '/ccs/api/contests/:contestId/runs', handler.RunsHandler);
    ctx.Route('ccs_contest_run', '/ccs/api/contests/:contestId/runs/:id', handler.RunsHandler);
    ctx.Route('ccs_contest_event_feed', '/ccs/api/contests/:contestId/event-feed', handler.EventFeedHandler);
    ctx.on('record/change', async (rdoc, $set, $push) => { await eventManager.handleRecordChange(rdoc, $set, $push); });
    ctx.inject(['setting'], (c) => {
        c.setting.SystemSetting(
            SettingModel.Setting('setting_ccs_account', 'ccs.username', 'ccs_hydro', 'text', 'ccs.username', 'CCS UserName'),
            SettingModel.Setting('setting_ccs_account', 'ccs.password', 'defaultKey@ccs', 'text', 'ccs.password', 'CCS Password'),
        );
    });
    ctx.i18n.load('zh', {
        setting_ccs_account: 'CCS 账号设置',
        'CCS UserName': 'CCS 用户名',
        'CCS Password': 'CCS 密码',
    });
    ctx.i18n.load('zh-TW', {
        setting_ccs_account: 'CCS 帳號設定',
        'CCS UserName': 'CCS 使用者名稱',
        'CCS Password': 'CCS 密碼',
    });
    ctx.i18n.load('en', {
        setting_ccs_account: 'CCS Account Settings',
        'CCS UserName': 'CCS UserName',
        'CCS Password': 'CCS Password',
    });
}
