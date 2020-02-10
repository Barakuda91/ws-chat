module.exports = class ErrorHandler {
    constructor(struct) {
        this.name = struct.name;
        ['sendError', 'throwError'].forEach((method) => {
            this[method] = this[method].bind(this);
        });
    }

    sendError(err) {
        const e = err.stack ? err.stack : err.message;
        console.error(e);
        return {error: e};
    }

    throwError(ex) {
        console.error(ex);
        throw new Error(ex);
    }
};
