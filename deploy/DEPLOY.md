# Publicar el dashboard en Contabo (Docker + login Supabase)

Corre en el **mismo VPS que n8n**, en un contenedor, detrás del mismo reverse proxy.

## 0) Requisitos
- Ya tenés Docker + docker-compose en el server (lo usás para n8n).
- Un **subdominio** apuntando al server, ej. `dashboard.tudominio.com` (registro DNS A → IP del VPS).
- Tu reverse proxy (Traefik/nginx) ya maneja el SSL de n8n → reusamos eso.

## 1) Subir el código al server
```bash
# en el VPS, junto a tu proyecto de n8n
git clone <tu-repo> sac        # o scp -r la carpeta sac/ al server
# queda: /ruta/sac/dashboard  con el Dockerfile
```

## 2) Variables de entorno (NO al repo)
Creá un `.env` junto a tu docker-compose con:
```
NEXT_PUBLIC_SUPABASE_URL=https://exgcnhoqkbjljvandhgq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu anon key>
SUPABASE_SERVICE_ROLE_KEY=<tu service role key — SECRETA>
```
(Los mismos valores que tenés en `sac/dashboard/.env.local` local.)

## 3) Agregar el servicio a tu compose
Tomá `deploy/docker-compose.dashboard.yml` y:
- Ajustá `context:` a la ruta real del proyecto en el server.
- Poné la **misma red** que usa tu proxy (`networks:`).
- Si usás **Traefik**: descomentá los `labels` y poné tu `Host(...)` y `certresolver`.
- Si usás **nginx**: dejalo sin labels y agregá el `server {}` del paso 5.

## 4) Build + levantar
```bash
docker compose up -d --build dashboard
docker compose logs -f dashboard      # ver que arranque en :3000
```

## 5) (Solo si usás nginx en vez de Traefik) bloque del proxy
```nginx
server {
    server_name dashboard.tudominio.com;
    location / {
        proxy_pass http://sac-dashboard:3000;   # nombre del contenedor
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    # SSL: usá certbot igual que con n8n
}
```

## 6) Crear los usuarios del login
El middleware ahora exige sesión. Creá los usuarios del equipo, cualquiera de estas 2:

**Opción A — Supabase Dashboard (fácil):**
Authentication → Users → *Add user* → email + contraseña, uno por persona (Karla, Bruno, Martin, Carlos).

**Opción B — script (con la service role key):**
```bash
cd sac/dashboard/deploy
SUPABASE_URL=https://exgcnhoqkbjljvandhgq.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service key> \
node crear-usuarios.mjs
```

## 7) Probar
Entrá a `https://dashboard.tudominio.com` → debe redirigir a **/login** → iniciás sesión → ves el dashboard.

## Actualizar después de cambios
```bash
git pull                                   # traer cambios
docker compose up -d --build dashboard     # rebuild + redeploy
```

---
### Notas
- El `.env.local` NO se copia a la imagen (está en `.dockerignore`); las envs van por compose.
- Las `NEXT_PUBLIC_*` se hornean en el build (por eso van como build-args) y también en runtime.
- La `SUPABASE_SERVICE_ROLE_KEY` solo vive en el server (runtime), nunca llega al navegador.
