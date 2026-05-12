const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const env = require("../config/env");
const { query } = require("../config/db");
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const r = await query("SELECT * FROM utilisateurs WHERE email=$1", [email]);
    const user = r.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.mot_de_passe);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, role: user.role, entrepriseId: user.entreprise_id, email: user.email }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
    res.json({ token, user: { id: user.id, role: user.role, entrepriseId: user.entreprise_id, email: user.email } });
  } catch (e) { next(e); }
});
module.exports = router;
