# API para incorporar al repositorio prochord-api

Esta carpeta contiene una versión ampliada del código Flask compartido. Su creación
local no cambia el servicio desplegado en Render. Copia `app.py`, `requirements.txt`
y las pruebas al repositorio de la API y despliega allí.

## Rutas y permisos

| Ruta | Acceso |
| --- | --- |
| `GET /api/setlist` | Público, para músico y proyector. |
| `POST /api/auth/login` | Correo y contraseña; crea una sesión firmada para administradores. |
| `POST /api/auth/logout` | Borra la sesión del navegador. |
| `GET /api/canciones` | Administrador autenticado. |
| `POST /api/canciones` | Administrador autenticado. |
| `PUT /api/canciones/<id>` | Administrador autenticado. |
| `DELETE /api/canciones/<id>` | Administrador autenticado; elimina también su referencia en setlist. |
| `POST /api/setlist` | Administrador autenticado; reemplaza el orden en una transacción. |

`POST /api/setlist` recibe `{ "canciones_ids": [3, 1, 2] }`. Admite una lista vacía
para limpiar el setlist y rechaza IDs repetidos o inexistentes. El formulario envía
`titulo`, `tono_base`, `bpm` (entero positivo o null), `compas`, `estilo` y `letra_acordes`.

El código conserva las tablas que aparecen en la consulta original: `usuarios`,
`canciones` y `setlist`. No ejecuta migraciones ni crea tablas. Para comprobarlo contra
tu base real, hacen falta sus `SHOW CREATE TABLE`. Asume que `canciones.id` es autoincremental,
que los campos obligatorios adicionales tienen valores predeterminados y que las tablas
usan InnoDB para transacciones. Los IDs y BPM se limitan a enteros positivos de 32 bits.

## Variables en Render

Configura las siguientes variables en el servicio de la API, sin guardarlas en Git:

| Variable | Valor |
| --- | --- |
| `DB_HOST` | Host actual de MySQL. |
| `DB_USER` | Usuario de MySQL. |
| `DB_PASSWORD` | Contraseña real de MySQL. |
| `DB_NAME` | Base de datos actual. |
| `DB_PORT` | `3306`, salvo que tu proveedor indique otro. |
| `SECRET_KEY` | Valor aleatorio estable de al menos 32 caracteres. |
| `ADMIN_USER_IDS` | IDs autorizados de la tabla usuarios, separados por comas. |
| `FRONTEND_ORIGINS` | Orígenes exactos del frontend, separados por comas y sin barra final. |
| `SESSION_COOKIE_SECURE` | `true` en Render. |

Por ejemplo, `FRONTEND_ORIGINS=http://localhost:3000,https://tu-frontend.example`.
No uses `*`: las escrituras comprueban el encabezado `Origin`, además de la sesión.
Los clientes fuera del navegador también deben enviar un origen autorizado.

Puedes generar una clave en tu equipo con `python -c "import secrets; print(secrets.token_hex(32))"`.
Conserva el mismo valor al reiniciar Render; cambiarlo invalida las sesiones existentes.
No se deduce un rol de administrador de una columna desconocida: debes indicar
explícitamente cuáles usuarios están autorizados mediante `ADMIN_USER_IDS`.

Si `app.py` está en la raíz del repositorio de la API:

- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn --workers 2 --bind 0.0.0.0:$PORT 'app:create_app()'`

Estos comandos se configuran en el panel del servicio de Render. El comando Gunicorn
usa Linux y la variable `PORT` del servicio; no se ejecuta en PowerShell de Windows.
Gunicorn no es compatible con Windows nativo y allí puede fallar con `No module named 'fcntl'`.

El nuevo archivo usa una fábrica de aplicación; reemplaza el antiguo comando `app:app`.
El pool se inicia cuando llega la primera petición que necesita MySQL y reutiliza sus conexiones.

## Desarrollo y pruebas

Para ejecutar localmente, exporta las variables anteriores. Con frontend y API locales,
usa `SESSION_COOKIE_SECURE=false` y `FRONTEND_ORIGINS=http://localhost:3000`.
Desde esta carpeta ejecuta `python -m flask --app app:create_app run --port 5000` y configura
`NEXT_PUBLIC_API_URL=http://localhost:5000` en el frontend.

En PowerShell, configura las variables en la terminal local con `$env:NOMBRE="valor"`.
Las variables guardadas en Render no se transfieren a tu computadora. Cuando estén
configuradas, desde la carpeta que contiene `app.py` ejecuta:

```powershell
python -m flask --app "app:create_app()" run --port 5000
```

Si vas a usar exclusivamente la API de Render, configura allí el Start command y vuelve
a desplegar; no necesitas iniciar Flask ni Gunicorn localmente. El frontend puede seguir
ejecutándose con `npm run dev` y usar la URL de Render predeterminada.

Las pruebas no necesitan credenciales ni conectan a MySQL: usan conexiones simuladas.
Desde la raíz de este proyecto: `python -m unittest discover -s api/tests -v`.
En el repositorio de la API, con `app.py` en la raíz: `python -m unittest discover -s tests -v`.
Después del despliegue, vuelve a iniciar sesión antes de probar el catálogo y las escrituras:
el login anterior no creaba una sesión de backend.

Las cookies se configuran con HttpOnly, Secure y SameSite=None en Render. Un navegador
que bloquee cookies de terceros puede impedir sesiones entre dominios distintos; en ese
caso se necesita servir frontend y API bajo el mismo sitio o añadir un proxy del frontend.

Referencias: [sesiones de Flask](https://flask.palletsprojects.com/en/stable/api/#sessions),
[configuración de Flask-CORS](https://flask-cors.readthedocs.io/en/latest/api.html) y
[transacciones de MySQL Connector/Python](https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlconnection-start-transaction.html).
