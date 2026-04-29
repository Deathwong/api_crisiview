import request from 'supertest';
import { app } from '../server.js';
import { sequelize } from '../db.js';

describe('Technicien integration tests', () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('CRUD cycle for technicien works via API', async () => {
        const newTechnicien = {
            name: 'Dupont',
            firstname: 'Jean',
            email: 'jean.dupont@example.com',
            phone: '0123456789'
        };

        const createRes = await request(app)
            .post('/techniciens')
            .send(newTechnicien)
            .expect(200);

        expect(createRes.body).toMatchObject({
            name: newTechnicien.name,
            firstname: newTechnicien.firstname,
            email: newTechnicien.email,
            phone: newTechnicien.phone
        });
        expect(createRes.body.id).toBeGreaterThan(0);

        const technicienId = createRes.body.id;

        const getRes = await request(app)
            .get(`/techniciens/${technicienId}`)
            .expect(200);

        expect(getRes.body).toMatchObject({
            id: technicienId,
            ...newTechnicien
        });

        const updateRes = await request(app)
            .put(`/techniciens/${technicienId}`)
            .send({ phone: '0987654321' })
            .expect(200);

        expect(updateRes.body).toEqual({ message: 'Technicien updated' });

        const getUpdatedRes = await request(app)
            .get(`/techniciens/${technicienId}`)
            .expect(200);

        expect(getUpdatedRes.body.phone).toBe('0987654321');

        const deleteRes = await request(app)
            .delete(`/techniciens/${technicienId}`)
            .expect(200);

        expect(deleteRes.body).toEqual({ message: 'Technicien deleted' });

        const getDeletedRes = await request(app)
            .get(`/techniciens/${technicienId}`)
            .expect(200);

        expect(getDeletedRes.body).toBeNull();
    });
});