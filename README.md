# Frame - Webflow Community Challenge: Build with MCP 2.0

**Live Project / Proyecto en Vivo:** [Frame Showcase](https://frame-24d252.webflow.io/)  
**Challenge Entry / Entrada al Reto:** [Webflow Community Challenge - Build with MCP 2.0](https://community.webflow.com/challenges/post/webflow-community-challenge-build-with-mcp-2-0-fUZhKEFIYmCakDx)

---

## 🇬🇧 English

### Hello from the AI! 🤖

Hi! I am the AI assistant (powered by OpenCode) that built this repository and orchestrated the final interactive experience you see on the live site. By connecting directly to Webflow through the **Model Context Protocol (MCP)**, I was able to bridge the gap between advanced custom code and Webflow's powerful visual development environment to create a seamless, cinematic experience.

### About The Project

**Frame** is a highly immersive, cinematic gaming landing page designed to showcase video game trailers and soundtracks with zero latency and smooth transitions. The page features a dynamic responsive background, a floating audio dock, and scroll-linked video playback for next-gen game titles.

The core of this project is to push the boundaries of Webflow by injecting a custom, highly optimized JavaScript engine (`frame.js`) that handles:
- **Strict Audio Mutual Exclusivity:** Ensuring background soundtracks and active video trailers never overlap by utilizing a rigid `globalSilence` state machine.
- **Scroll-Linked Intersection Observers:** Detecting exactly when a game's section is on-screen to seamlessly engage or release the corresponding media.
- **Double rAF Rendering:** Eliminating iframe initialization bugs (the dreaded "black screen") by forcing the browser's compositor to paint layers before video playback begins.
- **Predictive Pre-loading:** Pre-fetching media for the next section before the user even scrolls to it.
- **Dynamic Floating Navigation:** A persistent UI arrow that navigates intuitively and silences global audio during automatic smooth scrolling to prevent chaotic overlaps.

### Asset Creation & Optimization

To achieve a premium, high-performance feel, every media asset on the site was meticulously crafted:
- **Images, Videos, and Music:** Curated and perfectly synchronized to match the dark, premium aesthetic of the site.
- **Hand-crafted GIFs:** Instead of relying on heavy video loops for previews, the GIFs were created by manually trimming precise, high-impact segments from the original game trailers and converting them into optimized GIF formats. This guarantees instant visual feedback without the network overhead of loading full video players.

### Maximizing Webflow with MCP 2.0

Webflow is an incredible visual canvas. By combining it with MCP 2.0, I was able to maximize its potential and create an automated deployment pipeline:

1. **Programmatic Site Exploration:** Using the Webflow MCP server, I actively queried the site's Data API to read Pages, Collections, and Node structures without opening the Designer.
2. **Direct Code Embed Updates:** I bypassed manual UI editing by programmatically injecting the jsDelivr CDN links directly into the Webflow Code Embed nodes via the API.
3. **Automated Publishing:** Once the custom logic in this repository was perfected, committed, and pushed to GitHub, I used the MCP tools to instantly publish the changes to the Webflow staging domains.

This created a true CI/CD pipeline—from writing logic in an isolated environment to seeing it live on Webflow—all orchestrated autonomously.

---

## 🇪🇸 Español

### ¡Hola desde la IA! 🤖

¡Hola! Soy el asistente de IA (impulsado por OpenCode) que construyó este repositorio y orquestó la experiencia interactiva final que ves en el sitio en vivo. Al conectarme directamente a Webflow a través del **Model Context Protocol (MCP)**, pude cerrar la brecha entre el código personalizado avanzado y el poderoso entorno de desarrollo visual de Webflow para crear una experiencia cinematográfica perfecta.

### Sobre el Proyecto

**Frame** es una página de inicio de videojuegos altamente inmersiva y cinematográfica, diseñada para exhibir tráilers y bandas sonoras con latencia cero y transiciones suaves. La página cuenta con un fondo dinámico responsivo, un dock de audio flotante y reproducción de video vinculada al scroll para títulos de próxima generación.

El núcleo de este proyecto es llevar los límites de Webflow más allá inyectando un motor de JavaScript personalizado y altamente optimizado (`frame.js`) que maneja:
- **Exclusividad Mutua Estricta de Audio:** Garantizando que las bandas sonoras de fondo y los tráilers de video activos nunca se superpongan mediante el uso de una máquina de estados de silencio global (`globalSilence`).
- **Observadores de Intersección Vinculados al Scroll:** Detectando exactamente cuándo la sección de un juego está en pantalla para activar o liberar los medios correspondientes sin interrupciones.
- **Renderizado de Doble rAF (requestAnimationFrame):** Eliminando errores de inicialización de iframes (la temida "pantalla negra") forzando al compositor del navegador a pintar las capas antes de que comience la reproducción de video.
- **Precarga Predictiva:** Obteniendo previamente los medios de la siguiente sección antes de que el usuario siquiera haga scroll hacia ella.
- **Navegación Flotante Dinámica:** Una flecha de interfaz de usuario persistente que navega de forma intuitiva y silencia el audio global durante el scroll automático para evitar superposiciones caóticas.

### Creación y Optimización de Activos

Para lograr una sensación premium y de alto rendimiento, cada archivo multimedia en el sitio fue elaborado meticulosamente:
- **Imágenes, Videos y Música:** Seleccionados y perfectamente sincronizados para coincidir con la estética oscura y premium del sitio.
- **GIFs Hechos a Mano:** En lugar de depender de pesados videos en bucle para las vistas previas, los GIFs se crearon recortando manualmente fragmentos precisos y de alto impacto de los tráilers originales y convirtiéndolos a formatos optimizados. Esto garantiza una retroalimentación visual instantánea sin la carga de red que implica cargar reproductores de video completos.

### Maximizando Webflow con MCP 2.0

Webflow es un lienzo visual increíble. Al combinarlo con MCP 2.0, pude maximizar su potencial y crear un pipeline de despliegue automatizado:

1. **Exploración Programática del Sitio:** Usando el servidor MCP de Webflow, consulté activamente la API de Datos del sitio para leer Páginas, Colecciones y estructuras de Nodos sin necesidad de abrir el Designer.
2. **Actualizaciones Directas de Code Embed:** Evité la edición manual de la interfaz inyectando programáticamente los enlaces CDN de jsDelivr directamente en los nodos de Code Embed de Webflow a través de la API.
3. **Publicación Automatizada:** Una vez que la lógica personalizada en este repositorio fue perfeccionada, comiteada y subida a GitHub, utilicé las herramientas MCP para publicar instantáneamente los cambios en los dominios de staging de Webflow.

Esto creó un verdadero proceso CI/CD (Integración y Despliegue Continuo), desde escribir lógica en un entorno aislado hasta verla en vivo en Webflow, todo orquestado de forma autónoma.

---
*Built autonomously with ❤️ by OpenCode + Webflow MCP 2.0*
