"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const innerEvs = [
    'close', 'error', 'message', 'open', 'ping', 'pong', 'unexpected-response', 'upgrade',
    'disconnect', '@connection', '@disconnect'
];
class Socket2 {
    ws;
    id;
    options = {
        ping: true,
        pingInterval: 10 * 1000, // 5 minutes
        pingTimeout: 10 * 1000, // 1 minute
        debug: false
    };
    open = false;
    cbid = 0;
    callbacks = {};
    listeners = [];
    wildcners = [];
    constructor(ws, options) {
        this.ws = ws;
        this.id = (0, uuid_1.v4)();
        if (options) {
            var keys = Object.keys(this.options);
            Object.keys(options).forEach(key => {
                if (keys.includes(key))
                    this.options[key] = options[key];
            });
            if (options.open)
                this.setOpen();
        }
        innerEvs.forEach(type => {
            this.ws.on(type, data => {
                this.trigger({ channel: type, data });
            });
        });
        ws.on('open', () => {
            this.setOpen();
        });
        ws.on('message', async (message) => {
            const { channel, cbid, data } = this.parseMessage(message);
            if (channel == 'callback')
                return this.parseCallback(cbid, data);
            if (channel == 'internal')
                return this.parseInternal(cbid, data);
            this.trigger({ channel, cbid, data });
        });
        ws.on('close', () => {
            this.destroy();
        });
        ws.on('error', () => {
            this.destroy();
        });
    }
    setOpen() {
        this.open = true;
        this.schedulePing();
    }
    parseMessage(message) {
        const dsmessage = message.toString();
        try {
            return JSON.parse(dsmessage);
        }
        catch (e) {
            return { message: dsmessage };
        }
    }
    async waitopen() {
        while (!this.open)
            await new Promise(resolve => setTimeout(resolve, 100));
    }
    async parseInternal(cbid, data) {
        const { evtype } = data;
        if (evtype == 'ping')
            return this.emitback(cbid, { status: true });
        this.emitback(cbid, { status: false, error: 'evtype not recognized' });
    }
    parseCallback(cbid, data) {
        const callback = this.detachCallback(cbid);
        if (callback)
            callback(data);
    }
    detachCallback(cbid) {
        const callback = this.callbacks[cbid];
        delete this.callbacks[cbid];
        return callback;
    }
    async trigger({ channel, cbid, data }) {
        // triggering all listeners based on the channel
        for (let listener of this.listeners) {
            if (listener.channel === channel) {
                listener.action(data, payback => {
                    if (cbid !== undefined)
                        this.emitback(cbid, payback);
                });
            }
        }
        // if it's an inner evtype, do NOT trigger wildcards
        if (innerEvs.includes(channel))
            return;
        // triggering all wildcard listeners
        for (let wildc of this.wildcners) {
            wildc(channel, data, payback => {
                if (cbid !== undefined)
                    this.emitback(cbid, payback);
            });
        }
    }
    on(channel, action) {
        this.listeners.push({ channel, action });
    }
    wildcard(wilddata) {
        this.wildcners.push(wilddata);
    }
    async emit(channel, data, callback) {
        await this.waitopen();
        let payload = { channel, data };
        if (callback) {
            const cbid = this.cbid++;
            payload.cbid = cbid;
            this.callbacks[cbid] = callback;
            setTimeout(ev => { this.detachCallback(cbid); }, 30 * 1000);
        }
        const message = JSON.stringify(payload);
        this.ws.send(message);
    }
    tmPing;
    tmPingWait;
    tmPingSkip;
    schedulePing() {
        this.stopPinging();
        if (this.options.ping) {
            this.tmPingWait = setTimeout(() => {
                this.log('Ping timeout. Disconnecting...');
                this.stopPinging();
                this.ws.close();
            }, this.options.pingInterval + this.options.pingTimeout);
            this.tmPing = setTimeout(() => {
                this.ping(latency => {
                    this.schedulePing();
                });
            }, this.options.pingInterval);
        }
        else {
            this.tmPingSkip = setTimeout(() => {
                this.schedulePing();
            }, this.options.pingInterval);
        }
    }
    stopPinging() {
        clearTimeout(this.tmPing);
        clearTimeout(this.tmPingWait);
        clearTimeout(this.tmPingSkip);
    }
    logLacenty = [];
    sumLatency = 0;
    latency = -1;
    registerLatency(latency) {
        while (this.logLacenty.length > 100) {
            const last = this.logLacenty.shift();
            if (last)
                this.sumLatency -= last;
        }
        this.logLacenty.push(latency);
        this.sumLatency += latency;
        this.latency = this.sumLatency / this.logLacenty.length;
    }
    ping(callback) {
        const dt1 = new Date().getTime();
        this.emit('internal', { evtype: 'ping' }, feed => {
            const latency = new Date().getTime() - dt1;
            this.registerLatency(latency);
            this.trigger({ channel: 'latency', data: latency });
            if (callback)
                callback(latency);
        });
    }
    deny(reason) {
        this.emit('global', { evtype: 'denied', reason });
        this.stopPinging();
        const delay = 10;
        setTimeout(ev => this.ws.close(), delay * 1000);
    }
    retry(delay) {
        if (!delay)
            delay = (5 + 10 * Math.random());
        setTimeout(ev => this.ws.close(), delay * 1000);
    }
    emitback(cbid, data) {
        const message = JSON.stringify({ channel: 'callback', cbid, data });
        this.ws.send(message);
    }
    destroy() {
        this.open = false;
        this.stopPinging();
        this.trigger({ channel: 'disconnect' });
        this.callbacks = [];
        this.listeners = [];
        this.wildcners = [];
        this.logLacenty = [];
        this.ws.terminate();
    }
    log(...args) {
        if (!this.options.debug)
            return;
        console.log(...args);
    }
}
exports.default = Socket2;
