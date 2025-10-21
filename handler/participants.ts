import { ObjectId, param, Types } from 'hydrooj';
import { CCSAdapter } from '../lib/adapter';
import { CCSOrganization } from '../lib/types';
import { CCSContestBaseHandler } from './base';

export class TeamsHandler extends CCSContestBaseHandler {
    @param('contestId', Types.String)
    async get(domainId: string, contestId: string) {
        const { tudocs, udict } = await this.getContestData(domainId, new ObjectId(contestId));
        const teams = tudocs.map((i) => {
            const udoc = udict[i.uid];
            return CCSAdapter.toTeam(udoc, i.unrank);
        });
        this.response.body = teams;
    }
}

export class OrganizationsHandler extends CCSContestBaseHandler {
    @param('contestId', Types.String)
    async get(domainId: string, contestId: string) {
        const { tudocs, udict } = await this.getContestData(domainId, new ObjectId(contestId));
        const orgMap: Record<string, CCSOrganization> = {};
        for (const i of tudocs) {
            const udoc = udict[i.uid];
            const orgId = btoa(udoc.school || udoc.uname).replace(/=/g, '');
            orgMap[orgId] ||= CCSAdapter.toOrganization(orgId, udoc);
        }
        this.response.body = Object.values(orgMap);
    }
}

export class GroupsHandler extends CCSContestBaseHandler {
    async get() {
        this.response.type = 'application/json';
        this.response.body = [
            { id: 'participants', name: '正式队伍' },
            { id: 'observers', name: '打星队伍' },
        ];
    }
}
