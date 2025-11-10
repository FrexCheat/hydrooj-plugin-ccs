import {
    ConnectionHandler, ContestModel, Context, ForbiddenError, Handler,
    HandlerCommon, NotFoundError, ObjectId, param, Types,
} from 'hydrooj';
import { CCSAdapter } from '../lib/adapter';
import { EventFeedManager } from '../lib/event-mgr';

export class CCSOperationHandler extends Handler {
    public eventManager = new EventFeedManager(this.ctx);
    async prepare() {
        this.checkPriv(-1);
    }

    @param('contestId', Types.String)
    @param('operation', Types.String)
    async post(domainId: string, contestId: string, operation: string) {
        const tdoc = await ContestModel.get(domainId, new ObjectId(contestId));
        if (!tdoc) throw new NotFoundError('Contest not found');
        if (operation === 'init') {
            await this.eventManager.initializeContest(tdoc);
            this.response.status = 200;
            this.response.body = { message: '比赛数据初始化成功！' };
        } else if (operation === 'reset') {
            await this.eventManager.resetContest(tdoc);
            this.response.status = 200;
            this.response.body = { message: '比赛数据重置成功！' };
        }
    }
}

export class ApiInfoHandler extends Handler {
    async get() {
        this.response.body = {
            version: '2023-06',
            version_url: 'https://ccs-specs.icpc.io/2023-06/contest_api',
            name: 'HydroOJ CCS API',
            provider: {
                name: 'HydroOJ CCS Plugin',
                version: '1.0.4',
            },
        };
    }
}

function CCSMixin<TBase extends new (...args: any[]) => HandlerCommon<Context>>(Base: TBase) {
    return class CCSBase extends Base {
        public eventManager = new EventFeedManager(this.ctx);
        public adapter = new CCSAdapter();

        public checkAuth() {
            const authHeader = this.request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Basic ')) return false;
            const base64Credentials = authHeader.substring(6);
            const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
            const [username, password] = credentials.split(':');
            if (username !== this.ctx.setting.get('ccs.username') || password !== this.ctx.setting.get('ccs.password')) {
                return false;
            }
            return true;
        }

        async _prepare({ domainId, contestId }) {
            if (!this.checkAuth()) throw new ForbiddenError('Unauthorized');
            if (contestId) {
                const tdoc = await ContestModel.get(domainId, new ObjectId(contestId));
                if (!tdoc) throw new NotFoundError('Contest not found');
                if (!(await this.eventManager.isContestInitialized(tdoc))) {
                    throw new ForbiddenError('Contest not be initialized');
                }
            }
        }
    };
}

export const BaseHandler = CCSMixin(Handler);
export const ConnectionBaseHandler = CCSMixin(ConnectionHandler);
