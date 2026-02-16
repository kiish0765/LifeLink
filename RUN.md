# Run LifeLink (no Docker)

**.env** is already created with `JWT_SECRET` set.

## If you don't have PostgreSQL / MongoDB / Redis

1. Install **Docker Desktop** from https://www.docker.com/products/docker-desktop/
2. Open a terminal in `d:\projects\bloodbank` and run:
   ```powershell
   docker compose up -d postgres mongodb redis
   ```
3. Wait ~30 seconds, then continue below.

## If you have PostgreSQL already

Create the database and user, then load the schema:

```sql
CREATE USER lifelink WITH PASSWORD 'lifelink_secret';
CREATE DATABASE lifelink OWNER lifelink;
```

Then run (from project root):

```powershell
psql -U postgres -d lifelink -f backend/src/db/init.sql
```

Or use pgAdmin to run `backend/src/db/init.sql` on database `lifelink`.

MongoDB and Redis must also be running (or use Docker for all three).
MONGODB_URI=mongodb+srv://kishoredhayanithi620_db_user:<lifelink_secret>@bloodbank.9pk557a.mongodb.net/?appName=Bloodbank

REDIS_URL=redis://default:WwbpOj1on8JFLuddAoxP4rEaB5LaM9fR@redis-17348.crce219.us-east-1-4.ec2.cloud.redislabs.com:17348
```

## Seed admin user (after DBs are ready)

```powershell
cd backend
npx tsx src/db/seed.ts
```

Login: **admin@lifelink.app** / **Admin@123**

## Start the site

**Terminal 1 – Backend**

```powershell
cd d:\projects\bloodbank\backend
npm run dev
```

**Terminal 2 – Frontend**

```powershell
cd d:\projects\bloodbank\frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.
