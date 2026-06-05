# Dockerisation EDC App

## Prerequis

- Docker Desktop ouvert et en mode Linux containers.
- Depuis PowerShell, place-toi dans le dossier du projet :

```powershell
cd C:\Users\Aya\Desktop\EDC_App_Final\EDC_App
```

## Construire les images

```powershell
docker compose build backend gym-management frontend
```

## Lancer l'application locale avec Docker Compose

```powershell
docker compose up -d
```

## Verifier les services

```powershell
docker compose ps
docker compose logs -f backend
docker compose logs -f gym-management
docker compose logs -f frontend
```

URLs locales :

- Frontend : http://localhost
- Backend principal : http://localhost:5000/api/health
- Gym Management : http://localhost:5002/health
- MinIO API : http://localhost:9000
- MinIO Console : http://localhost:9001

Identifiants MinIO locaux :

- Username : `minioadmin`
- Password : `minioadmin`

## Arreter les conteneurs

```powershell
docker compose down
```

## Reinitialiser la database et MinIO locaux

Attention : cette commande supprime les volumes Docker locaux.

```powershell
docker compose down -v
```
