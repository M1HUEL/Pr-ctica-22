import { store } from "../state/store.js";
import { getCharacters } from "../core/api.js";

/**
 * Objeto Dashboard que maneja toda la lógica de la interfaz de usuario.
 */
export const dashboard = {
  // Referencias a elementos del DOM
  elements: {
    grid: document.getElementById("charactersGrid"),
    favoritesList: document.getElementById("favoritesList"),
    search: document.getElementById("characterSearch"),
    filter: document.getElementById("statusFilter"),
    loader: document.getElementById("loader"),
    noResults: document.getElementById("noResults"),
    prevBtn: document.getElementById("prevPage"),
    nextBtn: document.getElementById("nextPage"),
    pageInfo: document.getElementById("pageInfo"),
  },

  /**
   * Inicializa la página cargando los eventos y los datos iniciales.
   */
  async init() {
    // TODO: 1. Configurar los escuchadores de eventos llamando a setupEventListeners()
    // TODO: 2. Cargar los personajes iniciales llamando a loadCharacters()
    await this.loadCharacters();
    this.setupEventListeners();
    // Pintamos los favoritos guardados en LocalStorage al abrir la página.
    this.renderFavorites();
  },

  /**
   * Configura los escuchadores de eventos para búsqueda, filtro y paginación.
   */
  setupEventListeners() {
    // TODO: 1. Escuchar el evento 'input' en el input de búsqueda (this.elements.search)
    //          - Se sugiere implementar un 'debounce' (retardo) de 500ms para evitar múltiples peticiones seguidas al API.
    //          - Al escribir, actualizar store.state.filters.name con el texto limpio y reiniciar store.state.currentPage a 1.
    //          - Llamar a loadCharacters() para recargar la grilla.
    //
    // TODO: 2. Escuchar el evento 'change' en el select de filtros (this.elements.filter)
    //          - Actualizar store.state.filters.status con el valor del select y reiniciar store.state.currentPage a 1.
    //          - Llamar a loadCharacters() para recargar.
    //
    // TODO: 3. Escuchar el evento 'click' en el botón de página anterior (this.elements.prevBtn)
    //          - Si store.state.currentPage es mayor que 1, restarle 1.
    //          - Llamar a loadCharacters() y hacer scroll hacia arriba (window.scrollTo({ top: 0, behavior: 'smooth' })).
    //
    // TODO: 4. Escuchar el evento 'click' en el botón de página siguiente (this.elements.nextBtn)
    //          - Si store.state.currentPage es menor que store.state.totalPages, sumarle 1.
    //          - Llamar a loadCharacters() y hacer scroll hacia arriba.

    let timeout;
    this.elements.search.addEventListener("input", (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        store.state.filters.name = e.target.value.trim();
        store.state.currentPage = 1;
        //cargar los personajes filtrados
        this.loadCharacters();
      }, 500);
    });

    this.elements.filter.addEventListener("change", (e) => {
      store.state.filters.status = e.target.value;
      store.state.currentPage = 1;
      this.loadCharacters();
    });
  },

  /**
   * Solicita los personajes a la API según el estado actual de filtros y página.
   */
  async loadCharacters() {
    // TODO: 1. Mostrar el loader (showLoader(true)) y ocultar el mensaje de no resultados (this.elements.noResults)
    this.showLoader(true);
    this.elements.noResults.classList.add("hidden");
    // TODO: 2. Llamar a la función getCharacters importada, pasándole la página y los filtros actuales del store.
    const data = await getCharacters(
      store.state.currentPage,
      store.state.filters,
    );
    // TODO: 3. Si la respuesta contiene un error o no tiene resultados (.results), vaciar store.state.characters, poner totalPages en 0 y mostrar el elemento noResults (quitar la clase 'hidden').
    // TODO: 4. Si la respuesta es exitosa, guardar los resultados en store.state.characters y el número total de páginas en store.state.totalPages.
    if (data.error || !data.results) {
      store.state.characters = [];
      store.state.totalPages = 0;
      this.elements.noResults.classList.remove("hidden");
    } else {
      store.state.characters = data.results;
      store.state.totalPages = data.info.pages;
    }
    // TODO: 5. Llamar a renderGrid() para pintar los personajes, updatePagination() para actualizar los controles y ocultar el loader (showLoader(false)).
    this.renderGrid();
  },

  /**
   * Dibuja la cuadrícula de personajes en el DOM.
   */
  renderGrid() {
    // Buscamos las tarjetas viejas usando el punto ('.') para seleccionar por clase.
    const cards = this.elements.grid.querySelectorAll(".character-card");
    // Recorremos ese conjunto de tarjetas antiguas...
    cards.forEach(
      // ...y eliminamos cada una para no duplicar personajes al volver a pintar.
      (card) => card.remove(),
    );

    // Recorremos cada personaje que hay en el estado actual.
    store.state.characters.forEach((char) => {
      // Preguntamos al store si este personaje ya está marcado como favorito.
      const isFav = store.isFavorite(char.id);
      // Creamos un contenedor <div> vacío para la tarjeta.
      const card = document.createElement("div");
      // Le asignamos la clase CSS que da el estilo de tarjeta.
      card.className = "character-card";
      // Rellenamos la tarjeta con su HTML: imagen, nombre, estado y botón de favorito.
      card.innerHTML = `
                <div class="card-image-wrapper">
                    <img src="${char.image}" alt="${char.name}" loading="lazy">
                </div>
                <div class="card-content">
                    <h3 class="character-name">${char.name}</h3>
                    <div class="status-label status-${char.status.toLowerCase()}">
                        <span class="status-indicator"></span>
                        ${char.status}
                    </div>
                    <button class="fav-btn ${isFav ? "active" : ""}" data-id="${char.id}">
                        <i data-lucide="star"></i>
                        <span>${isFav ? "En Favoritos" : "Añadir a Favoritos"}</span>
                    </button>
                </div>  
            `;

      // Buscamos dentro de la tarjeta el botón con clase 'fav-btn'.
      const favBtn = card.querySelector(".fav-btn");
      // Le enganchamos un escuchador para reaccionar cuando el usuario haga clic.
      favBtn.addEventListener("click", () => {
        // Añadimos o quitamos el personaje del store (también se guarda en LocalStorage).
        store.toggleFavorite(char);
        // Volvemos a pintar la grilla para actualizar el estado del botón pulsado.
        this.renderGrid();
        // Volvemos a pintar el sidebar para mostrar u ocultar el favorito.
        this.renderFavorites();
      });

      // Insertamos la tarjeta terminada dentro de la grilla del DOM.
      this.elements.grid.appendChild(card);
    });

    // Ocultamos el spinner una sola vez, después de pintar todas las tarjetas.
    this.showLoader(false);
    // Pedimos a Lucide que convierta los <i data-lucide> de las tarjetas en iconos SVG.
    window.lucide?.createIcons();
  },

  /**
   * Dibuja la lista de personajes favoritos en la barra lateral.
   */
  renderFavorites() {
    // Guardamos en una variable corta la referencia al contenedor del sidebar.
    const { favoritesList } = this.elements;

    // Si no hay favoritos, mostramos el mensaje de estado vacío...
    if (store.state.favorites.length === 0) {
      // ...y terminamos la función para no seguir dibujando nada.
      favoritesList.innerHTML = `<div class="empty-favorites"><p>No favorites yet</p></div>`;
      return;
    }

    // Si hay favoritos, limpiamos primero el contenido anterior del sidebar.
    favoritesList.innerHTML = "";

    // Recorremos uno por uno los favoritos guardados en el store.
    store.state.favorites.forEach((fav) => {
      // Creamos el contenedor <div> que representará una fila del sidebar.
      const item = document.createElement("div");
      // Le damos la clase 'fav-item' para aplicarle los estilos de la fila.
      item.className = "fav-item";
      // Rellenamos la fila con la miniatura, el nombre y el botón para quitarlo.
      item.innerHTML = `
        <img src="${fav.image}" alt="${fav.name}">
        <div class="fav-item-info">
          <div class="fav-item-name">${fav.name}</div>
        </div>
        <button class="remove-fav" aria-label="Remove ${fav.name}">
          <i data-lucide="x"></i>
        </button>
      `;

      // Buscamos el botón de eliminar dentro de la fila que acabamos de crear.
      const botonEliminar = item.querySelector(".remove-fav");
      // Escuchamos el clic para permitir quitar el favorito desde el sidebar.
      botonEliminar.addEventListener("click", () => {
        // Quitamos el personaje del store (el cambio se persiste en LocalStorage).
        store.toggleFavorite(fav);
        // Pintamos otra vez el sidebar para que la fila desaparezca.
        this.renderFavorites();
        // Pintamos otra vez la grilla para desmarcar el botón de esa tarjeta.
        this.renderGrid();
      });

      // Añadimos la fila terminada al contenedor de favoritos del sidebar.
      favoritesList.appendChild(item);
    });

    // Convertimos el <i data-lucide="x"> en el icono de cierre usando Lucide.
    window.lucide?.createIcons();
  },

  /**
   * Actualiza el estado de los botones de paginación y el texto informativo.
   */
  updatePagination() {
    // TODO: 1. Deshabilitar o habilitar this.elements.prevBtn si estamos en la página 1 (store.state.currentPage <= 1).
    // TODO: 2. Deshabilitar o habilitar this.elements.nextBtn si estamos en la página máxima (store.state.currentPage >= store.state.totalPages).
    // TODO: 3. Cambiar el textContent de this.elements.pageInfo para mostrar la página actual y el total (Ej: "Página X de Y").
  },

  /**
   * Muestra u oculta el spinner de carga.
   *
   * @param {boolean} show - True para mostrar, False para ocultar
   */
  showLoader(show) {
    // TODO: Alternar la clase 'hidden' en el contenedor del loader (this.elements.loader) de acuerdo al parámetro 'show'.
    this.elements.loader.classList.toggle("hidden", !show);
  },
};
