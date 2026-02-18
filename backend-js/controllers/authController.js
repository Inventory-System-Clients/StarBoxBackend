// Auth controller

const { users, userIdCounter } = require('../models/user');

exports.register = (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ detail: 'Registration failed' });
  }
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ detail: 'Email já cadastrado' });
  }
  const user = { id: userIdCounter.value++, name, email, password, role };
  users.push(user);
  return res.json({
    access_token: 'mock-token-' + user.id,
    user: { id: user.id, name, email, role }
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    return res.json({
      access_token: 'mock-token-' + user.id,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  }
  res.status(401).json({ detail: 'Login failed' });
};

exports.me = (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ detail: 'Not authenticated' });
  const token = auth.replace('Bearer ', '');
  const id = parseInt(token.replace('mock-token-', ''));
  const user = users.find(u => u.id === id);
  if (!user) return res.status(401).json({ detail: 'Not authenticated' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
};
