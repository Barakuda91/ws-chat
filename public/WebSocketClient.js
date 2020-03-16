class WebSocketClient {
    constructor(conf) {
        this.reconnectTimeout = conf.reconnectTimeout || 5 * 1000;
        this.reconnectAttempts = conf.reconnectAttempts || 5;
        this.messagesWaite = {};
    }

    open(url) {
        return new Promise((cb) => {
            this.url = url;
            this.instance = new WebSocket(this.url);

            this.instance.onmessage = (msg) => {
                const response = JSON.parse(msg.data);
                const waitObject = this.messagesWaite[response.id];
                console.info('WebSocketClient: get message ', response);
                waitObject
                    ? response.error
                        ? waitObject.fail && waitObject.fail(response.error, response.data)
                        : waitObject.success && waitObject.success(response.data)
                    : console.error(`WebSocketClient: can\`t find functions by id ${response.id}`);
            };

            this.instance.onclose = (e) => {
                switch (e.code) {
                    case 1000: console.warn("WebSocket: closed"); break;
                    default: console.warn("WebSocket: closed by server"); this.reconnect(e); break;
                }
            };

            this.instance.onerror = (e) => {
                switch (e.code) {
                    case 'ECONNREFUSED': this.reconnect(e); break;
                    default: this.onerror(e); break;
                }
            };

            this.instance.onopen = () => {
                console.info('WebSocketClient: open');
                cb();
            };
        });
    }

    send(object) {
        const {type, data, done, success, fail} = object;
        try{
            const id = `${type}-${Date.now()}`;
            this.instance.send(JSON.stringify({type, data, id}));
            this.messagesWaite[id] = {type, data, success, fail};
            done && done(data, id);
        }catch (e){
            this.instance.emit('error',e);
        }
    }

    reconnect(e) {
        console.info(`WebSocketClient: retry in ${this.reconnectTimeout}ms`, e);
        const that = this;
        setTimeout(function(){
            console.info('WebSocketClient: reconnecting...');
            that.open(that.url);
        }, this.reconnectTimeout);
    }

    onerror(e) {
        console.error('WebSocketClient: error', arguments);
    }
}
