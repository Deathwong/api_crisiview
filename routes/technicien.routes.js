import express from 'express';
import { Technicien } from '../models.js';

const router = express.Router();

// CREATE
router.post('/', async (req, res) => {
    const technicien = await Technicien.create(req.body);
    res.json(technicien);
});

// READ ALL
router.get('/', async (req, res) => {
    const techniciens = await Technicien.findAll();
    res.json(techniciens);
});

// READ ONE
router.get('/:id', async (req, res) => {
    const technicien = await Technicien.findByPk(req.params.id);
    res.json(technicien);
});

// UPDATE
router.put('/:id', async (req, res) => {
    await Technicien.update(req.body, { where: { id: req.params.id } });
    res.json({ message: 'Technicien updated' });
});

// DELETE
router.delete('/:id', async (req, res) => {
    await Technicien.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Technicien deleted' });
});

export default router;