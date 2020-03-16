const Common = require(`${ROOT_DIR}/Classes/Common`);
const { Op } = require('sequelize');
const sequelize = require('sequelize');
const errorHandler = new (require(`${ROOT_DIR}/Classes/ErrorHandler`))({name: 'ReqHandler'});

module.exports = class ReqHandler extends Common {
    async openConversations (msg, ws) {
        return await this.getConversations(Object.assign(msg, {data: {...msg.data, dialogsFrom: 0}}), ws);
    }

    async loadConversations (msg, ws) {
        return await this.getConversations(msg, ws);
    }

    async openConverstion (msg, ws) {
        const messages = await this.orm.messages.findAll({
            where: {dialog_id: msg.data.dialogId},
            include: [this.orm.users],
            limit: msg.data.messagesCount || 20,
            offset: msg.data.messageFrom || 0
        }).catch(errorHandler.sendError);

        const response = {type: msg.type, id: msg.id};

        messages.error
            ? Object.assign(response, {data: msg.data, error: ERRORS[1001]})
            : Object.assign(response, {data: messages.map(ReqHandler.formatMessage)});

        return response;
    }

    async sendMessage (msg, ws) {
        msg.data.message = msg.data.message.slice(0, this.conf.get('messageLength'));

        let message;
        let dialog;
        let response = msg;

        msg.data.message.length < this.conf.get('minMessageLength')  && Object
            .assign(response, {error: ERRORS[1010]});

        !response.error && (dialog = await this.orm.dialogs
            .findOne({where: {id: msg.data.dialogId}})
            .catch(errorHandler.sendError));

        !response.error && (response = ReqHandler.checkDialog(dialog, response));

        const isDialogMy = !response.error
            ? [dialog.dataValues.recipient_id, dialog.dataValues.sender_id].includes(ws.user.id)
            : false;

        isDialogMy && (message = await this.orm.messages.insert({
            user_id: ws.user.id,
            dialog_id: msg.data.dialogId,
            text: msg.data.message,
            updated_text: msg.data.message
        }).catch(errorHandler.sendError));

        !response.error && (response = isDialogMy
            ? ReqHandler.checkMessage(message, dialog, response, ws)
            : Object.assign(response, {error: ERRORS[1003]}));

        return response;
    }

    async editMessage (msg, ws) {
        msg.data.newMessage = msg.data.newMessage.slice(0, this.conf.get('messageLength'));
        let response = msg;
        let update;

        msg.data.newMessage.length < this.conf.get('minMessageLength')  && Object
            .assign(response, {error: ERRORS[1010]});
        const where = {id: msg.data.id, user_id: ws.user.id, dialog_id: msg.data.dialogId};

        response.error || (update = await this.orm.messages.update({updated_text: msg.data.newMessage}, {where})
            .catch(errorHandler.sendError));
        response.error || update.error && Object.assign(response, {error: ERRORS[1001]});
        response.error || update[0] || Object.assign(response, {error: ERRORS[1004]});

        // send message to the partner
        response.error || online[partnerId] && ReqHandler.updateInTab(message, partnerId, ws);

        // send message to the own tabs
        response.error || online[ws.user.id] && ReqHandler.updateInTab(message, ws.user.id, ws);

        return response;
    }

    async readConverstion (msg, ws) {
        const response = msg;
        const where = {user_id: { [Op.not]: ws.user.id }, dialog_id: msg.data.dialogId};
        const update = await this.orm.messages.update({is_read: true}, {where})
            .catch(errorHandler.sendError);

        update.error && Object.assign(response, {error: ERRORS[1001]});
        !update[0] && Object.assign(response, {error: ERRORS[1005]});

        return response;
    }

    async addConverstion (msg, ws) {
        let response = msg;
        let user;
        let dialog;
        let sameDialog;
        msg.data.interlocutorId === ws.user.id && Object.assign(response, {error: ERRORS[1006]});
        !response.error && (user = await this.orm.users
            .findOne({where: {id: msg.data.interlocutorId}})
            .catch(errorHandler.sendError));

        !response.error && user === null && Object.assign(response, {error: ERRORS[1008]});
        !response.error && user && user.error && Object.assign(response, {error: ERRORS[1001]});

        !response.error && (sameDialog = await this.orm.dialogs
            .findOne({where: sequelize.or(
                        {sender_id: ws.user.id, recipient_id: msg.data.interlocutorId},
                        {sender_id: msg.data.interlocutorId, recipient_id: ws.user.id}
                )})
            .catch(errorHandler.sendError));
        !response.error && sameDialog !== null && Object.assign(response, {error: ERRORS[1009]});
        !response.error && sameDialog && sameDialog.error && Object.assign(response, {error: ERRORS[1001]});

        !response.error && (dialog = await this.orm.dialogs
            .insert({sender_id: ws.user.id, recipient_id: msg.data.interlocutorId})
            .catch(errorHandler.sendError));
        !response.error && dialog.error && Object.assign(response, {error: ERRORS[1001]});
        !response.error && Object.assign(response, {data: dialog});

        return response;
    }

    async deleteConverstion (msg, ws) {
        
    }

    async noType(msg, ws) {
        return {type: msg.type, error: {code: 405, text: 'Method Not Allowed'}}
    }

    async getConversations (msg, ws) {
        const sql = 'SELECT messages.*, u1.username AS sender_login, u2.username AS recipient_login FROM messages \n' +
            'LEFT JOIN dialogs ON messages.dialog_id = dialogs.id \n' +
            'LEFT JOIN users AS u1 ON u1.id = sender_id \n' +
            'LEFT JOIN users AS u2 ON u2.id = recipient_id \n' +
            'WHERE messages.id IN (SELECT MAX(id) FROM messages \n' +
            `GROUP BY dialog_id) AND (sender_id = ${ws.user.id} OR recipient_id = ${ws.user.id}) \n` +
            `ORDER BY messages.id DESC LIMIT ${msg.data.dialogsFrom}, ${msg.data ? msg.data.dialogsCount : 20};`;

        const res = await this.orm.sequelize.query(sql).catch(errorHandler.sendError);
        const conversations = !res.error && res[0].map((dialog) => ReqHandler.formatDialog(dialog, ws));
        const response = {type: msg.type, id: msg.id};

        res.error
            ? Object.assign(response, {data: msg.data, error: ERRORS[1001]})
            : Object.assign(response, {data: conversations});

        return response;
    }

    static checkMessage (message, dialog, response, ws) {
        const partnerId = dialog.dataValues.sender_id === ws.user.id
            ? dialog.dataValues.recipient_id
            : dialog.dataValues.sender_id;

        message.error && Object.assign(response, {error: ERRORS[1001]});
        !response.error && Object.assign(response.data, {id: message.dataValues.id});

        // send message to the partner
        online[partnerId] && ReqHandler.sendToTab(message, partnerId, ws);

        // send message to the own tabs
        online[ws.user.id] && ReqHandler.sendToTab(message, partnerId, ws);

        return response;
    }

    static updateInTab (message, userTo) {
        for(const user of online[userTo]) {
            user.send({
                type: 'updateMessage',
                data: {
                    id: message.dataValues.id,
                    timestamp: message.dataValues.createdAt,
                    message: message.dataValues.text
                }
            });
        }
    }

    static sendToTab (message, partnerId, ws) {
        for(const recipient of online[partnerId]) {
            recipient.send({
                type: 'newMessage',
                data: {
                    dialogId: message.dataValues.dialog_id,
                    id: message.dataValues.id,
                    interlocutorAvatar: ReqHandler.getAvatarUrl(ws.user.username),
                    interlocutorId: ws.user.id,
                    interlocutor: ws.user.username,
                    timestamp: message.dataValues.createdAt,
                    message: message.dataValues.text
                }
            });
        }
    }

    static checkDialog (dialog, response) {
        !response.error && dialog === null && Object
            .assign(response, {error: ERRORS[1002]});

        !response.error && dialog.error && Object
            .assign(response, {error: ERRORS[1001]});

        return response;
    }

    static formatMessage (message) {
        return {
            id: message.dataValues.id,
            avatar: ReqHandler.getAvatarUrl(message.user.dataValues.username),
            author: message.user.dataValues.username,
            message: message.dataValues.updated_text,
            timestamp: message.dataValues.createdAt,
            isRead: message.dataValues.is_read,
            isModify: message.dataValues.text !== message.dataValues.updated_text
        };
    }

    static formatDialog (dialog, ws) {
        const recAvatar = ReqHandler.getAvatarUrl(dialog.recipient_login);
        return {
            dialogId: dialog.dialog_id,
            interlocutorAvatar: recAvatar,
            interlocutor: dialog.recipient_login,
            lastMess: dialog.updated_text,
            lastMessAvatar: dialog.user_id === ws.user.id ? ReqHandler.getAvatarUrl(dialog.sender_login) : recAvatar,
            lastMessTimestamp: dialog.createdAt,
            isRead: !!dialog.is_read,
            isOnline: !!online['recipient_id']
        };
    }

    static getAvatarUrl (login) {
        return login ? `/img/${login.slice(0, 1).toLowerCase()}/${login}` : login;
    }
};
