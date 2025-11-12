import { PassThrough } from 'stream';
import { ContestModel, ObjectId, param, Types } from 'hydrooj';
import { BaseHandler, ConnectionBaseHandler } from './base';

export class EventFeedHandler extends ConnectionBaseHandler {
    @param('contestId', Types.ObjectId)
    @param('since_token', Types.ObjectId, true)
    @param('stream', Types.Boolean, true)
    async prepare(domainId: string, contestId: ObjectId, since_token: ObjectId, stream = true) {
        const tdoc = await ContestModel.get(domainId, contestId);
        let lastEventId: ObjectId | null = null;
        const events = await this.eventManager.getEvents(tdoc._id, since_token);
        for (const edoc of events) {
            this.send(this.eventManager.getEventAsText(edoc));
            lastEventId = edoc._id;
        }
        if (!stream) {
            // add a timeout to make sure all previous data was sent
            this.ctx.setTimeout(() => this.close(1000, 'ended'), 1000);
            return;
        }
        this.ctx.setInterval(async () => {
            this.eventManager.addMissingStateEvent(tdoc);
            const newEvents = await this.eventManager.getEvents(tdoc._id, lastEventId);
            for (const edoc of newEvents) {
                this.send(this.eventManager.getEventAsText(edoc));
                lastEventId = edoc._id;
            }
        }, 1000);
        this.ctx.setInterval(() => {
            this.send('');
        }, 10000);
    }

    async cleanup() {
        console.log('CCS Event Feed: client disconnected.');
    }
}

export class EventFeedNormalHandler extends BaseHandler {
    @param('contestId', Types.ObjectId)
    @param('since_token', Types.ObjectId, true)
    @param('stream', Types.Boolean, true)
    async get(domainId: string, contestId: ObjectId, since_token: ObjectId, stream = true) {
        const streamPipe = new PassThrough();
        let lastEventId: ObjectId | null = null;
        const tdoc = await ContestModel.get(domainId, contestId);
        const events = await this.eventManager.getEvents(tdoc._id, since_token);
        this.response.type = 'application/x-ndjson';
        this.response.addHeader('Connection', 'keep-alive');
        this.response.addHeader('Cache-Control', 'no-cache');
        this.response.body = streamPipe;
        for (const edoc of events) {
            streamPipe.write(this.eventManager.getEventAsText(edoc) + '\n');
            lastEventId = edoc._id;
        }
        if (!stream) {
            // add a timeout to make sure all previous data was sent
            this.ctx.setTimeout(() => streamPipe.end(), 1000);
            return;
        }
        this.ctx.setInterval(async () => {
            this.eventManager.addMissingStateEvent(tdoc);
            const newEvents = await this.eventManager.getEvents(tdoc._id, lastEventId);
            for (const edoc of newEvents) {
                streamPipe.write(this.eventManager.getEventAsText(edoc) + '\n');
                lastEventId = edoc._id;
            }
        }, 1000);
        this.ctx.setInterval(() => {
            streamPipe.write('\n');
        }, 10000);
        streamPipe.on('close', () => {
            console.log('CCS Event Feed: client disconnected.');
        });
    }
}
