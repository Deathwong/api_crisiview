import express from 'express';
import { Incident } from '../models.js';

const router = express.Router();

router.post('/', async (req, res) => {
    res.json(await Incident.create(req.body));
});

router.get('/', async (req, res) => {
    res.json(await Incident.findAll());
});

router.get('/:id', async (req, res) => {
    res.json(await Incident.findByPk(req.params.id));
});

router.put('/:id', async (req, res) => {
    await Incident.update(req.body, { where: { id: req.params.id } });
    res.json({ message: 'Incident updated' });
});

router.delete('/:id', async (req, res) => {
    await Incident.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Incident deleted' });
});

export default router;