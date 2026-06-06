# Deploiement Production

Architecture cible :

- 1 projet Neon
- 1 database Postgres
- 2 schemas Postgres : `cloud` et `gym`
- 2 services Render : `backend` et `gym-management`
- 1 frontend Vercel
- 1 MinIO compatible S3 sur Oracle Cloud VPS

## 1. Neon

1. Creer un projet Neon.
2. Garder une seule database, par exemple `edc`.
3. Copier la connection string pooled ou direct.
4. Elle ressemble a :

```text
postgresql://USER:PASSWORD@HOST/edc?sslmode=require
```

5. Ouvrir le SQL Editor Neon et executer les deux scripts :

```sql
CREATE SCHEMA IF NOT EXISTS cloud;
SET search_path TO cloud, public;
```

Puis coller le contenu de `backend/db/schema.sql`.

Ensuite :

```sql
CREATE SCHEMA IF NOT EXISTS gym;
SET search_path TO gym, public;
```

Puis coller le contenu de `gym-management/db/schema.sql`.

Important : si tu importes des donnees depuis tes bases locales `cloud` et `gym_db`, importe les tables `cloud` dans le schema Neon `cloud`, et les tables `gym_db` dans le schema Neon `gym`.

Pour les requetes manuelles dans Neon SQL Editor, les tables sont dans des schemas. Tu as deux options :

```sql
SELECT count(*) FROM gym.gym_members;
SELECT count(*) FROM cloud.utilisateurs;
```

Ou definir le schema de la session avant tes requetes :

```sql
SET search_path TO gym, public;
SELECT count(*) FROM gym_members;
```

Pour revenir au schema cloud :

```sql
SET search_path TO cloud, public;
SELECT count(*) FROM utilisateurs;
```

Les backends Render definissent leur `search_path` automatiquement avec `DATABASE_SCHEMA=cloud` et `GYM_DB_SCHEMA=gym`.

## 2. Render Backend Principal

Creer un Web Service Render depuis GitHub.

Parametres :

- Root Directory : `EDC_App/backend`
- Runtime : Node
- Build Command : `npm ci --omit=dev`
- Start Command : `npm start`
- Health Check Path : `/api/health`

Variables d'environnement :

```text
NODE_ENV=production
PORT=10000
DATABASE_URL=<NEON_DATABASE_URL>
DATABASE_SSL=true
DATABASE_SCHEMA=cloud
JWT_SECRET=<long-secret-random>
JWT_EXPIRES_IN=12h
MINIO_ENDPOINT=<oracle-vps-domain-or-ip>
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=<minio-user>
MINIO_SECRET_KEY=<minio-password>
MINIO_BUCKET=edc-documents
CORS_ORIGIN=<VERCEL_FRONTEND_URL>
```

## 3. Render Gym Management

Creer un deuxieme Web Service Render depuis GitHub.

Parametres :

- Root Directory : `EDC_App/gym-management`
- Runtime : Node
- Build Command : `npm ci --omit=dev`
- Start Command : `npm start`
- Health Check Path : `/health`

Variables d'environnement :

```text
NODE_ENV=production
PORT=10000
GYM_PORT=10000
DATABASE_URL=<NEON_DATABASE_URL>
DATABASE_SSL=true
GYM_DB_SCHEMA=gym
JWT_SECRET=<same-secret-as-backend>
CORS_ORIGIN=<VERCEL_FRONTEND_URL>
MINIO_ENDPOINT=<oracle-vps-domain-or-ip>
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=<minio-user>
MINIO_SECRET_KEY=<minio-password>
MINIO_BUCKET=edc-documents
GYM_DEFAULT_TENANT_CODE=ENT001
GROQ_API_KEY=<optional-groq-key>
```

## 4. Vercel Frontend

Creer un projet Vercel depuis GitHub.

Parametres :

- Root Directory : `EDC_App/frontend`
- Framework Preset : Vite
- Build Command : `npm run build`
- Output Directory : `dist`

Variables d'environnement :

```text
VITE_API_BASE_URL=<RENDER_BACKEND_URL>
VITE_GYM_API_BASE_URL=<RENDER_GYM_URL>/api/v1/gym
```

Exemples :

```text
VITE_API_BASE_URL=https://edc-backend.onrender.com
VITE_GYM_API_BASE_URL=https://edc-gym-management.onrender.com/api/v1/gym
```

## 5. Ordre recommande

1. Creer Neon et les schemas.
2. Importer les donnees locales vers Neon.
3. Deployer MinIO sur Oracle Cloud VPS.
4. Deployer `backend` sur Render.
5. Deployer `gym-management` sur Render.
6. Deployer `frontend` sur Vercel.
7. Revenir dans Render et mettre `CORS_ORIGIN` avec l'URL finale Vercel.
8. Redployer les deux backends Render.
