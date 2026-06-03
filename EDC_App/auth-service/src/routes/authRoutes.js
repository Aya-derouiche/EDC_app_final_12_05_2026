const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const { issueAccessToken, issueRefreshToken, verifyToken } = require("../config/jwt");
const { requireAuth } = require("../middleware/auth");

function normalizeLoginPayload(body) {
  return {
    identite: (body.identite || body.email || "").trim(),
    password: body.mot_de_passe || body.password || "",
  };
}

router.post("/login", async (req, res, next) => {
  try {
    const { identite, password } = normalizeLoginPayload(req.body || {});
    if (!identite || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const userRes = await query(
      `SELECT u.*, e.code_entreprise
       FROM utilisateurs u
       LEFT JOIN entreprises e ON e.id = u.entreprise_id
       WHERE LOWER(u.identite)=LOWER($1) OR LOWER(u.email)=LOWER($1)
       LIMIT 1`,
      [identite]
    );

    const user = userRes.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.mot_de_passe || "");
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = issueAccessToken(user);
    const refreshToken = issueRefreshToken(user);

    const decodedRefresh = verifyToken(refreshToken);
    const expiresAt = new Date(decodedRefresh.exp * 1000);
    await query(
      `INSERT INTO auth_refresh_tokens (user_id, refresh_token, expires_at)
       VALUES ($1,$2,$3)
       ON CONFLICT (refresh_token) DO NOTHING`,
      [user.id, refreshToken, expiresAt]
    );

    const me = {
      id: user.id,
      identite: user.identite,
      email: user.email,
      role: user.role,
      tenantId: user.entreprise_id,
      entreprise_id: user.entreprise_id,
      code_entreprise: user.code_entreprise,
      gym_branch_id: user.gym_branch_id,
      branch_id: user.gym_branch_id,
    };

    res.json({ token, refreshToken, user: me });
  } catch (e) {
    next(e);
  }
});

router.post("/register", async (req, res, next) => {
  try {
    const { identite, email, mot_de_passe, role = "utilisateur", entreprise_id = null, gym_branch_id = null } = req.body || {};
    if (!identite || !email || !mot_de_passe) {
      return res.status(400).json({ error: "identite, email, mot_de_passe are required" });
    }

    const exists = await query(
      "SELECT id FROM utilisateurs WHERE LOWER(email)=LOWER($1) OR LOWER(identite)=LOWER($2) LIMIT 1",
      [email, identite]
    );
    if (exists.rows[0]) return res.status(409).json({ error: "User already exists" });

    const hash = await bcrypt.hash(mot_de_passe, 10);
    const ins = await query(
      `INSERT INTO utilisateurs (identite, email, mot_de_passe, role, entreprise_id, gym_branch_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, identite, email, role, entreprise_id, gym_branch_id`,
      [identite, email, hash, role, entreprise_id, gym_branch_id]
    );

    res.status(201).json({ user: ins.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.post("/refresh-token", async (req, res, next) => {
  try {
    const incoming = req.body?.refreshToken || req.body?.token;
    if (!incoming) return res.status(400).json({ error: "Missing refresh token" });

    const tokenRow = await query(
      `SELECT * FROM auth_refresh_tokens
       WHERE refresh_token=$1 AND revoked=FALSE AND expires_at > NOW()
       LIMIT 1`,
      [incoming]
    );
    if (!tokenRow.rows[0]) return res.status(401).json({ error: "Invalid refresh token" });

    const decoded = verifyToken(incoming);
    if (decoded.type !== "refresh") return res.status(401).json({ error: "Invalid refresh token type" });

    const userRes = await query(
      `SELECT u.*, e.code_entreprise
       FROM utilisateurs u
       LEFT JOIN entreprises e ON e.id=u.entreprise_id
       WHERE u.id=$1`,
      [decoded.id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(401).json({ error: "User not found" });

    const newToken = issueAccessToken(user);
    res.json({ token: newToken });
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userRes = await query(
      `SELECT u.id, u.identite, u.email, u.role, u.entreprise_id, u.gym_branch_id, e.code_entreprise
       FROM utilisateurs u
       LEFT JOIN entreprises e ON e.id=u.entreprise_id
       WHERE u.id=$1`,
      [req.user.id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

router.get("/modules", requireAuth, async (req, res, next) => {
  try {
    const defaults = ["COMPTA", "GYM"];

    const mapRes = await query(
      `SELECT module_key, is_enabled
       FROM auth_user_module_access
       WHERE user_id=$1`,
      [req.user.id]
    );

    if (mapRes.rows.length === 0) {
      for (const key of defaults) {
        await query(
          `INSERT INTO auth_user_module_access (user_id, module_key, is_enabled)
           VALUES ($1,$2,TRUE)
           ON CONFLICT (user_id, module_key) DO NOTHING`,
          [req.user.id, key]
        );
      }
    }

    const finalRes = await query(
      `SELECT module_key, is_enabled
       FROM auth_user_module_access
       WHERE user_id=$1
       ORDER BY module_key`,
      [req.user.id]
    );

    res.json({ modules: finalRes.rows });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
