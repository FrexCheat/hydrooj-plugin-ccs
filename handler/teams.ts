import { ContestModel, ObjectId, param, Types, UserModel } from 'hydrooj';
import { BaseHandler } from './base';

export class TeamsHandler extends BaseHandler {
    @param('contestId', Types.String)
    @param('id', Types.String, true)
    async get(domainId: string, contestId: string, id: string) {
        const tdoc = await ContestModel.get(domainId, new ObjectId(contestId));
        const tudocs = await ContestModel.getMultiStatus(tdoc.domainId, { docId: tdoc._id }).toArray();
        const udict = await UserModel.getList(tdoc.domainId, tudocs.map((i) => i.uid));
        if (id) {
            const realId = +(id.split('-').pop());
            const tudoc = tudocs.find((i) => i.uid === realId);
            if (!tudoc) {
                this.response.status = 404;
                this.response.body = { message: 'Team not found' };
                return;
            }
            const udoc = udict[tudoc.uid];
            const team = this.adapter.toTeam(udoc, tudoc.unrank);
            this.response.body = team;
        } else {
            const teams = tudocs.map((i) => {
                const udoc = udict[i.uid];
                return this.adapter.toTeam(udoc, i.unrank);
            });
            this.response.body = teams;
        }
    }
}
