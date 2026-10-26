# KEIKO TAP TAP — ¡No me interrumpan, estoy en LIVE!

Videojuego web de sátira política en 8 bits. HTML5 + Canvas + Web Audio, sin backend, sin registro. Arte de personajes y fondos: MNRY.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | El juego completo (código, reglas y audio en un solo archivo). |
| `assets/` | Sprites recortados de tu hoja, fondos y fuentes pixeladas (licencia OFL, incluidas). |
| `og.png` | Imagen de vista previa para WhatsApp, Facebook y X (1200 × 630). |
| `herramientas/extract.py` | Vuelve a recortar los sprites si cambias la hoja (`sheet.png`). |
| `herramientas/sim.js` | Simulador de balance: juega cientos de partidas con bots. |

## Publicarlo en Render (igual que dondekeiko)

1. Crea un repo nuevo en GitHub (por ejemplo `manrayx/keikotaptap`) y sube el contenido de esta carpeta a la raíz.
2. En Render: **New → Static Site**, conecta el repo.
   - Build command: *(vacío)*
   - Publish directory: `.`
3. Cuando tengas la URL final (por ejemplo `https://keikotaptap.onrender.com`), edita dos cosas en `index.html`:
   - En el bloque `<script type="application/json" id="cfg">`, pon la URL en `"shareUrl"`. Así el botón COMPARTIR incluye el enlace.
   - En `<meta property="og:image" content="og.png">`, cambia `og.png` por la URL completa (`https://…/og.png`). WhatsApp necesita la URL absoluta para mostrar la imagen.

También funciona en GitHub Pages, Netlify o cualquier hosting estático.

## Ajustar la dificultad sin tocar código

Todas las reglas viven en el bloque `cfg` dentro de `index.html`: tiempos de cada interrupción, puntos de pendientes, multiplicadores, fases e intervalos. Cambia los números y recarga.

Para comprobar el efecto antes de publicar:

```
node herramientas/sim.js
```

Resultados con la configuración actual (400 partidas por bot, mediana):

| Estrategia del bot | Duración | Likes | Cómo termina |
|---|---|---|---|
| Siempre sigue en live | ~83 s | ~1150 | Se cae el gobierno (100 %) |
| Siempre gobierna | ~124 s | ~780 | Se acaba el live (100 %) |
| Gobierna solo en crisis (≥ 75) | ~122 s | ~1150 | Mezcla de ambos finales |

Ninguna estrategia domina: ignorar todo da el chiste ("se cayó el gobierno") rápido; gobernar todo vacía la audiencia. Ese es el conflicto central del GDD funcionando en los números.

## Decisiones tomadas sobre el GDD

- **Derrota por audiencia alcanzable.** Las pérdidas porcentuales nunca llegaban a cero. Ahora, sin taps durante 5 s, la audiencia cae 2 por segundo más un porcentaje que sube por fase. Gobernar (que pausa el live) cuesta espectadores de verdad.
- **Fase 4 escala.** Desde el segundo 75 los pendientes automáticos se aceleran y las interrupciones llegan cada vez más rápido. Así las partidas duran 1–2 minutos.
- **Bloqueo anti-taps accidentales.** Cada ventana ignora los toques durante 0,35 s al aparecer.
- **Pistas la primera vez.** Cada interrupción muestra una indicación breve ("DESLÍZALO", "TOCA 3 VECES LA X") solo la primera vez por sesión.
- **Tiempo límite en las decisiones.** Si no eliges en la llamada del Congreso, la emergencia o el asesor, cuenta como ignorada.
- **Documentos.** Arrástralos a DESPUÉS (+5) o a FIRMAR (−8, Keiko deja de transmitir 2 s por documento).
- **Extras:** "+ Seguir" da +10 espectadores una vez; el comentario "¡Póngase el sombrero!" hace que Keiko se lo ponga; tecla espacio = tap en computadora; pausa automática al cambiar de pestaña.

## Controles

- Celular: tocar, deslizar, mantener presionado, arrastrar.
- Computadora: clic; ESC pausa; espacio también hace tap.

---
Videojuego de sátira política. Obra ficticia no afiliada a ninguna persona, partido político o plataforma.
