const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const env = require("../config/env");
const { query } = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const multer = require("multer");
const { minioClient, MINIO_BUCKET } = require("../../config/minio");
const { scanDocument } = require("../../services/aiScan");

async function tableExists(name) {
  const r = await query("SELECT to_regclass($1) IS NOT NULL AS exists", [name]);
  return r.rows[0]?.exists === true;
}

async function verifyPassword(plain, stored) {
  if (!stored) return false;
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    return bcrypt.compare(plain, stored);
  }
  return plain === stored;
}

async function findLoginUser(identite) {
  const candidates = [
    {
      source: "utilisateurs",
      sql: `SELECT *, identite AS login_identite, code_entreprise AS login_code_entreprise
            FROM utilisateurs
            WHERE identite = $1 OR email = $1
            LIMIT 1`,
    },
    {
      source: "utilisateurs",
      sql: `SELECT *, nom AS login_identite, entreprise_id::text AS login_code_entreprise
            FROM utilisateurs
            WHERE nom = $1 OR email = $1
            LIMIT 1`,
    },
    {
      source: "users",
      sql: `SELECT *, identite AS login_identite, code_entreprise AS login_code_entreprise
            FROM users
            WHERE identite = $1 OR email = $1
            LIMIT 1`,
    },
    {
      source: "users",
      sql: `SELECT *, nom AS login_identite, entreprise_id::text AS login_code_entreprise
            FROM users
            WHERE nom = $1 OR email = $1
            LIMIT 1`,
    },
  ];

  for (const candidate of candidates) {
    try {
      const r = await query(candidate.sql, [identite]);
      if (r.rows[0]) {
        return { user: r.rows[0], source: candidate.source };
      }
    } catch (err) {
      if (!["42P01", "42703"].includes(err.code)) throw err;
    }
  }

  return { user: null, source: null };
}

router.post("/login", async (req, res, next) => {
  try {
    const identite = req.body.identite || req.body.email;
    const mot_de_passe = req.body.mot_de_passe || req.body.password;
    if (!identite || !mot_de_passe) return res.status(400).json({ message: "Identifiants manquants" });

    const { user, source } = await findLoginUser(identite);

    if (!user) return res.status(401).json({ message: "Identifiants invalides" });

    const ok = await verifyPassword(mot_de_passe, user.mot_de_passe);
    if (!ok) return res.status(401).json({ message: "Identifiants invalides" });

    const role = user.role || "client";
    const codeEntreprise = user.login_code_entreprise || user.code_entreprise || user.entreprise_id || null;
    const identiteUser = user.login_identite || user.identite || user.nom || null;

    const token = jwt.sign({
      id: user.id,
      role,
      entrepriseId: codeEntreprise,
      email: user.email,
      identite: identiteUser,
      code_user: user.code_user || null,
      code_entreprise: codeEntreprise,
      position: user.position || null,
      tel: user.tel || null,
      source,
    }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

    res.json({
      token,
      user: {
        id: user.id,
        identite: identiteUser,
        role,
        email: user.email,
        code_user: user.code_user || null,
        code_entreprise: codeEntreprise,
        position: user.position || null,
        tel: user.tel || null,
      },
    });
  } catch (e) { next(e); }
});

router.get("/home", requireAuth, async (req, res, next) => {
  try {
    if (await tableExists("public.utilisateurs")) {
      const r = await query("SELECT id, code_entreprise, code_user, identite, position, tel, email, role FROM utilisateurs WHERE id=$1 LIMIT 1", [req.user.id]);
      const user = r.rows[0];
      if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
      return res.json({ message: "Bienvenue sur la page d'accueil", user });
    }

    if (await tableExists("public.users")) {
      const r2 = await query("SELECT id, code_user, code_entreprise, identite, position, tel, email, role FROM users WHERE id=$1 LIMIT 1", [req.user.id]);
      const user2 = r2.rows[0];
      if (!user2) return res.status(404).json({ message: "Utilisateur non trouvé" });
      return res.json({ message: "Bienvenue sur la page d'accueil", user: user2 });
    }

    return res.status(500).json({ message: "Aucune table utilisateur disponible" });
  } catch (e) { next(e); }
});

router.get("/statistics", async (_req, res, next) => {
  try {
    let usersCount = 0;
    if (await tableExists("public.utilisateurs")) {
      const u = await query("SELECT COUNT(*) AS totalusers FROM utilisateurs");
      usersCount = Number(u.rows[0]?.totalusers || 0);
    } else if (await tableExists("public.users")) {
      const u2 = await query("SELECT COUNT(*) AS totalusers FROM users");
      usersCount = Number(u2.rows[0]?.totalusers || 0);
    }

    const orders = await query("SELECT COUNT(*) AS totalorders FROM commandes");
    const deliveries = await query("SELECT COUNT(*) AS totaldeliveries FROM commandes WHERE date_livraison_prevue IS NOT NULL");
    const invoices = await query("SELECT COUNT(*) AS unpaidinvoices FROM facturations WHERE etat_payement = '0'");

    res.json({
      totalUsers: usersCount,
      totalOrders: Number(orders.rows[0]?.totalorders || 0),
      totalDeliveries: Number(deliveries.rows[0]?.totaldeliveries || 0),
      unpaidInvoices: Number(invoices.rows[0]?.unpaidinvoices || 0),
    });
  } catch (e) { next(e); }
});

router.get("/orders-per-period", requireAuth, async (req, res, next) => {
  try {
    const q = `SELECT TO_CHAR(date_commande, 'YYYY-MM') AS period, COUNT(*) AS count
               FROM commandes WHERE ajoute_par = $1 GROUP BY period ORDER BY period`;
    const r = await query(q, [req.user.id]);
    res.json({ ordersPerPeriod: r.rows.map(x => ({ label: x.period, count: Number(x.count) })) });
  } catch (e) { next(e); }
});

router.get("/notifications/:userId", async (req, res, next) => {
  try {
    const r = await query("SELECT id, user_id, message, read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC", [req.params.userId]);
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.post("/notifications", async (req, res, next) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) return res.status(400).json({ error: "userId and message are required" });
    const r = await query(
      "INSERT INTO notifications (user_id, message, read, created_at) VALUES ($1, $2, false, NOW()) RETURNING *",
      [userId, message]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { next(e); }
});

router.post("/notifications/markAsRead", async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    await query("UPDATE notifications SET read = true WHERE user_id = $1", [userId]);
    res.json({ message: "Notifications marked as read" });
  } catch (e) { next(e); }
});

router.delete("/notifications/:id", async (req, res, next) => {
  try {
    await query("DELETE FROM notifications WHERE id = $1", [req.params.id]);
    res.json({ message: "Notification deleted" });
  } catch (e) { next(e); }
});

router.get("/code_tiers", async (_req, res, next) => {
  try {
    const r = await query("SELECT id, code_tiers, identite FROM tiers ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/reference_commande", async (_req, res, next) => {
  try {
    const r = await query("SELECT num_commande FROM commandes WHERE num_commande IS NOT NULL ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/clients", async (_req, res, next) => {
  try {
    const r = await query("SELECT * FROM entreprises ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/code_entreprises", async (_req, res, next) => {
  try {
    const r = await query("SELECT id, code_entreprise FROM entreprises ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) { next(e); }
});


router.get("/entreprises", async (_req, res, next) => {
  try {
    const r = await query('SELECT * FROM entreprises ORDER BY id DESC');
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/entreprises/:id", async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM entreprises WHERE id = $1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Entreprise non trouvée' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

router.post("/entreprises", async (req, res, next) => {
  try {
    const b = req.body || {};
    const r = await query(
      'INSERT INTO entreprises (code_entreprise, date_creation, identite, "MF/CIN", responsable, cnss, tel, email, adresse) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [
        b.code_entreprise || null,
        b.date_creation || null,
        b.identite || null,
        b.MF_CIN || b['MF/CIN'] || null,
        b.responsable || null,
        b.cnss || null,
        b.tel || null,
        b.email || null,
        b.adresse || null,
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { next(e); }
});

router.put("/entreprises/:id", async (req, res, next) => {
  try {
    const b = req.body || {};
    const r = await query(
      'UPDATE entreprises SET code_entreprise=$1, date_creation=$2, identite=$3, "MF/CIN"=$4, responsable=$5, cnss=$6, tel=$7, email=$8, adresse=$9 WHERE id=$10 RETURNING *',
      [
        b.code_entreprise || null,
        b.date_creation || null,
        b.identite || null,
        b.MF_CIN || b['MF/CIN'] || null,
        b.responsable || null,
        b.cnss || null,
        b.tel || null,
        b.email || null,
        b.adresse || null,
        req.params.id,
      ]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Entreprise non trouvée' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

router.delete("/entreprises/:id", async (req, res, next) => {
  try {
    await query('DELETE FROM entreprises WHERE id = $1', [req.params.id]);
    res.json({ message: 'Entreprise supprimée avec succès' });
  } catch (e) { next(e); }
});

router.get("/code_entreprises", async (_req, res, next) => {
  try {
    const r = await query('SELECT code_entreprise FROM entreprises ORDER BY code_entreprise');
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/users", async (_req, res, next) => {
  try {
    const r = await query("SELECT id, code_entreprise, code_user, identite, position, tel, email, role, profile_image, created_at FROM utilisateurs ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/users/:id", async (req, res, next) => {
  try {
    const r = await query("SELECT * FROM utilisateurs WHERE id = $1", [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

router.post("/users", async (req, res, next) => {
  try {
    const b = req.body || {};
    const hashed = b.mot_de_passe ? await bcrypt.hash(b.mot_de_passe, 10) : null;
    const r = await query(
      "INSERT INTO utilisateurs (code_entreprise, code_user, identite, position, tel, email, mot_de_passe, role, code_comptable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
      [b.code_entreprise || null, b.code_user || null, b.identite || null, b.position || null, b.tel || null, b.email || null, hashed, b.role || null, b.code_comptable || null]
    );
    res.status(201).json({ id: r.rows[0].id, message: "Utilisateur créé avec succès" });
  } catch (e) { next(e); }
});

router.put("/users/:id", async (req, res, next) => {
  try {
    const b = req.body || {};
    let passSql = "mot_de_passe";
    let passVal = null;
    if (b.mot_de_passe && b.mot_de_passe.trim() !== "") {
      passVal = await bcrypt.hash(b.mot_de_passe, 10);
    } else {
      const cur = await query("SELECT mot_de_passe FROM utilisateurs WHERE id=$1", [req.params.id]);
      passVal = cur.rows[0]?.mot_de_passe || null;
    }

    const r = await query(
      "UPDATE utilisateurs SET code_entreprise=$1, code_user=$2, identite=$3, position=$4, tel=$5, email=$6, mot_de_passe=$7, role=$8, profile_image=$9, code_comptable=$10 WHERE id=$11 RETURNING id",
      [b.code_entreprise || null, b.code_user || null, b.identite || null, b.position || null, b.tel || null, b.email || null, passVal, b.role || null, b.profile_image || null, b.code_comptable || null, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json({ message: "Utilisateur mis à jour avec succès" });
  } catch (e) { next(e); }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    await query("DELETE FROM utilisateurs WHERE id = $1", [req.params.id]);
    res.json({ message: "Utilisateur supprimé avec succès" });
  } catch (e) { next(e); }
});

router.get("/tiers", async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT t.*, u.identite AS ajoute_par
       FROM tiers t
       LEFT JOIN utilisateurs u ON t.ajoute_par = u.id
       ORDER BY t.id DESC`
    );
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/tiers/:id", async (req, res, next) => {
  try {
    const r = await query("SELECT * FROM tiers WHERE id = $1", [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: "Tier non trouvé" });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

router.post("/tiers", async (req, res, next) => {
  try {
    const b = req.body || {};
    const r = await query(
      `INSERT INTO tiers (code_tiers, date_creation, type, identite, "MF/CIN", tel, email, adresse, ville, pays, observations, autretype, ajoute_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [b.code_tiers || null, b.date_creation || null, b.type || null, b.identite || null, b.MF_CIN || b['MF/CIN'] || null, b.tel || null, b.email || null, b.adresse || null, b.ville || null, b.pays || null, b.observations || null, b.autreType || b.autretype || null, b.ajoute_par || null]
    );
    res.status(201).json({ id: r.rows[0].id, message: "Tier ajouté" });
  } catch (e) { next(e); }
});

router.put("/tiers/:id", async (req, res, next) => {
  try {
    const b = req.body || {};
    const r = await query(
      `UPDATE tiers SET code_tiers=$1, date_creation=$2, type=$3, identite=$4, "MF/CIN"=$5, tel=$6, email=$7, adresse=$8, ville=$9, pays=$10, observations=$11, autretype=$12
       WHERE id=$13 RETURNING id`,
      [b.code_tiers || null, b.date_creation || null, b.type || null, b.identite || null, b.MF_CIN || b['MF/CIN'] || null, b.tel || null, b.email || null, b.adresse || null, b.ville || null, b.pays || null, b.observations || null, b.autreType || b.autretype || null, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Tier non trouvé" });
    res.json({ message: "Tier mis à jour" });
  } catch (e) { next(e); }
});

router.delete("/tiers/:id", async (req, res, next) => {
  try {
    await query("DELETE FROM tiers WHERE id = $1", [req.params.id]);
    res.json({ message: "Tier supprimé" });
  } catch (e) { next(e); }
});

router.get("/achats", async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT a.*, COALESCE(t.identite, a.tiers_saisie) AS identite, u.identite AS ajoute_par
       FROM achats a
       LEFT JOIN tiers t ON a.code_tiers = t.code_tiers
       LEFT JOIN utilisateurs u ON a.ajoute_par = u.id
       ORDER BY a.id DESC`
    );
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/achats/:id", async (req, res, next) => {
  try {
    const r = await query("SELECT * FROM achats WHERE id = $1", [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: "Achat non trouvé" });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

router.post("/achats", async (req, res, next) => {
  try {
    const b = req.body || {};
    const r = await query(
      `INSERT INTO achats (date_saisie, code_tiers, tiers_saisie, type_piece, num_piece, date_piece, statut, montant_HT_piece, FODEC_piece, TVA_piece, timbre_piece, autre_montant_piece, montant_total_piece, observations, document_fichier, ajoute_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [b.date_saisie||null,b.code_tiers||null,b.tiers_saisie||null,b.type_piece||null,b.num_piece||null,b.date_piece||null,b.statut||null,b.montant_HT_piece||null,b.FODEC_piece||null,b.TVA_piece||null,b.timbre_piece||null,b.autre_montant_piece||null,b.montant_total_piece||null,b.observations||null,b.document_fichier||null,b.ajoute_par||null]
    );
    res.status(201).json({ id: r.rows[0].id, message: "Achat ajouté" });
  } catch (e) { next(e); }
});

router.put("/achats/:id", async (req, res, next) => {
  try {
    const b = req.body || {};
    const r = await query(
      `UPDATE achats SET date_saisie=$1, code_tiers=$2, tiers_saisie=$3, type_piece=$4, num_piece=$5, date_piece=$6, statut=$7, montant_HT_piece=$8, FODEC_piece=$9, TVA_piece=$10, timbre_piece=$11, autre_montant_piece=$12, montant_total_piece=$13, observations=$14, document_fichier=$15
       WHERE id=$16 RETURNING id`,
      [b.date_saisie||null,b.code_tiers||null,b.tiers_saisie||null,b.type_piece||null,b.num_piece||null,b.date_piece||null,b.statut||null,b.montant_HT_piece||null,b.FODEC_piece||null,b.TVA_piece||null,b.timbre_piece||null,b.autre_montant_piece||null,b.montant_total_piece||null,b.observations||null,b.document_fichier||null,req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Achat non trouvé" });
    res.json({ message: "Achat mis à jour" });
  } catch (e) { next(e); }
});

router.delete("/achats/:id", async (req, res, next) => {
  try {
    await query("DELETE FROM achats WHERE id = $1", [req.params.id]);
    res.json({ message: "Achat supprimé" });
  } catch (e) { next(e); }
});

router.get("/commandes", async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT c.*, COALESCE(t.identite, c.tiers_saisie) AS identite, u.identite AS ajoute_par
       FROM commandes c
       LEFT JOIN tiers t ON c.code_tiers = t.code_tiers
       LEFT JOIN utilisateurs u ON c.ajoute_par = u.id
       ORDER BY c.id DESC`
    );
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/livraisons", async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT l.*, COALESCE(t.identite, l.tiers_saisie) AS identite, u.identite AS ajoute_par
       FROM livraisons l
       LEFT JOIN tiers t ON l.code_tiers = t.code_tiers
       LEFT JOIN utilisateurs u ON l.ajoute_par = u.id
       ORDER BY l.id DESC`
    );
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/versements", async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT v.*, u.identite AS ajoute_par
       FROM versements_en_banque v
       LEFT JOIN utilisateurs u ON v.ajoute_par = u.id
       ORDER BY v.id DESC`
    );
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/pointage-personnel", async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT p.*, u.identite AS ajoute_par
       FROM pointage_personnel p
       LEFT JOIN utilisateurs u ON p.ajoute_par = u.id
       ORDER BY p.id DESC`
    );
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/liste-clients-par-periode-creation", async (req, res, next) => {
  try {
    const { dateCreation, company } = req.query;
    if (!dateCreation) return res.status(400).json({ error: "dateCreation is required" });

    let sql = `SELECT * FROM entreprises WHERE date_creation = $1`;
    const params = [dateCreation];

    if (company) {
      sql += ` AND code_entreprise = $2`;
      params.push(company);
    }

    const r = await query(sql, params);
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/facturations", async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT f.*, COALESCE(t.identite, f.tiers_saisie) AS identite, u.identite AS ajoute_par
       FROM facturations f
       LEFT JOIN tiers t ON f.code_tiers = t.code_tiers
       LEFT JOIN utilisateurs u ON f.ajoute_par = u.id
       ORDER BY f.id DESC`
    );
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/reference_livraison", async (_req, res, next) => {
  try {
    const r = await query("SELECT num_bl AS \"num_BL\" FROM livraisons WHERE num_bl IS NOT NULL ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/facture/:id", async (req, res, next) => {
  try {
    const r = await query("SELECT * FROM facturations WHERE id = $1", [req.params.id]);
    const f = r.rows[0];
    if (!f) return res.status(404).json({ message: "Facture non trouvée" });

    const doc = (f.document_fichier ?? "").toString().trim();
    if (doc) {
      const isHttp = /^https?:\/\//i.test(doc);
      const isDataUrl = /^data:/i.test(doc);
      const lowerDoc = doc.toLowerCase();
      const isFakePath = lowerDoc.includes("fakepath") || /^[a-zA-Z]:\\/.test(doc) || doc.includes("\\");

      if (isHttp || isDataUrl) {
        f.document_fichier_url = doc;
      } else if (!isFakePath) {
        try {
          f.document_fichier_url = await minioClient.presignedGetObject(MINIO_BUCKET, doc, 7 * 24 * 60 * 60);
        } catch (_err) {
          f.document_fichier_url = null;
        }
      } else {
        f.document_fichier_url = null;
      }
    } else {
      f.document_fichier_url = null;
    }

    res.json({ facture: f });
  } catch (e) { next(e); }
});

router.put("/facture/:id", async (req, res, next) => {
  try {
    const body = req.body?.facture ?? req.body ?? {};
    const b = typeof body === "string" ? JSON.parse(body) : body;

    const r = await query(
      `UPDATE facturations SET
        date_facture = $1,
        num_facture = $2,
        code_tiers = $3,
        tiers_saisie = $4,
        reference_livraison = $5,
        "montant_HT_facture" = $6,
        "FODEC_sur_facture" = $7,
        "TVA_facture" = $8,
        timbre_facture = $9,
        autre_montant_facture = $10,
        montant_total_facture = $11,
        observations = $12,
        document_fichier = $13,
        etat_payement = $14
      WHERE id = $15
      RETURNING id`,
      [
        b.date_facture || null,
        b.num_facture || null,
        b.code_tiers || null,
        b.tiers_saisie || null,
        b.reference_livraison || null,
        b.montant_HT_facture ?? b.montant_ht_facture ?? null,
        b.FODEC_sur_facture ?? b.fodec_sur_facture ?? null,
        b.TVA_facture ?? b.tva_facture ?? null,
        b.timbre_facture ?? null,
        b.autre_montant_facture ?? null,
        b.montant_total_facture ?? null,
        b.observations || null,
        b.document_fichier || null,
        (b.etat_payement === true || b.etat_payement === "payee" || b.etat_payement === "payée") ? "payée" : "non payée",
        req.params.id,
      ]
    );

    if (!r.rows[0]) return res.status(404).json({ message: "Facture non trouvée" });
    res.json({ id: r.rows[0].id, message: "Facture mise à jour avec succès" });
  } catch (e) { next(e); }
});

router.delete("/facturations/:id", async (req, res, next) => {
  try {
    const r = await query("DELETE FROM facturations WHERE id = $1 RETURNING id", [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ message: "Facture non trouvée" });
    res.json({ id: r.rows[0].id, message: "Facture supprimée avec succès" });
  } catch (e) { next(e); }
});
router.get("/reglements-emis", async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT r.*, u.identite AS ajoute_par
       FROM reglements_emis r
       LEFT JOIN utilisateurs u ON r.ajoute_par = u.id
       ORDER BY r.id DESC`
    );
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/reglements-emis/:id", async (req, res, next) => {
  try {
    const reg = await query('SELECT * FROM reglements_emis WHERE id = $1', [req.params.id]);
    if (!reg.rows[0]) return res.status(404).json({ error: 'Règlement émis non trouvé' });
    const pay = await query('SELECT * FROM payements WHERE reglement_emis_id = $1 ORDER BY id DESC', [req.params.id]);
    res.json({ reglement: reg.rows[0], payements: pay.rows });
  } catch (e) { next(e); }
});

router.delete("/reglements-emis/:id", async (req, res, next) => {
  try {
    await query('DELETE FROM payements WHERE reglement_emis_id = $1', [req.params.id]);
    await query('DELETE FROM reglements_emis WHERE id = $1', [req.params.id]);
    res.json({ message: 'Règlement émis supprimé' });
  } catch (e) { next(e); }
});

router.get("/reglements-recus", async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT r.*, u.identite AS ajoute_par
       FROM reglements_recus r
       LEFT JOIN utilisateurs u ON r.ajoute_par = u.id
       ORDER BY r.id DESC`
    );
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get("/reglements-recus/:id", async (req, res, next) => {
  try {
    const reg = await query('SELECT * FROM reglements_recus WHERE id = $1', [req.params.id]);
    if (!reg.rows[0]) return res.status(404).json({ error: 'Règlement reçu non trouvé' });
    const pay = await query('SELECT * FROM payements WHERE reglement_recus_id = $1 ORDER BY id DESC', [req.params.id]);
    const fac = await query('SELECT facture_id FROM reglements_recus_factures WHERE reglement_recu_id = $1 ORDER BY id DESC', [req.params.id]);
    res.json({ reglement: reg.rows[0], payements: pay.rows, factures: fac.rows });
  } catch (e) { next(e); }
});

router.delete("/reglements-recus/:id", async (req, res, next) => {
  try {
    await query('DELETE FROM payements WHERE reglement_recus_id = $1', [req.params.id]);
    await query('DELETE FROM reglements_recus_factures WHERE reglement_recu_id = $1', [req.params.id]);
    await query('DELETE FROM reglements_recus WHERE id = $1', [req.params.id]);
    res.json({ message: 'Règlement reçu supprimé' });
  } catch (e) { next(e); }
});

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.post("/documents/upload-and-scan", uploadMemory.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier re?u" });

    const docType = req.body.doc_type || "facture";
    const codeEntreprise = req.body.code_entreprise || "general";
    const folder = `compta_saas/${codeEntreprise}/${docType}`;
    const safeName = (req.file.originalname || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectName = `${folder}/${Date.now()}_${safeName}`;

    await minioClient.putObject(MINIO_BUCKET, objectName, req.file.buffer, req.file.size, {
      "Content-Type": req.file.mimetype,
      "original-name": req.file.originalname,
    });

    const secureUrl = await minioClient.presignedGetObject(MINIO_BUCKET, objectName, 7 * 24 * 60 * 60);

    let scanResult = { success: false, extractedData: null, confidence_score: 0 };
    try {
      scanResult = await scanDocument(secureUrl, req.file.mimetype, docType);
    } catch (_err) {}

    return res.status(201).json({
      message: "Fichier upload? et analys?",
      document: {
        id: null,
        minio_object_name: objectName,
        minio_bucket: MINIO_BUCKET,
        minio_secure_url: secureUrl,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
      },
      scan_success: !!scanResult.success,
      extractedData: scanResult.extractedData || null,
      confidence_score: scanResult.confidence_score || 0,
      scan_error: scanResult.error || null,
    });
  } catch (e) { next(e); }
});


router.post("/facture", async (req, res, next) => {
  try {
    let payload = req.body?.facture ?? req.body;
    if (typeof payload === "string") {
      try { payload = JSON.parse(payload); } catch (_e) { payload = {}; }
    }
    const b = payload || {};

    const r = await query(
      `INSERT INTO facturations (
        date_facture, num_facture, code_tiers, tiers_saisie, reference_livraison,
        "montant_HT_facture", "FODEC_sur_facture", "TVA_facture", timbre_facture,
        autre_montant_facture, montant_total_facture, observations, document_fichier,
        etat_payement, ajoute_par
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id`,
      [
        b.date_facture || null,
        b.num_facture || null,
        b.code_tiers || null,
        b.tiers_saisie || null,
        b.reference_livraison || null,
        b.montant_HT_facture ?? b.montant_ht_facture ?? null,
        b.FODEC_sur_facture ?? b.fodec_sur_facture ?? null,
        b.TVA_facture ?? b.tva_facture ?? null,
        b.timbre_facture ?? null,
        b.autre_montant_facture ?? null,
        b.montant_total_facture ?? null,
        b.observations || null,
        b.document_fichier || null,
        (b.etat_payement === true || b.etat_payement === "payee" || b.etat_payement === "payée") ? "payée" : "non payée",
        b.ajoute_par || null,
      ]
    );

    res.status(201).json({ id: r.rows[0].id, message: "Facture ajoutée avec succès" });
  } catch (e) { next(e); }
});

router.post("/commande", async (req, res, next) => {
  try {
    const body = req.body || {};
    const cmd = body.commande || body;

    const r = await query(
      `INSERT INTO commandes (
        date_commande, num_commande, code_tiers, tiers_saisie, montant_commande,
        date_livraison_prevue, observations, document_fichier, ajoute_par
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id`,
      [
        cmd.date_commande || null,
        cmd.num_commande || null,
        cmd.code_tiers || null,
        cmd.tiers_saisie || null,
        cmd.montant_commande ?? null,
        cmd.date_livraison_prevue || null,
        cmd.observations || null,
        cmd.document_fichier || null,
        cmd.ajoute_par || null,
      ]
    );

    res.status(201).json({ id: r.rows[0].id, message: "Commande ajoutée avec succès" });
  } catch (e) { next(e); }
});
router.post("/livraison/upload-document", uploadMemory.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });

    const safeName = (req.file.originalname || "document").replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectName = `livraisons/${Date.now()}_${safeName}`;

    await minioClient.putObject(MINIO_BUCKET, objectName, req.file.buffer, req.file.size, {
      "Content-Type": req.file.mimetype,
      "original-name": req.file.originalname,
    });

    const secureUrl = await minioClient.presignedGetObject(MINIO_BUCKET, objectName, 7 * 24 * 60 * 60);

    return res.status(201).json({
      message: "Document uploadé avec succès",
      objectKey: objectName,
      secureUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (e) { next(e); }
});
router.post("/livraison", async (req, res, next) => {
  try {
    const b = req.body || {};
    const r = await query(
      `INSERT INTO livraisons (
        "date_BL", num_bl, code_tiers, tiers_saisie, reference_commande,
        "montant_HT_BL", "TVA_BL", montant_total_bl, observations, document_fichier, ajoute_par
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [
        b.date_BL || null,
        b.num_BL || b.num_bl || null,
        b.code_tiers || null,
        b.tiers_saisie || null,
        b.reference_commande || null,
        b.montant_HT_BL || null,
        b.TVA_BL || null,
        b.montant_total_BL || b.montant_total_bl || null,
        b.observations || null,
        b.document_fichier || null,
        b.ajoute_par || null,
      ]
    );
    res.status(201).json({ id: r.rows[0].id, message: "Livraison ajoutée avec succès" });
  } catch (e) { next(e); }
});

router.put("/livraison/:id", async (req, res, next) => {
  try {
    const b = req.body || {};

    const r = await query(
      `UPDATE livraisons SET
        "date_BL" = $1,
        num_bl = $2,
        code_tiers = $3,
        tiers_saisie = $4,
        reference_commande = $5,
        "montant_HT_BL" = $6,
        "TVA_BL" = $7,
        montant_total_bl = $8,
        observations = $9,
        document_fichier = $10
      WHERE id = $11
      RETURNING id`,
      [
        b.date_BL || null,
        b.num_BL || b.num_bl || null,
        b.code_tiers || null,
        b.tiers_saisie || null,
        b.reference_commande || null,
        b.montant_HT_BL || null,
        b.TVA_BL || null,
        b.montant_total_BL || b.montant_total_bl || null,
        b.observations || null,
        b.document_fichier || null,
        req.params.id,
      ]
    );

    if (!r.rows[0]) {
      return res.status(404).json({ message: "Livraison non trouvée" });
    }

    res.json({ id: r.rows[0].id, message: "Livraison mise à jour avec succès" });
  } catch (e) { next(e); }
});
router.delete("/livraisons/:id", async (req, res, next) => {
  try {
    const r = await query("DELETE FROM livraisons WHERE id = $1 RETURNING id", [req.params.id]);
    if (!r.rows[0]) {
      return res.status(404).json({ message: "Livraison non trouvée" });
    }
    res.json({ message: "Livraison supprimée avec succès", id: r.rows[0].id });
  } catch (e) { next(e); }
});
router.get("/livraison/:id", async (req, res, next) => {
  try {
    const r = await query(
      `SELECT
        id,
        "date_BL",
        num_bl AS "num_BL",
        code_tiers,
        tiers_saisie,
        reference_commande,
        "montant_HT_BL",
        "TVA_BL",
        montant_total_bl AS "montant_total_BL",
        observations,
        document_fichier,
        ajoute_par
      FROM livraisons
      WHERE id = $1`,
      [req.params.id]
    );

    if (!r.rows[0]) {
      return res.status(404).json({ message: "Livraison non trouvée" });
    }

    const livraison = r.rows[0];
    const doc = (livraison.document_fichier ?? "").toString().trim();

    if (doc) {
      const isHttp = /^https?:\/\//i.test(doc);
      const isDataUrl = /^data:/i.test(doc);
      const lowerDoc = doc.toLowerCase();
      const isFakePath =
        lowerDoc.includes("fakepath") ||
        /^[a-zA-Z]:\\/.test(doc) ||
        doc.includes("\\");

      if (isHttp || isDataUrl) {
        livraison.document_fichier_url = doc;
      } else if (!isFakePath) {
        try {
          livraison.document_fichier_url = await minioClient.presignedGetObject(MINIO_BUCKET, doc, 7 * 24 * 60 * 60);
        } catch (_err) {
          livraison.document_fichier_url = null;
        }
      } else {
        livraison.document_fichier_url = null;
      }
    } else {
      livraison.document_fichier_url = null;
    }

    res.json(livraison);
  } catch (e) { next(e); }
});

router.get("/documents-direction", async (_req, res, next) => {
  try {
    const r = await query(
      `SELECT d.*, COALESCE(u.identite, '—') AS ajoute_par_nom
       FROM documents_direction d
       LEFT JOIN utilisateurs u ON d.ajoute_par = u.id
       ORDER BY d.created_at DESC, d.id DESC`
    );
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.delete("/documents-direction/:id", async (req, res, next) => {
  try {
    const r = await query("DELETE FROM documents_direction WHERE id = $1 RETURNING id", [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ message: "Document non trouvé" });
    res.json({ message: "Document supprimé", id: r.rows[0].id });
  } catch (e) { next(e); }
});
module.exports = router;

















