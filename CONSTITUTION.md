# Run4Travel — Spec-Driven Development Constitution

## Design System: Batlló

### Product Vision

**Run4Travel** es una app móvil que combina **Free Walking Tours × Strava × Runna** para que viajeros descubran ciudades mientras corren.

El usuario selecciona una ciudad, punto de partida y distancia —**5K, 10K, 15K, 21K o 42K**— y la IA crea una ruta optimizada que conecta monumentos, arquitectura, parques, barrios, miradores y lugares culturalmente relevantes.

Run4Travel combina **running, travel, storytelling, fotografía y comunidad** en una sola experiencia.

> **Run the city. Hear its story. Capture the journey.**

---

# 1. Core Experience

Run4Travel no debe convertirse simplemente en otro fitness tracker.

Su propuesta de valor es:

**RUNNING × TRAVEL × AI STORYTELLING × PHOTOGRAPHY × COMMUNITY**

Cada feature debe responder:

> **¿Ayuda al usuario a descubrir, experimentar o recordar una ciudad mientras corre?**

El flujo principal será:

**Choose City → Choose Distance → Generate Route → Run → Story → Photo Spot → Run → Story → Photo Spot → Finish → AI Album → Customize → Share**

---

# 2. AI Route Generation

El usuario selecciona:

* Ciudad
* Punto de partida
* Distancia
* Estilo de ruta

Distancias:

**5K · 10K · 15K · 21K · 42K**

Estilos posibles:

**Highlights · Historic · Scenic · Parks · Architecture · Hidden Gems · Waterfront**

La ruta debe optimizar:

* Running safety
* Distancia
* Calidad del recorrido
* Lugares culturales
* Paisaje
* Densidad de Story Points
* Photo Spots

**Distance is a constraint. Experience is the objective.**

Los LLM pueden seleccionar, ordenar y explicar lugares, pero nunca inventar geometría, calles o rutas.

---

# 3. Story Points

La ruta contiene **Story Points** asociados a lugares relevantes.

Cada Story Point incluye:

* Nombre
* Coordenadas
* Fotografía
* Categoría
* Descripción breve
* Historia
* Audio
* Duración
* Relevancia
* Photo Spot asociado cuando aplique

Antes de correr, el usuario puede explorar todos los lugares mediante un mapa interactivo y cards visuales.

---

# 4. Pace-Aware AI Storytelling

Durante la corrida, Run4Travel calcula:

* Posición
* Ritmo
* Velocidad
* Distancia al siguiente punto
* Tiempo estimado de llegada
* Duración de la narración

El sistema sincroniza automáticamente las historias con el movimiento.

Ejemplo:

**✦ Te acercas a Casa Batlló**

La narración puede comenzar antes de llegar para que el momento más relevante coincida con el paso frente al lugar.

Las historias podrán tener versiones:

**Quick · Standard · Deep**

seleccionadas dinámicamente según el ritmo del corredor.

---

# 5. Music & Spotify

La experiencia debe convivir naturalmente con la música.

Flujo:

**Music → Duck/Pause → AI Story → Resume Music**

Run4Travel se integrará con Spotify cuando sus APIs y permisos lo permitan.

La app nunca reproducirá o almacenará música de Spotify independientemente.

Las historias deben generarse y almacenarse siguiendo:

**Generate → Cache → Reuse**

para minimizar costos de LLM y Text-to-Speech.

---

# 6. Photo Spots

La fotografía es una parte central de la experiencia.

Durante la generación de ruta, Run4Travel identifica automáticamente los mejores **Photo Spots**.

Pueden incluir:

* Monumentos
* Miradores
* Arquitectura
* Street art
* Parques
* Calles icónicas
* Skylines
* Waterfronts
* Hidden gems

Al acercarse:

**📸 Photo Spot · Casa Batlló · 150 m**

La aplicación puede sugerir detenerse brevemente para tomar una fotografía.

Los prompts fotográficos nunca deben comprometer la seguridad del corredor.

Cada fotografía queda relacionada automáticamente con:

**Run + Location + Story Point + Time**

El usuario puede tomar la fotografía durante la carrera o seleccionar fotografías de su galería posteriormente.

---

# 7. AI Travel Album

Completar una carrera debe producir algo más que estadísticas.

Run4Travel genera automáticamente un:

# AI Travel Run Album

La IA selecciona las mejores fotografías y crea una narrativa visual combinando:

* Fotos
* Ruta
* Ciudad
* Distancia
* Ritmo
* Tiempo
* Lugares descubiertos
* Pequeñas historias
* Mapa
* Run4Travel graphics

El resultado debe sentirse como una pieza editorial premium de viaje, no como un reporte deportivo.

Ejemplo:

**Cover**

↓

**Barcelona · 10K**

↓

**Route Map**

↓

**Casa Batlló Photo**

↓

**Story**

↓

**Sagrada Família Photo**

↓

**Running Stats**

↓

**Final Photo**

↓

**10.2 KM · 51:04 · 5:00/km · 7 places discovered**

---

# 8. AI Album Editor

La IA entrega automáticamente una primera versión completamente editada y lista para compartir.

Sin embargo:

> **AI creates the first edit. The user owns the final story.**

El usuario debe poder manipular el álbum libremente:

* Reordenar cards
* Cambiar fotografías
* Crop
* Zoom
* Reposition
* Cambiar fondos
* Cambiar textos
* Ocultar estadísticas
* Cambiar colores
* Seleccionar layouts
* Eliminar cards
* Agregar cards
* Cambiar portada
* Seleccionar diferentes diseños

El editor debe sentirse simple, táctil y creativo.

Nunca como una herramienta profesional compleja.

---

# 9. Social Sharing

Run4Travel genera automáticamente contenido para:

**Instagram Stories — 9:16**

**Instagram Carousel — 4:5**

**Square Post — 1:1**

**Transparent Route Overlay**

El usuario debe poder exportar únicamente el mapa/ruta con fondo transparente para colocarlo sobre cualquier fotografía.

Compartir debe ser una función central del producto y un mecanismo natural de crecimiento.

---

# 10. Running Tracking

Run4Travel registra como mínimo:

* GPS route
* Distance
* Duration
* Moving time
* Current pace
* Average pace
* Speed
* Kilometer splits
* Elevation

El producto no busca inicialmente reemplazar Garmin, Strava o Runna.

El tracking soporta la experiencia de descubrimiento.

---

# 11. Integrations

La arquitectura debe permitir integración con:

* Strava
* Runna
* Spotify
* Apple HealthKit
* Android Health Connect

Futuro:

* Garmin
* COROS
* Polar

Run4Travel debe poder enviar actividades completadas a plataformas externas cuando sus APIs lo permitan.

---

# 12. Traveler Run Clubs

Run4Travel permite conectar viajeros que quieren correr en la misma ciudad.

El usuario puede:

* Encontrar runners
* Crear una corrida
* Unirse a una corrida
* Seleccionar distancia
* Seleccionar ritmo
* Definir horario
* Definir punto de encuentro

Ejemplo:

**Barcelona Sunrise Run**

**Sunday · 07:00**

**8K · 5:15–5:45/km**

**6 travelers**

Los Run Clubs pueden ser espontáneos y desaparecer después del viaje.

---

# 13. Privacy & Safety

La ubicación precisa nunca debe ser pública por defecto.

La app diferencia:

* Ciudad actual
* Run planificado
* Meeting Point
* Ubicación GPS activa

Compartir ubicación activa requiere consentimiento explícito.

La seguridad siempre tiene prioridad sobre descubrimiento, fotografía o comunidad.

---

# 14. Offline First Running

Antes de comenzar una carrera, la app debe descargar:

* Route geometry
* Navigation
* Story Points
* Audio
* Información esencial
* Datos mínimos del mapa

Una pérdida de internet nunca debe destruir una corrida.

Si Spotify falla:

**Running continues.**

Si AI falla:

**Cached stories continue.**

Si Strava falla:

**Activity is saved and synchronized later.**

---

# 15. Batlló Design System

La interfaz debe combinar:

**Apple minimalism × Antoni Gaudí × Casa Batlló × Mediterranean energy**

No debe parecer una app deportiva convencional.

Debe sentirse:

**Premium · Organic · Artistic · Athletic · Mediterranean · Global**

## Palette

Background:

`#f6efe3`

Surface:

`#fff8ef`

Ink:

`#2b1d12`

Terracotta / Primary Action:

`#e2603c`

Sea Green:

`#2a9d8f`

Mosaic Yellow:

`#f3c33f`

Mediterranean Blue:

`#3d5a80`

Amber:

`#e8a63c`

Secondary Text:

`#8c6f52`

Borders:

`#ead9bd`

Los colores brillantes deben aparecer como acentos sobre superficies crema.

---

# 16. Typography

### Gabarito

Headings.

Weight:

**700–800**

Tracking:

`-0.02em`

### Instrument Sans

Body text and interface.

### JetBrains Mono

Technical labels, distances, pace, coordinates and placeholders.

Use Google Fonts.

---

# 17. Organic Geometry

Run4Travel evita rectángulos perfectos.

Cards usan radios asimétricos.

Example:

`border-radius: 44px 62px 48px 70px / 54px 44px 64px 48px`

Cada card debe tener ligeras variaciones.

Background blobs:

`border-radius: 58% 42% 55% 45% / 50% 60% 40% 50%`

Opacity:

`0.2–0.3`

Primary buttons:

`border-radius: 999px 999px 999px 22px`

El resultado debe sentirse orgánico pero controlado.

**Gaudí, not chaos.**

---

# 18. Batlló Textures

Las texturas deben crearse preferentemente con CSS.

### Ceramic Scales

Usar patrones `radial-gradient` sobre superficies de color.

### Background Dots

Puntos extremadamente sutiles utilizando Sea Green con baja opacidad.

### Trencadís

Pequeños mosaicos de aproximadamente 9–14px usando:

Terracotta · Sea Green · Yellow · Blue · Amber

Cada pieza debe tener pequeñas variaciones de rotación y border radius.

### Avatars & Medals

Blobs con `conic-gradient` multicolor y centro crema.

### Batlló Rooflines

Bordes ondulados inspirados en los tejados de Casa Batlló mediante patrones de semicírculos.

Las texturas son detalles.

Nunca deben competir con la información.

---

# 19. Core UI Components

## Home Hero

Gran tarjeta orgánica con:

**Buenos días, Marta**

**¿Qué ciudad corremos hoy?**

CTA:

**✦ Crear ruta con IA**

## Route Card

Mapa + distancia + lugares + dificultad + tiempo estimado.

CTA:

**Empezar a correr**

## Stats

Grid 2×2:

**Distance**

**Pace**

**Time**

**Places**

## Pace Chart

Barras por tramo utilizando:

Green → Yellow → Terracotta

según intensidad.

## Story Cards

Fotografía + landmark + historia breve + duración de audio.

## Album

Fondo principal:

`#2b1d12`

Fotografías dentro de marcos orgánicos.

Mosaicos y elementos mediterráneos como detalles.

## Tab Bar

4 elementos:

**Hoy · Explorar · Clubs · Perfil**

Utilizar glifos geométricos simples.

---

# 20. Copy Tone

El lenguaje debe ser:

* Cercano
* Optimista
* Aventurero
* Celebratorio
* Internacional

Ejemplos:

**¡Molt bé, Marta!**

**10K y media Barcelona descubierta.**

**Siguiente parada: Sagrada Família.**

**📸 Este merece una foto.**

**Te faltan 600 m para Casa Batlló.**

Las funciones impulsadas por IA pueden identificarse discretamente mediante:

**✦**

Nunca utilizar lenguaje técnico como:

“Generate using LLM.”

Usar:

**✦ Crear mi ruta**

La IA debe sentirse como magia, no como tecnología.

---

# 21. Golden Path

El Golden Path oficial de Run4Travel es:

**OPEN APP**

↓

**Choose City**

↓

**Choose Distance**

↓

**✦ Generate Discovery Run**

↓

**Preview Route + Story Points + Photo Spots**

↓

**START RUN**

↓

**Music**

↓

**Navigation**

↓

**AI Story**

↓

**📸 Photo Spot**

↓

**Music resumes**

↓

**Continue Running**

↓

**Story**

↓

**📸 Photo Spot**

↓

**FINISH**

↓

**Running Summary**

↓

**✦ AI generates Travel Album**

↓

**Preview Album**

↓

**Customize**

↓

**Share to Instagram / Social**

↓

**Sync to Strava**

El usuario debe pasar de:

> **“Corrí 10 kilómetros.”**

a:

> **“Esta es la historia de los 10 kilómetros en los que descubrí Barcelona.”**

---

# 22. Product North Star

La North Star Metric será:

# Completed Discovery Runs

Una Completed Discovery Run combina:

**Route completed + Story Points visited + City discovered + Memories captured**

Secondary metrics:

* Route generation rate
* Run start rate
* Completion rate
* Stories listened
* Photo Spots captured
* Album generation rate
* Album share rate
* Cities per user
* Run Club participation
* Strava sync rate

---

# 23. Spec-Driven Development Rule

Ninguna feature importante se implementa directamente desde una idea.

Cada feature requiere una spec que defina:

**Problem → User Story → Acceptance Criteria → UX Flow → Data → API → AI → Privacy → Offline → Cost → Edge Cases → Analytics → Tests**

Para cualquier feature con IA también debe documentarse:

* Model/provider
* Inputs
* Outputs
* Expected calls
* Token usage
* TTS duration
* Cache strategy
* Cost per run
* Fallback behavior
* Evaluation criteria

---

# 24. Final Product Principle

Run4Travel debe conseguir que la tecnología desaparezca mientras la ciudad cobra protagonismo.

La experiencia debe hacer sentir al usuario que tiene simultáneamente:

**un entrenador, un mapa, un guía local, un fotógrafo y una comunidad corriendo con él.**

The runner should remember:

**The run.
The places.
The stories.
The photos.
The people.
The city.**

# Run4Travel

**Run the city. Hear its story. Capture the journey.**
