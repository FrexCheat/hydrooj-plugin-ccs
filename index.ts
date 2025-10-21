import { Context, ForbiddenError, PERM, SettingModel } from 'hydrooj';
import { CCSInfoHandler, ContestsHandler } from './handler/base';
import { ContestAccessHandler, ContestHandler, ContestStateHandler } from './handler/contests';
import { LanguagesHandler, ProblemsHandler } from './handler/data';
import { EventFeedHandler } from './handler/event-feed';
import { GroupsHandler, OrganizationsHandler, TeamsHandler } from './handler/participants';
import { JudgementsHandler, JudgementTypesHandler, SubmissionsHandler } from './handler/submissions';
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
    ctx.Route('CCSApiInfo', '/ccs/api', CCSInfoHandler);
    ctx.Route('CCSContests', '/ccs/api/contests', ContestsHandler);
    ctx.Route('CCSContest', '/ccs/api/contests/:contestId', ContestHandler);
    ctx.Route('CCSContestState', '/ccs/api/contests/:contestId/state', ContestStateHandler);
    ctx.Route('CCSContestAccess', '/ccs/api/contests/:contestId/access', ContestAccessHandler);
    ctx.Route('CCSContestLanguages', '/ccs/api/contests/:contestId/languages', LanguagesHandler);
    ctx.Route('CCSContestProblems', '/ccs/api/contests/:contestId/problems', ProblemsHandler);
    ctx.Route('CCSContestTeams', '/ccs/api/contests/:contestId/teams', TeamsHandler);
    ctx.Route('CCSContestOrganizations', '/ccs/api/contests/:contestId/organizations', OrganizationsHandler);
    ctx.Route('CCSContestGroups', '/ccs/api/contests/:contestId/groups', GroupsHandler);
    ctx.Route('CCSContestJudgementTypes', '/ccs/api/contests/:contestId/judgement-types', JudgementTypesHandler);
    ctx.Route('CCSContestSubmissions', '/ccs/api/contests/:contestId/submissions', SubmissionsHandler);
    ctx.Route('CCSContestJudgements', '/ccs/api/contests/:contestId/judgements', JudgementsHandler);
    ctx.Route('CCSContestEventFeed', '/ccs/api/contests/:contestId/event-feed', EventFeedHandler);
    ctx.on('record/change', async (rdoc) => {
        await eventManager.handleSubmission(rdoc);
        // console.log('<<<<==============================================');
        // console.log('Record changed:');
        // console.log(rdoc);
        // console.log('==============================================>>>>');
    });
    ctx.on('record/judge', async (rdoc) => {
        await eventManager.handleJudgement(rdoc);
        // console.log('<<<<==============================================');
        // console.log('Record judged:');
        // console.log(rdoc);
        // console.log('==============================================>>>>');
    });
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
    ctx.inject(['scoreboard'], ({ scoreboard }) => {
        scoreboard.addView('ccs-initialize', '(CCS) Init Contest', { tdoc: 'tdoc' }, {
            async display({ tdoc }) {
                this.checkPerm(PERM.PERM_CREATE_CONTEST);
                if (await eventManager.isContestInitialized(tdoc)) {
                    throw new ForbiddenError('CCS Contest already initialized.');
                }
                await eventManager.initializeContest(tdoc);
                this.response.redirect = this.url('contest_detail', { tid: tdoc._id });
            },
            supportedRules: ['acm'],
        });
        scoreboard.addView('ccs-reset', '(CCS) Reset Contest', { tdoc: 'tdoc' }, {
            async display({ tdoc }) {
                this.checkPerm(PERM.PERM_CREATE_CONTEST);
                if (!(await eventManager.isContestInitialized(tdoc))) {
                    throw new ForbiddenError('CCS Contest not initialized.');
                }
                await eventManager.resetContest(tdoc);
                this.response.redirect = this.url('contest_detail', { tid: tdoc._id });
            },
            supportedRules: ['acm'],
        });
        scoreboard.addView('ccs-finalize', '(CCS) Finalize Contest', { tdoc: 'tdoc' }, {
            async display({ tdoc }) {
                this.checkPerm(PERM.PERM_CREATE_CONTEST);
                if (!(await eventManager.isContestInitialized(tdoc))) {
                    throw new ForbiddenError('CCS Contest not initialized.');
                }
                if (!(await eventManager.isContestEnded(tdoc))) {
                    throw new ForbiddenError('CCS Contest not ended.');
                }
                if (await eventManager.isContestFinalized(tdoc)) {
                    throw new ForbiddenError('CCS Contest already finalized.');
                }
                await eventManager.setContestFinalized(tdoc);
                this.response.redirect = this.url('contest_detail', { tid: tdoc._id });
            },
            supportedRules: ['acm'],
        });
    });
}
