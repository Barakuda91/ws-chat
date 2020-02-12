const { Op } = require('sequelize');
const errorHandler = new (require(`${ROOT_DIR}/Classes/ErrorHandler`))({name: 'ReqHandler'});

module.exports = class ReqHandler {
    constructor(struct) {
        Object.assign(this, struct);
    }

    async openConversations (msg, ws) {
        return {
            type: 'openConversations',
            data: await this.getConversations({type: msg.type, data: {...msg.data, dialogsFrom: 0}}, ws)
        };
    }

    async loadConversations (msg, ws) {
        return {
            type: 'loadConversations',
            data: await this.getConversations(msg, ws)
        };
    }

    async openConverstion (msg, ws) {
        const messages = await this.orm.messages.findAll({
            where: {dialog_id: msg.data.dialogId},
            include: [this.orm.users],
            limit: msg.data.messagesCount || 20,
            offset: msg.data.messageFrom || 0
        }).catch(errorHandler.sendError);

        return messages.error ? messages : {
            type: 'openConverstion',
            data: messages.map((message) => new Object({
                id: message.dataValues.id,
                avatar: this.getAvatarUrl(message.user.dataValues.username),
                author: message.user.dataValues.username,
                message: message.dataValues.updated_text,
                timestamp: message.dataValues.createdAt,
                isRead: message.dataValues.is_read,
                isModify: message.dataValues.text !== message.dataValues.updated_text
            }))
        }
    }

    async sendMessage (msg, ws) {
        const dialog = await this.orm.dialogs
            .findOne({where: {id: msg.data.dialogId}})
            .catch(errorHandler.sendError);
        let message;
        if (dialog.dataValues.recipient_id === ws.user.id || dialog.dataValues.sender_id === ws.user.id) {
            message = await this.orm.messages.insert({
                user_id: ws.user.id,
                dialog_id: msg.data.dialogId,
                text: msg.data.message,
                updated_text: msg.data.message
            }).catch(errorHandler.sendError);

            const partnerId = dialog.dataValues.sender_id === ws.user.id
                ? dialog.dataValues.recipient_id
                : dialog.dataValues.sender_id;

            if (!dialog.error && !message.error && online[partnerId]) {
                for(const recipient of online[partnerId]) {
                    recipient.send({type: 'newMessage', data: {
                            dialogId: message.dataValues.dialog_id,
                            id: message.dataValues.id,
                            interlocutorAvatar: this.getAvatarUrl(ws.user.username),
                            interlocutorId: ws.user.id,
                            interlocutor: ws.user.username,
                            timestamp: message.dataValues.createdAt,
                            message: message.dataValues.text
                        }});
                }
                msg.data = {tempId: msg.data.tempId, id: message.dataValues.id};
            } else msg.data.error = dialog.error || message.error;
        } else msg.data.error = 'You are not in this dialog';

        return msg;
    }

    async editMessage (msg, ws) {
        const responce = await this.orm.messages.update(
            {updated_text: msg.data.newMessage},
            {where: {id: msg.data.id, user_id: ws.user.id, dialog_id: msg.data.dialogId}}
        ).catch(errorHandler.sendError);

        return responce.error ? responce : msg;
    }

    async readConverstion (msg, ws) {
        const responce = await this.orm.messages.update(
            {is_read: true},
            {
                where: {
                    user_id: { [Op.not]: ws.user.id },
                    dialog_id: msg.data.dialogId
                }
            }
        ).catch(errorHandler.sendError);

        return responce.error ? responce : msg;
    }

    async addConverstion (msg, ws) {
        const user = await this.orm.users
            .findOne({where: {id: msg.data.interlocutorId}})
            .catch(errorHandler.sendError);
        if (user) {
            const dialog = await this.orm.dialogs.insert({
                sender_id: ws.user.id,
                recipient_id: msg.data.interlocutorId
            }).catch(errorHandler.sendError);

            msg.data = dialog.error ? Object.assign(msg.data, dialog) : {dialogId: dialog.dataValues.id};
        } else msg.data.error = 'You cannot create a dialog with a non-existent user';
        return msg;
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

        return res.error ? res : res[0].map((dialog) => {
            const recAvatar = this.getAvatarUrl(dialog.recipient_login);
            return {
                dialogId: dialog.dialog_id,
                interlocutorAvatar: recAvatar,
                interlocutor: dialog.recipient_login,
                lastMess: dialog.updated_text,
                lastMessAvatar: dialog.user_id === ws.user.id ? this.getAvatarUrl(dialog.sender_login) : recAvatar,
                lastMessTimestamp: dialog.createdAt,
                isRead: !!dialog.is_read,
                isOnline: !!online['recipient_id']
            };
        });
    }

    getAvatarUrl (login) {
        return login ? `/img/${login.slice(0, 1).toLowerCase()}/${login}` : login;
    }
};
