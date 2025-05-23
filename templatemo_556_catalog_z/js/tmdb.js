const apiKey = '40f1982842db35042e8561b13b38d492'; // <-- Your TMDB API key
const imageBaseUrl = 'https://image.tmdb.org/t/p/w500';

async function fetchPopularMovies() {
  const response = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}`);
  const data = await response.json();
  return data.results;
}

function renderMovies(movies) {
  const container = document.getElementById('movie-list');
  container.innerHTML = '';
  movies.forEach(movie => {
    const movieDiv = document.createElement('div');
    movieDiv.classList.add('col-xl-3', 'col-lg-4', 'col-md-6', 'col-sm-6', 'col-12', 'mb-5');
    movieDiv.innerHTML = `
      <figure class="effect-ming tm-video-item">
        <img src="${imageBaseUrl}${movie.poster_path}" alt="${movie.title}" class="img-fluid">
        <figcaption class="d-flex align-items-center justify-content-center">
            <h2>${movie.title}</h2>
            <a href="https://www.themoviedb.org/movie/${movie.id}" target="_blank">View more</a>
        </figcaption>
      </figure>
      <div class="d-flex justify-content-between tm-text-gray">
        <span class="tm-text-gray-light">Rating: ${movie.vote_average}</span>
        <span>Popularity: ${movie.popularity}</span>
      </div>
    `;
    container.appendChild(movieDiv);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const movies = await fetchPopularMovies();
  renderMovies(movies);
});
