import { PassThrough } from 'stream';
import { ContestModel, ObjectId, param, Types } from 'hydrooj';
import { BaseHandler } from './base';

export class EventFeedHandler extends BaseHandler {
    @param('contestId', Types.String)
    @param('since_token', Types.String, true)
    @param('stream', Types.Boolean, true)
    async get(domainId: string, contestId: string, sinceToken: string, stream = true) {
        const tdoc = await ContestModel.get(domainId, new ObjectId(contestId));
        const sinceId = sinceToken ? new ObjectId(sinceToken) : null;
        let lastEventId: ObjectId | null = null;
        const streamPipe = new PassThrough();
        const events = await this.eventManager.getEvents(tdoc._id, sinceId);
        this.response.type = 'application/x-ndjson';
        this.response.addHeader('X-Accel-Buffering', 'no');
        this.response.addHeader('Connection', 'keep-alive');
        this.response.addHeader('Cache-Control', 'no-cache');
        this.response.body = streamPipe;
        for (const edoc of events) {
            this.eventManager.writeEventToStream(streamPipe, edoc);
            lastEventId = edoc._id;
        }
        if (stream) {
            const sendEventInterval = setInterval(async () => {
                this.eventManager.addMissingStateEvent(tdoc);
                const newEvents = await this.eventManager.getEvents(tdoc._id, lastEventId);
                for (const edoc of newEvents) {
                    this.eventManager.writeEventToStream(streamPipe, edoc);
                    lastEventId = edoc._id;
                }
            }, 1000);

            const keepAliveInterval = setInterval(() => {
                streamPipe.write('\n');
            }, 10000);

            streamPipe.on('close', () => {
                clearInterval(sendEventInterval);
                clearInterval(keepAliveInterval);
                console.log('CCS Event Feed: client disconnected.');
                streamPipe.end();
            });
        } else {
            streamPipe.end();
        }
    }
}
