// User model (in-memory)
let users = [
  { id: 1, name: 'Usuário', email: 'user@email.com', password: '123', role: 'user' }
];
let userIdCounter = { value: 2 };

module.exports = {
  users,
  userIdCounter
};
