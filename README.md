# Flywheel

Application web de suivi d'entretien véhicule en marque blanche, destinée aux contrats LOA/LLD.

## Stack

| Couche | Technologie |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| Backend | NestJS + TypeScript |
| Base de données | PostgreSQL + Prisma ORM |
| Icônes | lucide-react |

## Prérequis

- Node.js ≥ 18
- PostgreSQL (local ou via Docker)

## Installation

```bash
# Cloner le projet
git clone <repo-url> && cd flywheel

# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

## Configuration

### Backend

```bash
cd backend
cp .env.example .env
# Éditer .env avec vos informations PostgreSQL
```

Exemple de `.env` :
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/flywheel_dev"
JWT_SECRET="change-me-in-production"
PORT=3000
```

### Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL pointe par défaut vers http://localhost:3000
```

## Lancement en développement

Ouvrir **deux terminaux** :

**Terminal 1 — Backend :**
```bash
cd backend
npm run start:dev
# Le backend tourne sur http://localhost:3000
```

**Terminal 2 — Frontend :**
```bash
cd frontend
npm run dev
# Le frontend tourne sur http://localhost:5173
```

## Base de données

```bash
cd backend

# Créer et appliquer la migration initiale
npx prisma migrate dev --name init

# Ouvrir Prisma Studio (interface visuelle)
npx prisma studio
```

## Acteurs de l'application

| Rôle | Description |
|---|---|
| `DRIVER` | Automobiliste — suit son entretien, stocke ses factures |
| `DEALER` | Concessionnaire — gère les interventions en atelier |
| `BRAND` | Constructeur — accès au tableau de bord global |

## Marque blanche

Les couleurs sont pilotées via des variables CSS dans [`frontend/src/index.css`](frontend/src/index.css).
Pour changer le thème d'un constructeur, surcharger les variables `--color-primary` et `--color-secondary`
via JavaScript ou un fichier de thème dédié.
