This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Backend de ProChord: Supabase

El frontend usa Supabase Auth para el login, las tablas `canciones` y `setlist` para
los datos y la función `guardar_setlist` para guardar el orden de manera atómica.
`lib/api.js` conserva el contrato de las vistas y delega las operaciones a `lib/supabase/api.js`.
Las rutas `/api/...` de las llamadas son identificadores del adaptador; ya no se envían a Flask.

Configura estas variables en `.env.local` y en el alojamiento del frontend:

```text
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_clave_publishable
```

Reinicia `npm run dev` después de cambiarlas. En producción vuelve a compilar y desplegar:
Next.js incorpora estas variables públicas durante la compilación. `.env.local` está ignorado
por Git. La contraseña de base de datos y las claves secret/service_role no se usan en el navegador.

`proxy.js` verifica la sesión de Supabase y el permiso de administrador al entrar a `/admin`.
Los permisos efectivos de datos se aplican mediante RLS en Supabase. La cookie manual
`auth_session` y `ADMIN_USER_IDS` de Flask ya no controlan el frontend.

Consulta [supabase/README.md](supabase/README.md) para las tablas, usuarios y configuración.

## Agregar y proyectar canciones

En el administrador, abre **Gestor de Canciones → Nueva Canción**. Introduce el título,
un tono americano (`C`, `Bb`, `F#m`), el BPM opcional como entero positivo, el compás
y el estilo. El formulario muestra errores por campo y permite previsualizar ambas vistas.

Escribe la letra con los acordes entre corchetes, en el punto donde cambia la armonía:

```text
[ESTROFA 1]
[C]Hoy cantamos con [G/B]alegría
[Am]Una voz se une al [F]cantar

[CORO]
[Bb]Una nueva canción [F]sonará
```

Cada encabezado inicia una sección completa. Las líneas vacías dentro de una sección no la dividen; sin encabezados, separan bloques. El parser compartido conserva
la letra, reconoce los acordes y excluye los encabezados de la proyección. Las filas
instrumentales pueden escribirse como `[C] [G] [Am] [F]`. Para canciones antiguas,
también reconoce filas de dos o más acordes sin corchetes.

Guardar incorpora la canción al catálogo. Después agrégala en **Diseñador de Setlist**,
ordena las canciones y guarda el setlist. Actualiza las vistas de músico y proyector
para cargar los cambios. En músico puedes transportar el tono y ocultar los acordes.

Desde el proyector, usa **Abrir pantalla en vivo** y selecciona un bloque o **Limpiar Pantalla**.
La comunicación usa `BroadcastChannel` entre pestañas del mismo navegador y origen;
no sincroniza dispositivos diferentes. Cada sección conserva sus repeticiones y se proyecta completa; el tamaño de letra se adapta al espacio disponible. Las secciones instrumentales permiten dejar la pantalla en negro. La pantalla nueva solicita el último texto al panel.

Las operaciones se realizan con el SDK de Supabase y la sesión del usuario.
Las políticas RLS permiten leer el setlist público y reservan la gestión del catálogo
para los usuarios registrados en `administradores`. El frontend no registra contraseñas.

Verificación local: `npm test`, `npm run lint` y `npm run build`. Las pruebas automatizadas
usan clientes simulados y no modifican Supabase. La carpeta `api/` conserva la implementación
anterior de Flask como referencia; la aplicación migrada no hace peticiones a Render.
Los datos antiguos de MySQL no se copian automáticamente.

## Seguridad de dependencias

Ejecuta `npm audit` antes de desplegar y después de actualizar dependencias.
Next.js y `eslint-config-next` se mantienen en la misma versión; evita usar
`npm audit fix --force`, porque puede recomendar bajar ESLint a una versión incompatible.
Comprueba los cambios con `npm test`, `npm run lint` y `npm run build`.

La alerta GHSA-vfj7-8cjw-p6xm de `braces` afecta a una dependencia de las
herramientas de ESLint y todavía no tiene versión corregida publicada. Evita ejecutar
estas herramientas sobre patrones proporcionados por terceros y revisa la alerta
cuando se publiquen actualizaciones. `npm audit --omit=dev` permite comprobar por
separado las dependencias de producción; no sustituye la auditoría completa.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
