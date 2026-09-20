// WeatherNow — vanilla JS, fetch API, async/await
// Uses Open-Meteo (free, no API key required)

const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const locateBtn = document.getElementById('locate-btn');
const statusEl = document.getElementById('status');
const currentWeatherEl = document.getElementById('current-weather');
const forecastEl = document.getElementById('forecast');

const WEATHER_CODES = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  61: { label: 'Rain', icon: '🌧️' },
  63: { label: 'Moderate rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  71: { label: 'Snow', icon: '🌨️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
};

function describeCode(code) {
  return WEATHER_CODES[code] || { label: 'Unknown', icon: '❓' };
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#fca5a5' : '#cbd5e1';
}

function showLoading(message) {
  setStatus(message);
  currentWeatherEl.classList.add('hidden');
  forecastEl.classList.add('hidden');
}

// Convert a city name to lat/lon using Open-Meteo's free geocoding API
async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`Could not find "${city}". Try a different spelling.`);
  }
  const { latitude, longitude, name, country } = data.results[0];
  return { latitude, longitude, name, country };
}

// Fetch current + 5-day forecast for a lat/lon
async function fetchWeather(latitude, longitude) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather request failed');
  return res.json();
}

function renderCurrent(place, weather) {
  const { temperature_2m, relative_humidity_2m, wind_speed_10m, weather_code } =
    weather.current;
  const { label, icon } = describeCode(weather_code);

  currentWeatherEl.innerHTML = `
    <h2>${place.name}${place.country ? ', ' + place.country : ''}</h2>
    <div class="temp">${icon} ${Math.round(temperature_2m)}°C</div>
    <div class="desc">${label}</div>
    <div class="meta">
      <span>💧 ${relative_humidity_2m}% humidity</span>
      <span>💨 ${Math.round(wind_speed_10m)} km/h wind</span>
    </div>
  `;
  currentWeatherEl.classList.remove('hidden');
}

function renderForecast(weather) {
  const { time, weather_code, temperature_2m_max, temperature_2m_min } = weather.daily;
  const days = time
    .slice(0, 5)
    .map((dateStr, i) => {
      const date = new Date(dateStr);
      const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
      const { icon } = describeCode(weather_code[i]);
      return `
        <div class="forecast-day">
          <div class="day-name">${dayName}</div>
          <div class="icon">${icon}</div>
          <div>${Math.round(temperature_2m_max[i])}° / ${Math.round(
        temperature_2m_min[i]
      )}°</div>
        </div>
      `;
    })
    .join('');
  forecastEl.innerHTML = days;
  forecastEl.classList.remove('hidden');
}

async function searchCity(city) {
  try {
    showLoading(`Searching for "${city}"...`);
    const place = await geocodeCity(city);
    showLoading(`Fetching weather for ${place.name}...`);
    const weather = await fetchWeather(place.latitude, place.longitude);
    renderCurrent(place, weather);
    renderForecast(weather);
    setStatus('');
  } catch (err) {
    setStatus(err.message || 'Something went wrong.', true);
  }
}

async function searchByCoords(latitude, longitude) {
  try {
    showLoading('Fetching weather for your location...');
    const weather = await fetchWeather(latitude, longitude);
    renderCurrent({ name: 'Your location', country: '' }, weather);
    renderForecast(weather);
    setStatus('');
  } catch (err) {
    setStatus(err.message || 'Something went wrong.', true);
  }
}

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) searchCity(city);
});

locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    setStatus('Geolocation is not supported by your browser.', true);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => searchByCoords(pos.coords.latitude, pos.coords.longitude),
    () => setStatus('Could not get your location.', true)
  );
});

// Load a default city on first visit
searchCity('Mumbai');
