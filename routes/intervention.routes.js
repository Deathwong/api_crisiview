import express from 'express';
import { Intervention, Technicien, Incident } from '../models.js';

const router = express.Router();

router.post('/', async (req, res) => {
    res.json(await Intervention.create(req.body));
});

router.get('/', async (req, res) => {
    const data = await Intervention.findAll({
        include: [Technicien, Incident]
    });
    res.json(data);
});

router.get('/:id', async (req, res) => {
    const data = await Intervention.findByPk(req.params.id, {
        include: [Technicien, Incident]
    });
    res.json(data);
});

router.put('/:id', async (req, res) => {
    await Intervention.update(req.body, { where: { id: req.params.id } });
    res.json({ message: 'Intervention updated' });
});

router.delete('/:id', async (req, res) => {
    await Intervention.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Intervention deleted' });
});

export default router;