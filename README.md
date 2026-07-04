# telegram-servarr-bot

Bot de Telegram para manejar **Radarr** (películas) y **Sonarr** (series) desde el chat: busca, agrega con perfil de calidad y carpeta, revisa la biblioteca y el calendario de estrenos. Interfaz en español con botones inline.

Reescritura moderna (Node 22+, ESM, [grammY](https://grammy.dev)) inspirada en [itsmegb/telegram-radarr-bot](https://github.com/itsmegb/telegram-radarr-bot) (MIT), que usaba APIs ya retiradas. Este bot usa la API `/api/v3`, la vigente en ambas apps (ojo: el número de la API no coincide con el de la app) — compatible con Radarr v3 en adelante (probado con v6.x) y Sonarr v3/v4 (probado con v4.x).

## Comandos

| Comando | Descripción |
|---|---|
| `/movie <nombre>` (alias `/q`, `/query`) | Buscar y agregar una película a Radarr: elegir resultado → perfil de calidad → carpeta (se salta si hay una sola) → ¿descargar ya? |
| `/serie <nombre>` | Igual para Sonarr, con paso extra: qué temporadas monitorear (todas / futuras / primera / última) |
| `/library [filtro]` | Biblioteca combinada 🎬 + 📺, con filtro opcional (texto o regex) |
| `/upcoming [días]` | Calendario combinado de estrenos y episodios (default 30 días) |
| `/clear` | Cancelar el wizard en curso |
| `/auth <contraseña>` | Pedir acceso al bot |
| `/help`, `/start` | Ayuda |

**Solo admin** (el `owner` de la config): `/rss` (RSS sync en ambos), `/wanted` (buscar faltantes), `/refresh` (refrescar bibliotecas), `/users`, `/revoke`, `/unrevoke` (gestión de usuarios con botones), `/cid` (ID del chat).

## Requisitos

- Un bot de Telegram: créalo con [@BotFather](https://t.me/BotFather) y guarda el token.
- Radarr (v3 o superior, incluida v6) y/o Sonarr (v3/v4) accesibles por red, con sus API keys (Settings → General → Security → API Key). Sonarr es opcional: sin él, el bot funciona solo con películas.
- Tu ID numérico de Telegram para ser admin (pídeselo a [@userinfobot](https://t.me/userinfobot)).
- Docker (recomendado) o Node.js 22+.

## Configuración

Crea `config/config.json` a partir del ejemplo:

```bash
cp config/config.example.json config/config.json
```

```jsonc
{
    "telegram": { "botToken": "123456:ABC..." },   // token de BotFather
    "bot": {
        "password": "elige-una-contraseña",        // la que se usa con /auth
        "owner": 123456789,                        // tu ID numérico (admin)
        "maxResults": 10                           // resultados máx. por búsqueda
    },
    "radarr": {
        "hostname": "192.168.1.10",
        "apiKey": "API_KEY_DE_RADARR",
        "port": 7878
    },
    "sonarr": {                                    // opcional: bórralo si no usas Sonarr
        "hostname": "192.168.1.10",
        "apiKey": "API_KEY_DE_SONARR",
        "port": 8989
    }
}
```

Campos opcionales por servicio: `ssl` (bool) y `urlBase` (p. ej. `"/radarr"` si está detrás de un proxy con subruta).

Crea también `config/acl.json` con la lista de usuarios vacía:

```bash
echo '{"allowedUsers":[],"revokedUsers":[]}' > config/acl.json
```

`config/config.json` y `config/acl.json` están en `.gitignore`: tus tokens nunca se versionan.

## Ejecutar

**Con Docker (recomendado):**

```bash
docker compose up -d --build
docker logs -f telegram-radarr-bot   # debe decir: Bot iniciando… sonarr: true|false
```

**Sin Docker:**

```bash
npm install
npm start
```

## Primer uso

1. Escríbele al bot en Telegram: `/auth <la contraseña de config.json>`.
2. El primer usuario autorizado queda en `config/acl.json`; el `owner` ve además los comandos admin en `/help`.
3. Prueba `/movie dune` y sigue los botones.

## Desarrollo

```bash
npm test        # node:test, sin frameworks
```

| Archivo | Responsabilidad |
|---|---|
| `src/bot.js` | Entrada: auth/ACL, registro de comandos y conversaciones |
| `src/api.js` | Cliente REST mínimo para Radarr/Sonarr (`fetch` → `/api/v3`) |
| `src/movie.js` / `src/serie.js` | Wizards de agregado (conversaciones grammY) |
| `src/wizard.js` | Helpers de selección con inline keyboards (`pick`, `yesNo`) |
| `src/library.js` | Biblioteca, calendario y comandos combinados (funciones puras) |
| `src/payloads.js` | Payloads de alta para Radarr/Sonarr v3 |
| `src/admin.js` | Gestión de usuarios (revocar/restaurar) |
| `src/acl.js` | Persistencia de la lista de acceso (`config/acl.json`) |
| `src/config.js` / `src/strings.js` | Carga de config y todos los textos (es) |

Dependencias: solo `grammy` y `@grammyjs/conversations`.

## Licencia

MIT
