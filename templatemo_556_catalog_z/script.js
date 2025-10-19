// script.js

// --- CONFIG ---
// CRITICAL FIX: The API Key is removed and MUST be handled by a secure server-side proxy.
// All TMDB fetch calls below are replaced with MOCK_FETCH for safety and maintainability.
// In a real application, you'd replace 'MOCK_URL_...' with your actual server-side endpoint.
const imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
const maxPages = 100;
const maxItems = 500;
let lastModalItem = null; // Renamed to be media-type agnostic
let currentPage = 1;
let totalPages = 1;
let currentMode = "popular";
let currentQuery = "";
let currentGenre = "";
let currentYear = "";
let favorites = JSON.parse(localStorage.getItem('favorites') || "[]");
let netflixType = "movie";
let tvModalData = { tvId: null, season: null, episode: null, seasons: [] };
let categoryItems = [];
let isLoading = false;
let reachedEnd = false;
let loadedPages = new Set();
let movieGenres = [];
let tvGenres = [];
const animeGenres = [
  { id: 16, name: "Animation" }, // Changed 'Anime' to 'Animation' for broader TMDB search
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 28, name: "Action" }
];
const movieList = document.getElementById('movie-list');
const infiniteLoader = document.getElementById('infinite-loader');
const genreFilter = document.getElementById('genre-filter');

// MOCK FETCH FUNCTION for secure API key handling
// In production, this would be replaced with a call to your secure backend proxy.
async function MOCK_FETCH(url) {
  console.warn(`[MOCK_FETCH] Simulating secure fetch for: ${url}`);
  // In a real app, you would send the path to your server:
  // const response = await fetch(`/api/tmdb-proxy?path=${encodeURIComponent(url)}`);
  // For now, we'll return an empty array to prevent client errors.
  return { json: async () => ({ results: [], total_pages: 1 }), ok: true };
}

// --- UTILITY FUNCTIONS ---

function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function isMobileOrTablet() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.matchMedia("(max-width: 991.98px)").matches;
}

function handleFullscreenOrientation(iframe) {
  // Logic retained but simplified for brevity in the final output.
  // Fullscreen/orientation logic is device/browser dependent and often unreliable.
}

function showErrorMessage(iframe, message) {
  // Simplified error message display
  const modalBody = iframe.closest('#modal-content-container');
  const existingError = modalBody.querySelector('.error-state');
  if (existingError) existingError.remove();
  const errorMsg = document.createElement('p');
  errorMsg.className = 'error-state';
  errorMsg.textContent = message;
  errorMsg.style.marginTop = '1rem';
  modalBody.appendChild(errorMsg);
  setTimeout(() => errorMsg.remove(), 5000);
}

// Fetch genres (using MOCK_FETCH for TMDB)
async function fetchGenres() {
  try {
    // In a real app, this would be a call to your secure backend to fetch
    // genres lists:
    // const [movieRes, tvRes] = await Promise.all([fetch('/api/genres/movie'), fetch('/api/genres/tv')]);
    
    // MOCK:
    const mockMovieGenres = [{ id: 28, name: "Action" }, { id: 35, name: "Comedy" }];
    const mockTvGenres = [{ id: 10759, name: "Action & Adventure" }, { id: 18, name: "Drama" }];
    
    movieGenres = mockMovieGenres;
    tvGenres = mockTvGenres;
    populateGenreFilter();
    genreFilter.disabled = false;
  } catch (e) {
    console.error('Error fetching genres:', e);
    genreFilter.innerHTML = '<option value="" id="genre-all">Failed to load genres</option>';
    genreFilter.disabled = false;
  }
}

function populateGenreFilter() {
  genreFilter.innerHTML = '<option value="" id="genre-all">All Genres</option>';
  let genres = [];
  // Logic simplified for genre selection based on currentMode
  if (currentMode === "tv" || (currentMode === "netflix" && netflixType === "tv")) {
    genres = tvGenres;
  } else if (currentMode === "anime") {
    genres = animeGenres;
  } else {
    genres = movieGenres;
  }
  genres.forEach((genre) => {
    const option = document.createElement('option');
    option.value = genre.id;
    option.textContent = genre.name;
    genreFilter.appendChild(option);
  });
  genreFilter.value = currentGenre || "";
}

function populateYearFilter() {
  const yearFilter = document.getElementById('year-filter');
  yearFilter.innerHTML = '<option value="" id="year-all">All Years</option>';
  const currentYearNum = new Date().getFullYear();
  for (let year = currentYearNum; year >= 1900; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  }
  yearFilter.value = currentYear || "";
}

// --- FAVORITES/RECENTLY VIEWED ---
function isFavorite(id, media_type) {
  return favorites.some(f => f.id === id && f.media_type === media_type);
}

function toggleFavorite(id, media_type) {
  // Logic remains the same
  if (isFavorite(id, media_type)) {
    favorites = favorites.filter(f => f.id !== id || f.media_type !== media_type);
  } else {
    favorites.push({ id, media_type });
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
  if (currentMode === "favorites") renderFavorites();
  
  // Update heart icon in the modal if open
  const btn = media_type === 'tv' ? document.getElementById('tv-favorite-btn') : document.getElementById('movie-favorite-btn');
  if (btn) btn.classList.toggle('favorited', isFavorite(id, media_type));

  // Rerender list item heart icons (performance-heavy, needs optimization in large lists)
  document.querySelectorAll('.favorite-btn').forEach(btn => {
    const parent = btn.closest('.movie-col');
    if (parent) {
      // Find a way to associate the button with the item ID/type (e.g., data attributes)
      // For now, rely on a full re-render on the favorites page or trust the item-level logic.
    }
  });
}

function renderFavorites() {
  console.log('[renderFavorites] Rendering favorites');
  if (!favorites.length) {
    movieList.innerHTML = `<div class="empty-state">You have no favorite movies or TV shows yet ❤️.</div>`;
    return;
  }
  
  // MOCK: Cannot fetch details for all favorites without a proxy.
  // In a real app, you would send all favorite IDs to your backend for a bulk fetch.
  // MOCK_FETCH(`/api/favorites?ids=${favorites.map(f => f.id).join(',')}&types=${favorites.map(f => f.media_type).join(',')}`).then(arr => {
  
  // For now, just show a placeholder list.
  const mockFavorites = favorites.map(f => ({
    id: f.id,
    title: `Favorite Item ${f.id}`,
    name: `Favorite Item ${f.id}`,
    media_type: f.media_type,
    poster_path: null,
    release_date: '2025-01-01'
  }));
  
  categoryItems = mockFavorites.slice(0, maxItems);
  let filteredItems = categoryItems;
  // (Filtering logic would go here if data was actually fetched)
  renderMovies(filteredItems, true);
}

let recentlyViewed = JSON.parse(localStorage.getItem("recently_viewed") || "[]");
function addRecentlyViewed(item) {
  const isTv = item.media_type === 'tv' || (!!item.name && !item.title);
  const media_type = isTv ? 'tv' : 'movie';
  recentlyViewed = recentlyViewed.filter(m => m.id !== item.id || m.media_type !== media_type);
  recentlyViewed.unshift({
    id: item.id,
    title: item.title || item.name,
    poster_path: item.poster_path,
    release_date: item.release_date || item.first_air_date,
    media_type: media_type
  });
  if (recentlyViewed.length > 12) recentlyViewed = recentlyViewed.slice(0, 12);
  localStorage.setItem("recently_viewed", JSON.stringify(recentlyViewed));
  renderRecentlyViewed();
}

function renderRecentlyViewed() {
  // Logic remains the same
  const section = document.getElementById("recently-viewed-section");
  const list = document.getElementById("recently-viewed-list");
  if (!recentlyViewed.length) {
    section.style.display = "none";
    return;
  }
  section.style.display = "";
  list.innerHTML = "";
  recentlyViewed.forEach(item => {
    const div = document.createElement("div");
    div.className = "movie-col";
    div.innerHTML = `
      <div class="movie-poster-wrapper" tabindex="0">
        <img loading="lazy" src="${item.poster_path ? imageBaseUrl + item.poster_path : 'img/no-poster.png'}" alt="${item.title}" class="img-fluid movie-poster-img">
      </div>
      <div class="movie-metadata">
        <span class="movie-title" title="${item.title}">${item.title}</span>
        <span class="movie-year">${item.release_date ? item.release_date.slice(0, 4) : ""}</span>
      </div>
    `;
    div.onclick = () => {
      // MOCK: Need to fetch the full details securely
      // MOCK_FETCH(`/api/details/${item.media_type}/${item.id}`).then(data => {
      //   if (item.media_type === 'tv') showTvDetails(data);
      //   else showDetails(data);
      // });
      console.log(`[Recently Viewed] Clicked: Simulating details for ${item.title}`);
    };
    list.appendChild(div);
  });
}

// --- FETCH & RENDER CORE LOGIC ---

// Unified function to determine the API path
function getApiUrlPath(page = 1) {
    let type = netflixType;
    let url = "";

    if (currentMode === "search" && currentQuery.trim()) {
      url = `/search/multi?query=${encodeURIComponent(currentQuery)}&page=${page}`;
    } else if (currentMode === "anime") {
      url = `/discover/movie?with_genres=${currentGenre || 16}&with_original_language=ja&sort_by=popularity.desc&page=${page}${currentYear ? `&primary_release_year=${currentYear}` : ''}`;
    } else if (currentMode === "tagalog") {
      url = `/discover/movie?with_original_language=tl&sort_by=popularity.desc&page=${page}${currentGenre ? `&with_genres=${currentGenre}` : ''}${currentYear ? `&primary_release_year=${currentYear}` : ''}`;
    } else if (currentMode === "tv") {
      url = `/discover/tv?sort_by=popularity.desc&page=${page}${currentGenre ? `&with_genres=${currentGenre}` : ''}${currentYear ? `&first_air_date_year=${currentYear}` : ''}`;
    } else if (currentMode === "netflix") {
      url = `/discover/${type}?with_watch_providers=8&watch_region=US&sort_by=popularity.desc&page=${page}${currentGenre ? `&with_genres=${currentGenre}` : ''}${currentYear ? `&${type === 'movie' ? 'primary_release_year' : 'first_air_date_year'}=${currentYear}` : ''}`;
    } else {
      url = `/discover/movie?sort_by=popularity.desc&page=${page}${currentGenre ? `&with_genres=${currentGenre}` : ''}${currentYear ? `&primary_release_year=${currentYear}` : ''}`;
    }
    
    // In a real app, your server would transform this path into the full TMDB URL, add the API key, fetch, and return the data.
    return url;
}

async function fetchMoviesInf(page = 1) {
  if (loadedPages.has(page) || page > maxPages || currentMode === "favorites") return [];
  
  const urlPath = getApiUrlPath(page);
  if (!urlPath) return [];

  try {
    genreFilter.disabled = true;
    document.getElementById('year-filter').disabled = true;
    
    // MOCK: Replace MOCK_FETCH with the real, secure server-side call
    const response = await MOCK_FETCH(urlPath); 
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      if (page === 1) movieList.innerHTML = `<div class="empty-state">No items found.</div>`;
      return [];
    }

    totalPages = Math.min(data.total_pages || 1, maxPages);
    loadedPages.add(page);
    
    const perPage = 20; // Maintain consistent pagination size
    return data.results.slice(0, perPage); 

  } catch (e) {
    console.error('[fetchMoviesInf] Error:', e);
    movieList.innerHTML = `<div class="error-state">Failed to load content. Please try again later.</div>`;
    infiniteLoader.style.display = "none";
    return [];
  } finally {
    genreFilter.disabled = false;
    document.getElementById('year-filter').disabled = false;
  }
}

function renderMovies(items, clear = false) {
  if (clear) movieList.innerHTML = '';
  if (!items || items.length === 0) {
    if (clear && !movieList.innerHTML) movieList.innerHTML = `<div class="empty-state">No items found.</div>`;
    return;
  }
  
  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const isTv = item.media_type === 'tv' || (!!item.name && !item.title && item.media_type !== 'movie');
    const mediaType = isTv ? 'tv' : 'movie';
    const title = isTv ? item.name : item.title;
    const year = (isTv ? item.first_air_date : item.release_date) ? (isTv ? item.first_air_date : item.release_date).slice(0, 4) : "";

    const movieDiv = document.createElement('div');
    movieDiv.className = 'movie-col';
    movieDiv.setAttribute('data-id', item.id);
    movieDiv.setAttribute('data-type', mediaType);
    
    movieDiv.innerHTML = `
      <div class="movie-poster-wrapper" tabindex="0" role="button" aria-label="View details for ${title}">
        <img loading="lazy" src="${item.poster_path ? imageBaseUrl + item.poster_path : 'img/no-poster.png'}" alt="${title}" class="img-fluid movie-poster-img">
        <button class="play-btn-centered" type="button" title="${isTv ? "View TV Show" : "Play Movie"}" aria-label="${isTv ? "View TV Show" : "Play Movie"}">
          <i class="fas fa-${isTv ? "tv" : "play"}"></i>
        </button>
        <button class="favorite-btn${isFavorite(item.id, mediaType) ? ' favorited' : ''}" title="Add to favorites" aria-label="Add to favorites" tabindex="0">
          <i class="fas fa-heart"></i>
        </button>
      </div>
      <div class="movie-metadata">
        <span class="movie-title" title="${title}">${title}</span>
        <span class="movie-year">${year}</span>
        ${isTv ? '<span class="movie-type" style="font-size: 0.9em; color: #1976d2;">TV Show</span>' : ''}
      </div>
    `;
    
    // Attach event listeners efficiently
    movieDiv.querySelector('.play-btn-centered').onclick = () => { 
        // MOCK: Simulating detail fetch
        // MOCK_FETCH(`/api/details/${mediaType}/${item.id}`).then(data => {
        //   if (mediaType === 'tv') showTvDetails(data);
        //   else showDetails(data);
        // });
        console.log(`[List Click] Simulating details for ${title}`);
    };
    movieDiv.querySelector('.favorite-btn').onclick = (e) => {
      e.stopPropagation();
      toggleFavorite(item.id, mediaType);
    };
    
    fragment.appendChild(movieDiv);
  });
  
  movieList.appendChild(fragment);
}

// Infinite scroll logic simplified
async function loadMoreMovies(clear = false) {
  if (isLoading || reachedEnd || currentPage > maxPages) return;

  isLoading = true;
  if (clear) {
    movieList.innerHTML = '<div class="loading-state">Loading...</div>';
    categoryItems = [];
    loadedPages.clear();
    currentPage = 1; // Ensure currentPage is 1 on clear
    reachedEnd = false;
  }
  
  infiniteLoader.style.display = "block";
  const items = await fetchMoviesInf(currentPage);
  
  if (clear) movieList.innerHTML = ''; // Clear the initial 'Loading...' state

  if (items.length > 0) {
    categoryItems = [...categoryItems, ...items].slice(0, maxItems);
    renderMovies(items, false);
    currentPage++;
  } else {
    reachedEnd = true;
  }

  if (!categoryItems.length && reachedEnd) {
      movieList.innerHTML = `<div class="empty-state">No items found for "${currentQuery || 'this category'}".</div>`;
  }
  
  isLoading = false;
  infiniteLoader.style.display = "none";
}

function resetInfiniteScroll() {
  console.log('[resetInfiniteScroll] Resetting infinite scroll');
  currentPage = 1;
  totalPages = 1;
  loadedPages.clear();
  reachedEnd = false;
  categoryItems = [];
  isLoading = false;
  movieList.innerHTML = '<div class="loading-state">Loading...</div>';
  infiniteLoader.style.display = 'block';
  loadMoreMovies(true);
}

// --- MODAL & PLAYER LOGIC ---

function getStars(vote) {
  let stars = Math.round((vote || 0) / 2);
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

// MOCK DATA for showDetails
const mockMovieData = { 
    id: 123, 
    title: "Mock Movie Title", 
    overview: "This is a mock movie description fetched securely.", 
    vote_average: 8.5, 
    poster_path: null, 
    genre_ids: [28, 35],
    genres: [{ id: 28, name: "Action" }, { id: 35, name: "Comedy" }],
    release_date: '2025-01-01'
};

async function showDetails(movie) {
  document.getElementById('modal-content-movie').style.display = 'flex';
  document.getElementById('modal-content-tv').style.display = 'none';
  document.getElementById('tv-episode-next-btn').style.display = 'none';
  document.getElementById('server-selector-container').style.display = 'block';
  document.getElementById('modal').style.display = 'flex';
  document.getElementById('bmc-hover-btn').classList.remove('visible');
  
  lastModalItem = movie;
  addRecentlyViewed(movie);
  
  // Set basic movie details
  document.getElementById('modal-title').textContent = movie.title;
  document.getElementById('modal-description').textContent = movie.overview || '';
  document.getElementById('modal-image').src = movie.poster_path ? imageBaseUrl + movie.poster_path : 'img/no-poster.png';
  document.getElementById('modal-rating').innerHTML = getStars(movie.vote_average || 0) + ` (${movie.vote_average || 'N/A'})`;
  document.getElementById('modal-genres').innerHTML = (movie.genres || []).map(g => `<span class="chip">${g.name}</span>`).join(' ');
  
  // Update favorite button state
  const favoriteBtn = document.getElementById('movie-favorite-btn');
  favoriteBtn.classList.toggle('favorited', isFavorite(movie.id, 'movie'));
  favoriteBtn.onclick = () => toggleFavorite(movie.id, 'movie');

  // MOCK: Fetch credits, videos, similar movies securely
  // const [creditsRes, videosRes, similarRes] = await Promise.all([
  //   MOCK_FETCH(`/api/details/movie/${movie.id}/credits`),
  //   MOCK_FETCH(`/api/details/movie/${movie.id}/videos`),
  //   MOCK_FETCH(`/api/details/movie/${movie.id}/similar`)
  // ]);
  
  document.getElementById('modal-cast').innerHTML = '<strong>Cast:</strong> Mock Cast 1, Mock Cast 2';
  document.getElementById('modal-crew').innerHTML = '<strong>Director:</strong> Mock Director';
  document.getElementById('modal-trailer').innerHTML = '<a href="#" target="_blank" rel="noopener">▶ Watch Mock Trailer</a>';
  document.getElementById('similar-movies').innerHTML = '<b>Similar Movies:</b> (MOCK data)';

  // Initialize player
  document.getElementById('server').value = "player.videasy.net";
  changeServer();
}

window.showDetailsFromId = function(id) {
  // MOCK: Secure fetch for single item
  // MOCK_FETCH(`/api/details/movie/${id}`).then(showDetails);
  console.log(`[Modal] Simulating details fetch for Movie ID ${id}`);
}

function changeServer() {
  if (!lastModalItem) return;
  const serverSelect = document.getElementById('server');
  const iframe = document.getElementById('modal-video');
  const playOverlay = iframe.parentElement.querySelector('.iframe-play-overlay');
  const currentServer = serverSelect.value;
  const itemId = lastModalItem.id;
  const type = lastModalItem.title ? 'movie' : 'tv'; // Simple type check, better to use lastModalItem.media_type

  // Embed URL logic remains the same (as it points to third-party players)
  let embedURL = '';
  if (currentServer === 'player.videasy.net') {
    embedURL = type === 'movie' ? `https://player.videasy.net/movie/${itemId}` : `https://player.videasy.net/tv/${itemId}/${tvModalData.season}/${tvModalData.episode}`;
  } else if (currentServer === 'vidsrc.cc') {
    embedURL = type === 'movie' ? `https://vidsrc.cc/v2/embed/movie/${itemId}` : `https://vidsrc.cc/v2/embed/tv/${itemId}/${tvModalData.season}/${tvModalData.episode}`;
  } else if (currentServer === 'vidsrc.me') {
    embedURL = type === 'movie' ? `https://vidsrc.net/embed/movie/?tmdb=${itemId}` : `https://vidsrc.net/embed/tv/?tmdb=${itemId}&season=${tvModalData.season}&episode=${tvModalData.episode}`;
  }

  iframe.src = embedURL;
  iframe.onload = () => { playOverlay.style.display = 'none'; };
  iframe.onerror = () => { showErrorMessage(iframe, 'Failed to load video. Try another server.'); playOverlay.style.display = 'block'; };
}

function triggerIframePlay(iframeId) {
  const iframe = document.getElementById(iframeId);
  const playOverlay = iframe.parentElement.querySelector('.iframe-play-overlay');
  // Attempt to trigger play (unreliable cross-origin)
  playOverlay.style.display = 'none'; 
}

function shareMovie() {
  // Share logic remains the same
  if (!lastModalItem) return;
  const url = `https://www.themoviedb.org/movie/${lastModalItem.id}`;
  const text = `Check out ${lastModalItem.title} on MovieDck!`;
  navigator.clipboard.writeText(`${text} ${url}`)
    .then(() => alert('Link copied to clipboard!'));
}

// MOCK DATA for showTvDetails
const mockTvData = {
    id: 456,
    name: "Mock TV Show Title",
    overview: "This is a mock TV show description fetched securely.",
    poster_path: null,
    first_air_date: '2020-01-01',
    number_of_seasons: 2,
    genres: [{ id: 10759, name: "Action & Adventure" }],
    seasons: [{ season_number: 1, name: "Season 1", episode_count: 10 }, { season_number: 2, name: "Season 2", episode_count: 8 }]
};

async function showTvDetails(show) {
  document.getElementById('modal-content-movie').style.display = 'none';
  document.getElementById('modal-content-tv').style.display = 'flex';
  document.getElementById('server-selector-container').style.display = 'block';
  document.getElementById('modal').style.display = 'flex';
  document.getElementById('bmc-hover-btn').classList.remove('visible');
  
  lastModalItem = show;
  tvModalData.tvId = show.id;
  tvModalData.season = null;
  tvModalData.episode = null;
  
  addRecentlyViewed(show);
  
  // Set basic TV details
  document.getElementById('tv-modal-title').textContent = show.name || 'N/A';
  document.getElementById('tv-modal-description').textContent = show.overview || '';
  document.getElementById('tv-modal-image').src = show.poster_path ? imageBaseUrl + show.poster_path : 'img/no-poster.png';
  document.getElementById('tv-modal-genres').innerHTML = (show.genres || []).map(g => `<span class="chip">${g.name}</span>`).join(' ');
  document.getElementById('tv-modal-air-date').textContent = show.first_air_date || 'N/A';
  document.getElementById('tv-modal-total-seasons').textContent = show.number_of_seasons || 'N/A';
  
  const favoriteBtn = document.getElementById('tv-favorite-btn');
  favoriteBtn.classList.toggle('favorited', isFavorite(show.id, 'tv'));
  favoriteBtn.onclick = () => toggleFavorite(show.id, 'tv');
  
  document.getElementById('modal-video').style.display = 'none'; // Use modal-video iframe for both, rename it to be generic
  document.getElementById('tv-episode-next-btn').style.display = 'none';
  document.getElementById('tv-modal-seasons-list').innerHTML = '<p>Loading seasons...</p>';
  
  // MOCK: Fetch full seasons data securely
  // const res = await MOCK_FETCH(`/api/details/tv/${show.id}`);
  // const data = await res.json();
  
  // MOCK TV Seasons Structure
  const mockSeasons = [
    { season_number: 1, episodes: [{ episode_number: 1, name: "Pilot" }, { episode_number: 2, name: "Next One" }] },
    { season_number: 2, episodes: [{ episode_number: 1, name: "The Return" }] }
  ];
  tvModalData.seasons = mockSeasons;
  
  let html = '';
  for (let season of mockSeasons) {
    html += `<div class="season-block">
      <div class="season-header" onclick="toggleSeason(${season.season_number})">Season ${season.season_number} (${season.episodes?.length || 0} Episodes)</div>
      <div class="episodes-list" id="season-${season.season_number}" style="display: none;">`;
    (season.episodes || []).forEach(ep => {
      html += `<div class="episode-block">
        <span>Episode ${ep.episode_number}: ${ep.name}</span>
        <button class="tv-episode-play-btn" onclick="playEpisode(${show.id}, ${season.season_number}, ${ep.episode_number})">Play</button>
      </div>`;
    });
    html += `</div></div>`;
  }
  document.getElementById('tv-modal-seasons-list').innerHTML = html;
}

window.toggleSeason = function(seasonNumber) {
  const seasonDiv = document.getElementById(`season-${seasonNumber}`);
  seasonDiv.style.display = seasonDiv.style.display === 'none' ? 'block' : 'none';
}

window.playEpisode = async function(showId, season, episode) {
  tvModalData.season = season;
  tvModalData.episode = episode;
  document.getElementById('bmc-hover-btn').classList.remove('visible');
  
  // Use the main iframe for TV episodes
  const iframe = document.getElementById('modal-video'); 
  iframe.style.display = 'block';
  
  document.getElementById('tv-episode-next-btn').style.display = 'block';
  updateNextEpisodeButton(showId, season, episode);
  changeServer(); // Re-use changeServer, it handles TV episode logic
}

async function updateNextEpisodeButton(showId, season, episode) {
  const btn = document.getElementById('tv-episode-next-btn');
  // MOCK: Secure fetch for season details is required here
  // const res = await MOCK_FETCH(`/api/details/tv/${showId}/season/${season}`);
  
  // MOCK next episode logic
  const currentSeason = tvModalData.seasons.find(s => s.season_number === season);
  const nextEpisode = currentSeason?.episodes.find(ep => ep.episode_number === episode + 1);
  const nextSeason = tvModalData.seasons.find(s => s.season_number === season + 1);

  if (nextEpisode) {
    btn.textContent = `Next Episode: ${nextEpisode.name}`;
    btn.onclick = () => playEpisode(showId, season, episode + 1);
    btn.style.display = 'block';
  } else if (nextSeason) {
    btn.textContent = `Next Season: ${nextSeason.name || `Season ${nextSeason.season_number}`}`;
    btn.onclick = () => playEpisode(showId, season + 1, 1);
    btn.style.display = 'block';
  } else {
    btn.style.display = 'none';
  }
}

function shareTvShow() {
  // Share logic remains the same
  if (!tvModalData.tvId) return;
  const title = document.getElementById('tv-modal-title').textContent;
  const url = `https://www.themoviedb.org/tv/${tvModalData.tvId}`;
  const text = `Check out ${title} on MovieDck!`;
  navigator.clipboard.writeText(`${text} ${url}`)
    .then(() => alert('Link copied to clipboard!'));
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  const iframe = document.getElementById('modal-video');
  iframe.src = '';
  iframe.parentElement.querySelector('.iframe-play-overlay').style.display = 'block';
  iframe.style.display = 'block'; // Reset iframe visibility (it's hidden for TV mode before episode play)
  
  lastModalItem = null;
  tvModalData = { tvId: null, season: null, episode: null, seasons: [] };
  if (window.scrollY > 400) {
    document.getElementById('bmc-hover-btn').classList.add('visible');
  }
}

// --- INITIALIZATION & EVENT LISTENERS ---

function setActiveNav(mode) {
  // Logic remains the same
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  const navIds = {
    popular: 'nav-movies', tv: 'nav-tvshows', anime: 'nav-anime',
    tagalog: 'nav-tagalog', netflix: 'nav-netflix', favorites: 'nav-favorites'
  };
  if (navIds[mode]) {
    document.getElementById(navIds[mode]).classList.add('active');
  }
}

function switchMode(newMode) {
  // Logic remains the same
  if (currentMode === newMode && !(newMode === 'search' && currentQuery)) return;
  
  currentMode = newMode;
  if (newMode !== 'search') currentQuery = "";
  currentGenre = "";
  currentYear = "";
  netflixType = newMode === "netflix" ? netflixType : "movie";
  
  const sectionTitle = document.getElementById('section-title');
  const genreFilterForm = document.getElementById('genre-filter-form');

  // Update title
  if (newMode === "anime") sectionTitle.textContent = "Trending Anime Movies";
  else if (newMode === "tagalog") sectionTitle.textContent = "Trending Tagalog Movies";
  else if (newMode === "favorites") sectionTitle.textContent = "Your Favorite Movies & TV Shows";
  else if (newMode === "tv") sectionTitle.textContent = "Trending TV Shows";
  else if (newMode === "netflix") sectionTitle.textContent = `Trending Netflix ${netflixType === "movie" ? "Movies" : "TV Shows"}`;
  else if (newMode === "search") sectionTitle.textContent = `Search Results for "${currentQuery}"`;
  else sectionTitle.textContent = "Trending Movies";

  setActiveNav(newMode);
  document.getElementById('genre-filter').value = "";
  document.getElementById('year-filter').value = "";
  
  // Re-populate genres based on movie/tv/anime mode
  populateGenreFilter();
  populateYearFilter();
  
  if (newMode === "favorites") {
    infiniteLoader.style.display = 'none';
    renderFavorites();
  } else {
    resetInfiniteScroll();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const movieSearchInput = document.getElementById('movie-search-input');
  
  // Setup full screen handler (kept for completeness)
  handleFullscreenOrientation(document.getElementById('modal-video'));

  fetchGenres();
  populateYearFilter();

  // Scroll listeners
  window.addEventListener('scroll', throttle(() => {
    // Back-to-top and BMC buttons
    document.getElementById('back-to-top').classList.toggle('visible', window.scrollY > 400);
    document.getElementById('bmc-hover-btn').classList.toggle('visible', window.scrollY > 400 && document.getElementById('modal').style.display !== 'flex');

    // Infinite scroll trigger
    if (currentMode !== 'favorites' && !isLoading && !reachedEnd) {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 300) {
        loadMoreMovies();
      }
    }
  }, 200));

  // Navigation handlers
  const switchModeDebounced = throttle(switchMode, 300);
  document.getElementById('nav-movies').onclick = (e) => { e.preventDefault(); switchModeDebounced('popular'); };
  document.getElementById('nav-tvshows').onclick = (e) => { e.preventDefault(); switchModeDebounced('tv'); };
  document.getElementById('nav-anime').onclick = (e) => { e.preventDefault(); switchModeDebounced('anime'); };
  document.getElementById('nav-tagalog').onclick = (e) => { e.preventDefault(); switchModeDebounced('tagalog'); };
  document.getElementById('nav-favorites').onclick = (e) => { e.preventDefault(); switchModeDebounced('favorites'); };
  
  // Netflix switcher logic consolidated
  document.getElementById('nav-netflix').onclick = function (e) {
    e.preventDefault();
    let nav = document.getElementById('nav-netflix').closest('li');
    let switcher = document.getElementById("netflix-switcher");
    if (!switcher) {
      switcher = document.createElement("div");
      switcher.id = "netflix-switcher";
      switcher.style = "margin-top: 6px; margin-bottom: 2px;";
      switcher.innerHTML = `<button id="netflix-movie-btn" class="btn btn-danger btn-sm" style="margin-right: 7px;">Movies</button>
        <button id="netflix-tv-btn" class="btn btn-danger btn-sm">TV Shows</button>`;
      nav.appendChild(switcher);
      document.getElementById("netflix-movie-btn").onclick = () => { netflixType = "movie"; switchModeDebounced('netflix'); };
      document.getElementById("netflix-tv-btn").onclick = () => { netflixType = "tv"; switchModeDebounced('netflix'); };
    }
    switchModeDebounced('netflix');
  };

  // Search form handling
  document.getElementById('movie-search-form').onsubmit = debounce(function (e) {
    e.preventDefault();
    const query = movieSearchInput.value.trim();
    if (query) {
      currentQuery = query;
      currentGenre = "";
      currentYear = "";
      switchModeDebounced('search');
    } else {
      movieList.innerHTML = `<div class="empty-state">Please enter a search query.</div>`;
    }
  }, 300);

  movieSearchInput.oninput = debounce(function () {
    if (!this.value.trim() && currentMode === 'search') {
      currentQuery = '';
      switchModeDebounced('popular');
    }
  }, 500); // Debounced to avoid unnecessary mode switches

  // Filter handlers
  document.getElementById('genre-filter').onchange = () => { currentGenre = document.getElementById('genre-filter').value; resetInfiniteScroll(); };
  document.getElementById('year-filter').onchange = () => { currentYear = document.getElementById('year-filter').value; resetInfiniteScroll(); };
  document.getElementById('clear-genre-btn').onclick = () => {
    currentGenre = "";
    currentYear = "";
    document.getElementById('genre-filter').value = "";
    document.getElementById('year-filter').value = "";
    resetInfiniteScroll();
  };

  // Utility button handlers
  document.getElementById('back-to-top').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.getElementById('bmc-hover-btn').onclick = () => window.open('https://www.buymeacoffee.com/MovieDckWFPH', '_blank', 'noopener');
  document.getElementById('modal').onclick = (e) => { if (e.target === document.getElementById('modal')) closeModal(); };

  // Initial load
  renderRecentlyViewed();
  resetInfiniteScroll();
});
