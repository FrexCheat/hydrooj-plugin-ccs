import crypto from 'crypto';
import { ContestModel, ObjectId, param, Types, UserModel } from 'hydrooj';
import { CCSOrganization } from '../lib/types';
import { BaseHandler } from './base';

export class OrganizationsHandler extends BaseHandler {
    @param('contestId', Types.ObjectId)
    @param('id', Types.String, true)
    async get(domainId: string, contestId: ObjectId, id: string) {
        const tdoc = await ContestModel.get(domainId, contestId);
        const tudocs = await ContestModel.getMultiStatus(tdoc.domainId, { docId: tdoc._id }).toArray();
        const udict = await UserModel.getList(tdoc.domainId, tudocs.map((i) => i.uid));
        const orgMap: Record<string, CCSOrganization> = {};
        for (const i of tudocs) {
            const udoc = udict[i.uid];
            const orgId = crypto.createHash('md5').update(udoc.school || udoc.uname).digest('hex');
            orgMap[orgId] ||= this.adapter.toOrganization(orgId, udoc);
        }
        if (id) {
            const org = orgMap[id];
            if (!org) {
                this.response.status = 404;
                this.response.body = { message: 'Organization not found' };
                return;
            }
            this.response.body = org;
        } else {
            this.response.body = Object.values(orgMap);
        }
    }
}
