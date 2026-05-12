-- ============================================================
-- PostgreSQL Schema for EDC Application
-- Converted from MySQL - Compatible with MinIO + PostgreSQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLE: utilisateurs
CREATE TABLE IF NOT EXISTS utilisateurs (
    id SERIAL PRIMARY KEY,
    code_entreprise VARCHAR(100),
    code_user VARCHAR(100),
    identite VARCHAR(255) UNIQUE,
    position VARCHAR(255),
    tel VARCHAR(50),
    email VARCHAR(255),
    mot_de_passe VARCHAR(255),
    role VARCHAR(50) DEFAULT 'utilisateur',
    profile_image TEXT,
    "resetPasswordToken" VARCHAR(255),
    "resetPasswordExpires" BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: entreprises
CREATE TABLE IF NOT EXISTS entreprises (
    id SERIAL PRIMARY KEY,
    code_entreprise VARCHAR(100) UNIQUE,
    date_creation DATE,
    identite VARCHAR(255),
    "MF/CIN" VARCHAR(100),
    responsable VARCHAR(255),
    cnss VARCHAR(100),
    tel VARCHAR(50),
    email VARCHAR(255),
    adresse TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
    message TEXT,
    "read" BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: taux_retenue_source
CREATE TABLE IF NOT EXISTS taux_retenue_source (
    id SERIAL PRIMARY KEY,
    taux DECIMAL(10,3),
    active BOOLEAN DEFAULT true
);

-- TABLE: banques
CREATE TABLE IF NOT EXISTS banques (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    active BOOLEAN DEFAULT true
);

-- TABLE: tiers
CREATE TABLE IF NOT EXISTS tiers (
    id SERIAL PRIMARY KEY,
    code_tiers VARCHAR(100),
    date_creation DATE,
    type VARCHAR(100),
    identite VARCHAR(255),
    "MF/CIN" VARCHAR(100),
    tel VARCHAR(50),
    email VARCHAR(255),
    adresse TEXT,
    ville VARCHAR(100),
    pays VARCHAR(100),
    observations TEXT,
    autreType VARCHAR(100),
    ajoute_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: tiers_banques
CREATE TABLE IF NOT EXISTS tiers_banques (
    id SERIAL PRIMARY KEY,
    tier_id INTEGER REFERENCES tiers(id) ON DELETE CASCADE,
    banque_id INTEGER REFERENCES banques(id) ON DELETE CASCADE
);

-- TABLE: achats
CREATE TABLE IF NOT EXISTS achats (
    id SERIAL PRIMARY KEY,
    date_saisie DATE,
    code_tiers VARCHAR(100),
    tiers_saisie VARCHAR(255),
    type_piece VARCHAR(100),
    num_piece VARCHAR(100),
    date_piece DATE,
    statut VARCHAR(50),
    "montant_HT_piece" DECIMAL(15,3),
    "FODEC_piece" DECIMAL(15,3),
    "TVA_piece" DECIMAL(15,3),
    timbre_piece DECIMAL(15,3),
    autre_montant_piece DECIMAL(15,3),
    montant_total_piece DECIMAL(15,3),
    observations TEXT,
    document_fichier TEXT,
    ajoute_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: commandes
CREATE TABLE IF NOT EXISTS commandes (
    id SERIAL PRIMARY KEY,
    date_commande DATE,
    num_commande VARCHAR(100),
    code_tiers VARCHAR(100),
    tiers_saisie VARCHAR(255),
    montant_commande DECIMAL(15,3),
    date_livraison_prevue DATE,
    observations TEXT,
    document_fichier TEXT,
    ajoute_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: familles
CREATE TABLE IF NOT EXISTS familles (
    id SERIAL PRIMARY KEY,
    famille VARCHAR(255),
    sous_famille VARCHAR(255),
    article TEXT,
    commande_id INTEGER REFERENCES commandes(id) ON DELETE CASCADE
);

-- TABLE: livraisons
CREATE TABLE IF NOT EXISTS livraisons (
    id SERIAL PRIMARY KEY,
    "date_BL" DATE,
    num_BL VARCHAR(100),
    code_tiers VARCHAR(100),
    tiers_saisie VARCHAR(255),
    reference_commande VARCHAR(100),
    "montant_HT_BL" DECIMAL(15,3),
    "TVA_BL" DECIMAL(15,3),
    montant_total_BL DECIMAL(15,3),
    observations TEXT,
    document_fichier TEXT,
    ajoute_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: facturations
CREATE TABLE IF NOT EXISTS facturations (
    id SERIAL PRIMARY KEY,
    date_facture DATE,
    num_facture VARCHAR(100),
    code_tiers VARCHAR(100),
    tiers_saisie VARCHAR(255),
    reference_livraison VARCHAR(100),
    "montant_HT_facture" DECIMAL(15,3),
    "FODEC_sur_facture" DECIMAL(15,3),
    "TVA_facture" DECIMAL(15,3),
    timbre_facture DECIMAL(15,3),
    autre_montant_facture DECIMAL(15,3),
    montant_total_facture DECIMAL(15,3),
    observations TEXT,
    document_fichier TEXT,
    etat_payement VARCHAR(50) DEFAULT 'non payée',
    ajoute_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: reglements_emis
CREATE TABLE IF NOT EXISTS reglements_emis (
    id SERIAL PRIMARY KEY,
    date_saisie DATE,
    code_tiers VARCHAR(100),
    "tierId" INTEGER REFERENCES tiers(id) ON DELETE SET NULL,
    tiers_saisie VARCHAR(255),
    montant_brut DECIMAL(15,3),
    base_retenue_source DECIMAL(15,3),
    taux_retenue_source DECIMAL(10,3),
    montant_retenue_source DECIMAL(15,3),
    montant_net DECIMAL(15,3),
    observations TEXT,
    ajoute_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: pieces_a_regler
CREATE TABLE IF NOT EXISTS pieces_a_regler (
    id SERIAL PRIMARY KEY,
    num_piece_a_regler VARCHAR(100),
    date_piece_a_regler DATE,
    montant_piece_a_regler DECIMAL(15,3),
    montant_restant DECIMAL(15,3),
    document_fichier TEXT,
    reglement_emis_id INTEGER REFERENCES reglements_emis(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: reglements_recus
CREATE TABLE IF NOT EXISTS reglements_recus (
    id SERIAL PRIMARY KEY,
    code_tiers VARCHAR(100),
    "tierId" INTEGER REFERENCES tiers(id) ON DELETE SET NULL,
    tiers_saisie VARCHAR(255),
    montant_total_a_regler DECIMAL(15,3),
    observations TEXT,
    ajoute_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: reglements_recus_factures
CREATE TABLE IF NOT EXISTS reglements_recus_factures (
    id SERIAL PRIMARY KEY,
    reglement_recu_id INTEGER REFERENCES reglements_recus(id) ON DELETE CASCADE,
    facture_id INTEGER REFERENCES facturations(id) ON DELETE CASCADE
);

-- TABLE: versements_en_banque
CREATE TABLE IF NOT EXISTS versements_en_banque (
    id SERIAL PRIMARY KEY,
    date_versement DATE,
    reference_bordereau_bulletin VARCHAR(255),
    observations TEXT,
    document_fichier TEXT,
    ajoute_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: payements
CREATE TABLE IF NOT EXISTS payements (
    id SERIAL PRIMARY KEY,
    modalite VARCHAR(100),
    num VARCHAR(100),
    banque VARCHAR(100),
    date_echeance DATE,
    montant DECIMAL(15,3),
    code_tiers VARCHAR(100),
    "tierId" INTEGER REFERENCES tiers(id) ON DELETE SET NULL,
    tiers_saisie VARCHAR(255),
    reglement_emis_id INTEGER REFERENCES reglements_emis(id) ON DELETE CASCADE,
    reglement_recus_id INTEGER REFERENCES reglements_recus(id) ON DELETE CASCADE,
    versement_id INTEGER REFERENCES versements_en_banque(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: documents_comptabilite
CREATE TABLE IF NOT EXISTS documents_comptabilite (
    id SERIAL PRIMARY KEY,
    date DATE,
    nature VARCHAR(255),
    designation TEXT,
    destinataire VARCHAR(255),
    document_fichier TEXT,
    priorite VARCHAR(50),
    observations TEXT,
    ajoute_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: documents_direction
CREATE TABLE IF NOT EXISTS documents_direction (
    id SERIAL PRIMARY KEY,
    date DATE,
    nature VARCHAR(255),
    designation TEXT,
    destinataire VARCHAR(255),
    document_fichier TEXT,
    priorite VARCHAR(50),
    observations TEXT,
    ajoute_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: pointage_personnel
CREATE TABLE IF NOT EXISTS pointage_personnel (
    id SERIAL PRIMARY KEY,
    "CODE TIERS" VARCHAR(100),
    "IDENTITE DU TIERS" VARCHAR(255),
    "TYPE DE PAIE" VARCHAR(100),
    "NBRES DE JOURS OU D'H TRAVAILLES" DECIMAL(10,2),
    "NBRES DE JOURS OU D'H SUPP." DECIMAL(10,2),
    "NBRES DE JOURS OU D'H D'ABSENCE" DECIMAL(10,2),
    "NBRES DE JOURS OU D'H DE CONGE ANNUEL" DECIMAL(10,2),
    "NBRES DE JOURS OU D'H AUTRES CONGES" DECIMAL(10,2),
    "SUPPLEMENT RECU" DECIMAL(15,3),
    "AVANCES SUR SALAIRES" DECIMAL(15,3),
    "REMBOURSEMENTS DE PRÊTS" DECIMAL(15,3),
    "AUTRES DEDUCTIONS" DECIMAL(15,3),
    "OBSERVATIONS" TEXT,
    ajoute_par INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_utilisateurs_identite ON utilisateurs(identite);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_code_entreprise ON utilisateurs(code_entreprise);
CREATE INDEX IF NOT EXISTS idx_tiers_code ON tiers(code_tiers);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_familles_commande ON familles(commande_id);
CREATE INDEX IF NOT EXISTS idx_payements_reglement_emis ON payements(reglement_emis_id);
CREATE INDEX IF NOT EXISTS idx_payements_versement ON payements(versement_id);
