const fs = require('fs-extra');
const { Sequelize } = require('sequelize');

module.exports = class Orm {
    constructor(struct) {
        Object.assign(this, struct);
        const ormConf = this.conf.get('orm');
        this.sequelize = new Sequelize(ormConf.database, ormConf.username, ormConf.password, ormConf.options);
    }

    async init() {
        const models = await fs.readdir(`${ROOT_DIR}/${this.conf.get('orm:models')}`);
        for(let model of models) {
            model = model.replace('.js', '');
            const modelPath = `${ROOT_DIR}/${this.conf.get('orm:models')}/${model}.js`;
            const object = require(modelPath);
            this[model] = this.sequelize.define(model, object.model, object.options);
            this[model].insert = function(data) { return data.length ? Orm.insertMany(data, this) : (new this(data)).save(); };
            await this[model].sync();
        }

        this.users.hasMany(this.messages, {foreignKey: 'user_id'});
        this.messages.belongsTo(this.users, {foreignKey: 'user_id'});
        this.dialogs.hasMany(this.messages, {foreignKey: 'dialog_id'});
        this.messages.belongsTo(this.dialogs, {foreignKey: 'dialog_id'});

    }

    static insertMany (data, orm) {
        for (const row of data) {
            (new orm(row)).save();
        }
    }
};
