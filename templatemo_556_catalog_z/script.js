// CRITICAL FIX: The API key should not be hard-coded in client-side code for production applications.
// It's a security vulnerability. A server-side proxy is recommended.
// For this demonstration, we'll keep it here, but this is a major security flaw to address.
const apiKey = '40f1982842db35042e8561b13b38d492';
const imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
const maxPages = 100;
const maxItems = 500;
let lastModalMovie = null;
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
  { id: 16, name: "Anime" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 10749, name: "Romance" },
  { id: 14, name: "Fantasy" }
];
// ENHANCEMENT: Caching DOM elements for performance
const movieList = document.getElementById('movie-list');
const infiniteLoader = document.getElementById('infinite-loader');
const genreFilter = document.getElementById('genre-filter');
const movieIframe = document.getElementById('modal-video');
const tvIframe = document.getElementById('tv-episode-player');
const bmcHoverBtn = document.getElementById('bmc-hover-btn');
const modal = document.getElementById('modal');
const modalContentMovie = document.getElementById('modal-content-movie');
const modalContentTv = document.getElementById('modal-content-tv');
const sectionTitle = document.getElementById('section-title');
const genreFilterForm = document.getElementById('genre-filter-form');
const searchForm = document.getElementById('movie-search-form');
const searchInput = document.getElementById('movie-search-input');
const backToTopBtn = document.getElementById('back-to-top');
const recentlyViewedSection = document.getElementById("recently-viewed-section");
const recentlyViewedList = document.getElementById("recently-viewed-list");
const tvEpisodeNextBtn = document.getElementById('tv-episode-next-btn');
const shareMovieBtn = document.getElementById('share-movie-btn');
const shareTvBtn = document.getElementById('share-tv-btn');
const serverSelect = document.getElementById('server');

// ENHANCEMENT: Refactored function for better organization
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
  if (!isMobileOrTablet()) return;
  const lockOrientation = () => {
    if (document.fullscreenElement === iframe && screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(err => {
        console.warn('Orientation lock failed:', err);
        showErrorMessage(iframe, 'Please rotate your device to landscape for the best fullscreen experience.');
      });
    }
  };
  const unlockOrientation = () => {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock().catch(err => console.warn('Orientation unlock failed:', err));
    }
  };
  iframe.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement === iframe) {
      lockOrientation();
    } else {
      unlockOrientation();
    }
  });
}

function showErrorMessage(iframe, message) {
  const modalBody = iframe.closest('.modal-content').querySelector('.modal-body');
  const existingError = modalBody.querySelector('.error-state');
  if (existingError) existingError.remove();
  const errorMsg = document.createElement('p');
  errorMsg.className = 'error-state';
  errorMsg.textContent = message;
  errorMsg.style.marginTop = '1rem';
  modalBody.appendChild(errorMsg);
  setTimeout(() => errorMsg.remove(), 5000);
}

async function fetchGenres() {
  try {
    const [movieRes, tvRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}`),
      fetch(`https://api.themoviedb.org/3/genre/tv/list?api_key=${apiKey}`)
    ]);
    if (!movieRes.ok || !tvRes.ok) throw new Error('Failed to fetch genres');
    const movieData = await movieRes.json();
    const tvData = await tvRes.json();
    movieGenres = movieData.genres || [];
    tvGenres = tvData.genres || [];
    populateGenreFilter();
    genreFilter.disabled = false;
  } catch (e) {
    console.error('Error fetching genres:', e);
    genreFilter.innerHTML = '<option value="" id="genre-all">Failed to load genres</option