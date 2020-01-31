const { DataTypes } = require('sequelize');

module.exports = {
    model: {
        id: { // id сообщения
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id:  { // id отправителя
            type: DataTypes.INTEGER,
            allowNull: false
        },
        dialog_id:  { // id диалога
            type: DataTypes.INTEGER,
            allowNull: false
        },
        text: { // текст сообщения
            type: DataTypes.TEXT,
            allowNull: false
        },
        updated_text: { // актуальный текст сообщения
            type: DataTypes.TEXT,
            allowNull: false
        },
        is_read: { // прочитано ли сообщение получателем
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    },
    options: {
        tableName: 'messages',
        timestamps: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci'
    }
};
