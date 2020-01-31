online = {};
Object.assign(global, {ROOT_DIR: __dirname});
const conf = require('nconf');
const uuidv1 = require('uuid/v1');
const fs = require('fs');
const request = require('request');
const https = require('https');
const http = require('http');
const WebSocket = require('ws');

conf.file({ file: 'config/index.json' });
const server = conf.get('ssh:useSsh')
    ? https.createServer({cert: fs.readFileSync(conf.get('ssh:cert')), key: fs.readFileSync(conf.get('ssh:key'))})
    : http.createServer();
const orm = new (require('./Classes/Orm'))({conf});
const wss = new WebSocket.Server({ server });
const reqHandler = new (require('./Classes/ReqHandler'))({conf, orm});
(async () => {
    await orm.init();

    // orm.users.insert([{
    //     username: 'Sasha',
    //     password: 'llf9o83mcmmekl'
    // }, {
    //     username: 'Barakuda',
    //     password: 'fkmemk3msl821n'
    // }, {
    //     username: 'Nax',
    //     password: 'dfh47hdmmdl33k'
    // }]);

    // orm.dialogs.insert([{
    //     sender_id: 5,
    //     recipient_id: 1
    // }, {
    //     sender_id: 5,
    //     recipient_id: 2
    // }, {
    //     sender_id: 5,
    //     recipient_id: 3
    // }, {
    //     sender_id: 5,
    //     recipient_id: 4
    // }]);
    //
    // orm.messages.insert([{
    //     user_id: 3,
    //     dialog_id: 5,
    //     text: 'Первое смс в пятый диалог',
    //     updated_text: 'Первое смс в пятый диалог'
    // }, {
    //     user_id: 3,
    //     dialog_id: 5,
    //     text: 'ВТорое смс в пятый диалог',
    //     updated_text: 'ВТорое смс в пятый диалог'
    // }, {
    //     user_id: 1,
    //     dialog_id: 5,
    //     text: 'Третье смс в пятый диалог',
    //     updated_text: 'Третье смс в пятый диалог'
    // }, {
    //     user_id: 3,
    //     dialog_id: 5,
    //     text: 'Четвертое смс в пятый диалог',
    //     updated_text: 'Четвертое смс в пятый диалог'
    // }]);

    await wss.on('connection', async (ws, msg) => {
        console.log('new user connect');
        // const auth = JSON.parse(await request.get({
        //     url: conf.get('authPath'),
        //     headers: {
        //         Cookie: msg.headers.cookie,
        //         'User-Agent': msg.headers['user-agent']
        //     }
        // }));

        // if (auth.error) {
        //     ws.send(JSON.stringify({type: 'error', error: {code: 401, text: 'Unauthorized'}}));
        // } else {
        //     ws.user = JSON.parse(auth);
        //     ws.UUID = uuidv1();
        //     online[ws.user.id] = online[ws.user.id] || {};
        //     online[ws.user.id][ws.UUID] = ws;
        // }
//---
        ws.user = {
            id: 2,
            username: 'Barakuda'
        };
        ws.UUID = uuidv1();
        online[ws.user.id] = online[ws.user.id] || {};
        online[ws.user.id][ws.UUID] = ws;
//----

        ws.on('message', async (message) => {
            message = JSON.parse(message);
            ws.send(JSON.stringify(await reqHandler[message.type || 'noType'](message, ws)));
        });

        ws.on('close', () => {
            delete online[ws.user.id][ws.UUID];
            if(!Object.keys(online[ws.user.id]).length) delete online[ws.user.id];
            console.log('LOST CONNECT');
        });
    });

    await server.listen(conf.get('port'));
    console.log(`WS server listening ${conf.get('port')} port`);
})();
