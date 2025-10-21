import { PassThrough } from 'stream';
import { ContestModel, ObjectId, param, Types } from 'hydrooj';
import { CCSAdapter } from '../lib/adapter';
import { EventFeedManager } from '../lib/event-mgr';
import { CCSEventDoc, EventType } from '../lib/types';
import { CCSContestBaseHandler } from './base';

function writeEventToStream(passthrough: PassThrough, event: CCSEventDoc) {
    const result = {
        type: event.type as EventType,
        id: event.data.id ? `${event.data.id}` : null,
        data: event.data,
        token: `${event._id.toHexString()}`,
    };
    passthrough.write(`${JSON.stringify(result)}\n`);
}

export class EventFeedHandler extends CCSContestBaseHandler {
    @param('contestId', Types.String)
    @param('since_token', Types.String, true)
    @param('stream', Types.String, true)
    async get(domainId: string, contestId: string, sinceToken: string, stream = 'true') {
        const tdoc = await ContestModel.get(domainId, new ObjectId(contestId));
        const eventManager = new EventFeedManager(this.ctx);
        const isStream = stream === 'true';
        const sinceId = sinceToken ? new ObjectId(sinceToken) : null;
        let lastEventId: ObjectId | null = null;
        const streamPipe = new PassThrough();
        const events = await eventManager.getEvents(tdoc._id, sinceId);
        this.response.type = 'application/x-ndjson';
        this.response.addHeader('X-Accel-Buffering', 'no');
        this.response.addHeader('Connection', 'keep-alive');
        this.response.addHeader('Cache-Control', 'no-cache');
        this.response.body = streamPipe;
        for (const edoc of events) {
            writeEventToStream(streamPipe, edoc);
            lastEventId = edoc._id;
        }
        if (isStream) {
            const sendEventInterval = setInterval(async () => {
                if (ContestModel.isDone(tdoc)) {
                    if (!(await eventManager.isContestEnded(tdoc))) {
                        await eventManager.addEvent(tdoc._id, 'state', CCSAdapter.toState(tdoc));
                        await eventManager.setContestEnded(tdoc);
                    }
                    if ((tdoc.unlocked) && !(await eventManager.isContestThawed(tdoc))) {
                        const isContestFinalized = await eventManager.isContestFinalized(tdoc);
                        await eventManager.addEvent(tdoc._id, 'state', CCSAdapter.toState(tdoc, isContestFinalized));
                        await eventManager.setContestThawed(tdoc);
                    }
                }
                const newEvents = await eventManager.getEvents(tdoc._id, lastEventId);
                for (const edoc of newEvents) {
                    writeEventToStream(streamPipe, edoc);
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
