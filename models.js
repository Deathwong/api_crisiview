import { DataTypes } from 'sequelize';
import { sequelize } from './db.js';

// Technicien
export const Technicien = sequelize.define('technicien', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: DataTypes.STRING,
    firstname: DataTypes.STRING,
    email: DataTypes.STRING,
    phone: DataTypes.STRING,
});

// Incident
export const Incident = sequelize.define('incident', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: DataTypes.STRING,
    latitude: DataTypes.FLOAT,
    longitude: DataTypes.FLOAT
});

// Intervention
export const Intervention = sequelize.define('intervention', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }
});

// Relations
Intervention.belongsTo(Technicien, { foreignKey: 'id_technicien' });
Intervention.belongsTo(Incident, { foreignKey: 'id_incident' });