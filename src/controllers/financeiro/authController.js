import FinanceiroUser from "../../models/FinanceiroUser.js";

export function register(req, res) {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ detail: "Registration failed" });
  }
  FinanceiroUser.findOne({ where: { email } })
    .then((existing) => {
      if (existing) {
        return res.status(400).json({ detail: "Email já cadastrado" });
      }
      return FinanceiroUser.create({ name, email, password, role });
    })
    .then((user) => {
      if (!user) return;
      return res.json({
        access_token: "mock-token-" + user.id,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    })
    .catch((err) => res.status(500).json({ detail: err.message }));
}

export function login(req, res) {
  const { email, password } = req.body;
  FinanceiroUser.findOne({ where: { email, password } })
    .then((user) => {
      if (user) {
        return res.json({
          access_token: "mock-token-" + user.id,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        });
      }
      res.status(401).json({ detail: "Login failed" });
    })
    .catch((err) => res.status(500).json({ detail: err.message }));
}

export function me(req, res) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ detail: "Not authenticated" });
  const token = auth.replace("Bearer ", "");
  const id = parseInt(token.replace("mock-token-", ""));
  FinanceiroUser.findByPk(id)
    .then((user) => {
      if (!user) return res.status(401).json({ detail: "Not authenticated" });
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    })
    .catch((err) => res.status(500).json({ detail: err.message }));
}
