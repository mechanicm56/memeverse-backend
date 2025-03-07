const express = require('express');
const router = express.Router();
const TemplateModel = require('../models/template.model')

router.post('/api/create-template', async (req, res) => {
    const { title, price, askForPrice, desc, poster, body } = req.body;
    try {
        await TemplateModel.create({ title, price, askForPrice, desc, poster, body });
        res.json("Template created successfully!");
    } catch (error) {
        console.log(error)
        res.json("There has been an error while creating template!");
    }
})

module.exports = router