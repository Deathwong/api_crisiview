import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize('incident_db', 'root', 'root', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});