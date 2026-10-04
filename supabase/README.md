# Crear las tablas de ProChord en Supabase

1. Crea un proyecto de Supabase.
2. Abre **SQL Editor → New query**.
3. Copia el contenido completo de `migrations/001_initial_schema.sql` y pulsa **Run**.
   Es un esquema inicial para un proyecto nuevo y se ejecuta una sola vez.
4. En **Authentication → Users**, crea el usuario administrador con correo y contraseña.
5. Copia su UUID y ejecuta en el SQL Editor:

```sql
insert into public.administradores (user_id)
values ('REEMPLAZA_CON_EL_UUID_DEL_USUARIO');
```

El UUID debe pertenecer a `auth.users`; no es el ID numérico de MySQL ni el correo.
Las contraseñas y sesiones las administra Supabase Auth. No crees una tabla pública
`usuarios` ni copies los hashes de Werkzeug a estas tablas. Para empezar, crea la cuenta
administradora con una contraseña nueva; la migración de otros usuarios se planifica aparte.

## Corregir el guardado en un proyecto existente

Si al guardar aparece `DELETE requires a WHERE clause`, abre **SQL Editor → New query**,
copia el contenido completo de `migrations/002_fix_guardar_setlist.sql` y pulsa **Run**.
El resultado esperado es `Success. No rows returned`. No vuelvas a ejecutar el esquema
inicial sobre las tablas existentes.

Esta migración actualiza `guardar_setlist` para borrar con el filtro `where orden > 0`.
Todas las posiciones cumplen esa condición por la restricción de la tabla. Conserva
los permisos, las validaciones y la sustitución atómica; aplicarla no modifica canciones
ni el setlist actual. Después guarda de nuevo desde el dashboard y recarga las vistas
de músico y proyector para comprobar las canciones y su orden.

## Estructura

| Tabla | Campos | Propósito |
| --- | --- | --- |
| `canciones` | `id`, `titulo`, `tono_base`, `bpm`, `compas`, `estilo`, `letra_acordes`, `created_at`, `updated_at` | Catálogo y texto original, incluidos acordes y secciones. |
| `setlist` | `orden`, `cancion_id` | Orden actual de las canciones para músico y proyector. |
| `administradores` | `user_id`, `created_at` | Usuarios de Auth con permisos para gestionar canciones y setlist. |
| `auth.users` | Gestionada por Supabase | Usuarios y autenticación. |

Los IDs de canciones siguen siendo enteros para conservar las relaciones del frontend.
El esquema mantiene un solo setlist, como la aplicación actual. Eliminar una canción
elimina también su referencia en el setlist. `updated_at` se actualiza automáticamente.

## Permisos

- Sin login se puede leer el setlist y las canciones que contiene.
- Los administradores pueden consultar todo el catálogo, crear, editar y eliminar canciones.
- Los usuarios autenticados no pueden otorgarse permisos de administrador.
- El cliente guarda el setlist mediante `guardar_setlist`, no mediante borrados e inserciones separados.
  La función comprueba permisos, canciones inexistentes y duplicados antes de reemplazarlo.
  Un array vacío limpia el setlist.

Ejemplo para la futura integración del frontend:

```js
await supabase.rpc('guardar_setlist', { canciones_ids: [3, 1, 2] });
```

## Conectar el frontend

La integración está implementada con `@supabase/supabase-js` y `@supabase/ssr`.
Configura en `.env.local` las variables `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con la URL y clave pública de tu proyecto.
Luego reinicia `npm run dev`. Para desplegar el frontend, configura esas mismas variables
antes de compilar en su proveedor de alojamiento.

Inicia sesión con el correo y contraseña de la cuenta que creaste en **Authentication → Users**.
El usuario debe tener una fila en `public.administradores`. Si aparece **Email not confirmed**,
confirma la cuenta desde Supabase. No se necesita `SECRET_KEY`, `FRONTEND_ORIGINS` ni
`ADMIN_USER_IDS` de Flask para esta integración.

Las pruebas locales no usan credenciales reales: ejecuta `npm test`, `npm run lint`
y `npm run build`. Para el ensayo en tu proyecto, inicia sesión, crea una canción,
agrégala al setlist, guarda, comprueba músico/proyector y cierra sesión.

La conexión del frontend no copia los datos de MySQL. Para trasladarlos, revisaremos
su esquema y exportación antes de importarlos. Si conservamos IDs existentes, habrá
que ajustar la secuencia de `canciones.id` después de importar.

Referencia: [integración de Supabase con Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).
