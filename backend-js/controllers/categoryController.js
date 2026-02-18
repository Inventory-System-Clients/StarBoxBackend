// Category controller
const { categories } = require('../models/category');

exports.getAll = (req, res) => {
  res.json(categories);
};

exports.create = (req, res) => {
  const { name } = req.body;
  const category = { id: categories.length + 1, name };
  categories.push(category);
  res.json(category);
};
