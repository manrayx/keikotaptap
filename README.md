# KEIKO TAP TAP · Juegos de MNRY

Plataforma de juegos de sátira política en pixel art de MNRY (mantarraya.pe), publicada en **keikotaptap.com**.

| Ruta | Juego |
|---|---|
| `/` | Portada: todos los juegos, ideas por Yape y encargos para marcas |
| `/ridiculo/` | ¡Ridículo Total! (El Canciller Ridi). Fuente editable fuera del repo: se genera con `build.py --web` |
| `/palafoto/` | Pala Foto |
| `/arcade/` | Keiko Arcade |
| `/pastora/` | Pastora Invaders |
| `/taptap/` | Keiko Tap Tap: En Live (el juego original) |

## Agregar un juego nuevo
1. Crea una carpeta con el nombre corto del juego (por ejemplo `/nuevojuego/`) con su `index.html`, `assets/` y `og.jpg` (1200 × 630).
2. En su `index.html`, usa `https://keikotaptap.com/nuevojuego/` en `og:url`, `og:image` y `shareUrl`, y el contador `window.goatcounter = { path: function () { return '/nuevojuego'; } }`.
3. Copia su `og.jpg` a `covers/nuevojuego.jpg` y agrega su tarjeta en el `index.html` de la portada (arriba de todo, con la etiqueta NUEVO).
4. Agrega la regla de caché de `/nuevojuego/assets/*` en `_headers`.

Estadísticas: GoatCounter (cuenta manrayx). Pastora Invaders mantiene su propio sitio en pastorainvaders.goatcounter.com.
