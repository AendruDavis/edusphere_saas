# SSH Deployment

This app deploys as a Node/Express server with a PostgreSQL database.

## Server Requirements

- Ubuntu server with SSH access
- Node.js 22 LTS or newer
- PostgreSQL
- Nginx
- PM2
- A domain pointed to the server IP

## 1. Install Server Packages

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib nginx git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. Create Production Database

```bash
sudo -u postgres psql
```

```sql
create database edusphere_saas;
create user edusphere_user with encrypted password 'CHANGE_ME_STRONG_PASSWORD';
grant all privileges on database edusphere_saas to edusphere_user;
\q
```

Then allow schema creation:

```bash
sudo -u postgres psql -d edusphere_saas
```

```sql
grant all on schema public to edusphere_user;
\q
```

## 3. Upload Or Clone The App

Recommended path:

```bash
sudo mkdir -p /var/www/edusphere_saas
sudo chown -R $USER:$USER /var/www/edusphere_saas
cd /var/www/edusphere_saas
git clone YOUR_REPO_URL .
```

If you are not using Git, upload the project folder with SCP/SFTP, excluding `node_modules`, `.env`, and `dist`.

## 4. Create Production Env

Create `/var/www/edusphere_saas/.env`:

```env
NODE_ENV="production"
PORT="3000"
DATABASE_URL="postgres://edusphere_user:CHANGE_ME_STRONG_PASSWORD@localhost:5432/edusphere_saas"
DATABASE_SSL="false"
JWT_SECRET="CHANGE_ME_LONG_RANDOM_SECRET"

ADMIN_EMAIL="admin@edusphere.com"
ADMIN_PASSWORD="CHANGE_ME_ADMIN_PASSWORD"
ADMIN_NAME="EduSphere Admin"

GEMINI_API_KEY=""
INTEGRATION_WEBHOOK_SECRET="CHANGE_ME_RANDOM_SECRET"
```

## 5. Build And Initialize

```bash
cd /var/www/edusphere_saas
npm ci
npm run build
npm run migrate:db
npm run seed:admin
```

## 6. Start With PM2

Edit `ecosystem.config.cjs` if your app path differs from `/var/www/edusphere_saas`.

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup`.

## 7. Configure Nginx

Create `/etc/nginx/sites-available/edusphere_saas`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/edusphere_saas /etc/nginx/sites-enabled/edusphere_saas
sudo nginx -t
sudo systemctl reload nginx
```

## 8. Add HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Updating Later

```bash
cd /var/www/edusphere_saas
git pull
npm ci
npm run build
npm run migrate:db
pm2 reload edusphere-saas
```
