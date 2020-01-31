const {DataTypes } = require('sequelize');

module.exports = {
    model: {
        id: { // id диалога
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        sender_id: { // id создателя
            type: DataTypes.INTEGER,
            allowNull: false
        },
        recipient_id: { // id собеседника
            type: DataTypes.INTEGER,
            allowNull: false
        },
        // inc: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false
        // },
        // out: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false
        // },
        // status_inc: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false
        // },
        // status_out: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false
        // }
    },
    options: {
        tableName: 'dialogs',
        timestamps: true,
        uniqueKeys: {
            users: {
                fields: ['sender_id', 'recipient_id']
            }
        }
    }
};
