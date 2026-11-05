# rotaryline.es: apuntar el dominio a GitHub Pages y el correo (IONOS)

Estos pasos solo se hacen cuando la web esté lista para publicarse. Antes, no hace falta tocar nada.

## 1. La web en GitHub (lo hago yo cuando des la orden)
1. Creo el repositorio público de la web.
2. Activo Pages desde la carpeta `docs/` y pongo `rotaryline.es` como dominio propio. El archivo `CNAME` ya está preparado.

## 2. Verificar el dominio en GitHub (5 minutos)
Sirve para que ninguna otra cuenta de GitHub pueda colgar una web en tu dominio.

1. **En GitHub:** foto de perfil → **Settings** → **Pages** → **Add a domain** → escribe `rotaryline.es`. GitHub te da un registro **TXT**: un nombre del tipo `_github-pages-challenge-0megamer9999` y un valor.
2. **En IONOS:**
   1. Entra en **Dominios y SSL** → `rotaryline.es` → **DNS** → **Añadir registro** → **TXT**.
   2. Pega el nombre y el valor que te da GitHub, y guarda.
3. **De vuelta en GitHub:** pulsa **Verify**. Puede tardar un rato mientras se propagan las DNS.
4. **Ese registro TXT no se borra nunca.**

## 3. Apuntar el dominio a GitHub (en IONOS, DNS)
1. Añade cuatro registros **A** para `@` (el dominio sin nada delante):
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
2. Añade un registro **CNAME** para `www` que apunte a `0megamer9999.github.io`.
3. Si IONOS tiene puestos registros A o AAAA por defecto en `@` o en `www` (su página de «aparcamiento»), bórralos. Si no, chocan con los de GitHub.
4. **No crees nunca un registro comodín (`*`)**: es la vía típica para que alguien se apropie del dominio.
5. **Cuando ya funcione, activa «Enforce HTTPS»** en GitHub, en Settings → Pages del repositorio.

## 4. El correo con tu dominio
- **Para empezar, lo más sencillo es una dirección de reenvío**, por ejemplo `contacto@rotaryline.es`. No tiene buzón propio: lo que llega se reenvía a tu Gmail.
  - IONOS tiene esta función en el apartado **Correo**. No he podido confirmar si tu contrato de solo dominio la incluye gratis: mira en el panel si en **Correo** te deja crear un reenvío sin coste.
- **Contestar desde esa dirección** (que te vean escribir desde `contacto@rotaryline.es`) ya necesita un buzón de verdad. Puede ser un plan de correo de IONOS o de otro proveedor. Lo miramos cuando haga falta.
- **Si creas el reenvío,** IONOS te pone solos los registros MX en las DNS. No hay que tocarlos a mano.
- **Si algún día el programa usa ese correo** para los informes, se cambia en una línea.

Fuentes: documentación de GitHub Pages sobre dominios propios y verificación (docs.github.com, «Managing a custom domain» y «Verifying your custom domain»), y la ayuda de IONOS sobre direcciones de reenvío.
