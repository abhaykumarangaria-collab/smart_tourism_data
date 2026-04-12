// --- 1. DOM ELEMENTS ---
const splashScreen = document.getElementById('splash-screen');
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const cityInput = document.getElementById('city-input');
const compareInput = document.getElementById('compare-input'); // New
const searchBtn = document.getElementById('search-btn');
const favBtn = document.getElementById('favorite-btn'); // New

// Displays
const weatherDisplay = document.getElementById('weather-display');
const aqiDisplay = document.getElementById('aqi-display');
const recommendationDisplay = document.getElementById('recommendation-display');
const packingDisplay = document.getElementById('packing-display'); // New
const compareCard = document.getElementById('compare-card'); // New
const compareDisplay = document.getElementById('compare-display'); // New
const favListDisplay = document.getElementById('favorites-list'); // New

let currentCityName = "";
let forecastChartInstance = null; // Holds the Chart.js instance
let mapInstance = null; // Holds the Leaflet map instance
let mapMarker = null;

// --- 2. INITIALIZATION & AUTH ---
window.addEventListener('load', () => {
    setTimeout(() => {
        splashScreen.classList.add('hidden');
        checkLoginState(); 
        initMap(); // Initialize map layer early
        renderFavorites(); // Load saved cities
    }, 1500); 
});

function checkLoginState() {
    const savedUser = localStorage.getItem('ecoUsername');
    if (savedUser) {
        document.getElementById('user-display-name').textContent = savedUser;
        document.getElementById('profile-name').textContent = savedUser;
        mainApp.classList.remove('hidden');
    } else {
        loginScreen.classList.remove('hidden');
    }
}

document.getElementById('login-btn').addEventListener('click', () => {
    const name = document.getElementById('username-input').value.trim();
    if (name) {
        localStorage.setItem('ecoUsername', name);
        location.reload(); // Quick reload to mount everything cleanly
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.clear(); // Clears user and favorites
    location.reload();
});

// --- 3. TABS (Fixed Map Bug) ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
        btn.classList.add('active');
        document.getElementById(btn.getAttribute('data-target')).classList.remove('hidden');
        
        // Leaflet Maps glitch if they are initialized while hidden. This fixes it.
        if(btn.getAttribute('data-target') === 'dashboard-tab' && mapInstance) {
            setTimeout(() => mapInstance.invalidateSize(), 100);
        }
    });
});

// --- 4. API FETCH LOGIC ---
searchBtn.addEventListener('click', triggerSearch);
cityInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') triggerSearch(); });

async function triggerSearch() {
    const city1 = cityInput.value.trim();
    const city2 = compareInput.value.trim();
    
    if (city1) {
        currentCityName = city1;
        favBtn.classList.remove('hidden');
        await fetchEnvironmentData(city1);
        
        if (city2) {
            await fetchComparisonData(city1, city2);
        } else {
            compareCard.classList.add('hidden');
        }
    }
}

async function fetchEnvironmentData(city) {
    const apiKey = CONFIG.API_KEY; 
    
    try {
        // 1. Fetch Current Weather
        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
        if (!weatherRes.ok) throw new Error('Location not found');
        const data = await weatherRes.json();

        // 2. Fetch AQI
        const { lat, lon } = data.coord;
        const aqiRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
        const aqiData = await aqiRes.json();

        // 3. Fetch Forecast (for the Chart)
        const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
        const forecastData = await forecastRes.json();

        // Update UI Modules
        document.getElementById('current-city-label').textContent = `— ${data.name}`;
        updateWeatherUI(data);
        updateAqiUI(aqiData.list[0].main.aqi);
        updateMap(lat, lon, data.name);
        updateChart(forecastData.list);
        generatePackingList(data);
        generateSmartRecommendations(data, aqiData.list[0].main.aqi);

    } catch (error) {
        weatherDisplay.innerHTML = `<p style="color: #ff6b6b;">Error: ${error.message}</p>`;
    }
}

// --- 5. NEW MODULES: MAP & CHART ---
function initMap() {
    // Create map centered on the world
    mapInstance = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(mapInstance);
}

function updateMap(lat, lon, cityName) {
    mapInstance.setView([lat, lon], 11); // Zoom into city
    if (mapMarker) mapMarker.remove(); // Remove old pin
    mapMarker = L.marker([lat, lon]).addTo(mapInstance)
        .bindPopup(`<b>${cityName}</b>`).openPopup();
}

function updateChart(forecastList) {
    // Extract next 24 hours (8 data points, 3 hours apart)
    const next24h = forecastList.slice(0, 8);
    const labels = next24h.map(item => {
        const date = new Date(item.dt * 1000);
        return date.getHours() + ":00";
    });
    const temps = next24h.map(item => Math.round(item.main.temp));

    const ctx = document.getElementById('forecastChart').getContext('2d');
    
    // Destroy old chart if it exists so they don't overlap
    if (forecastChartInstance) forecastChartInstance.destroy();

    forecastChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: temps,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4 // Curves the line
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: 'white' } } },
            scales: {
                x: { ticks: { color: '#ccc' } },
                y: { ticks: { color: '#ccc' } }
            }
        }
    });
}

// --- 6. NEW MODULE: PACKING LIST & FAVORITES ---
function generatePackingList(data) {
    const temp = data.main.temp;
    const condition = data.weather[0].main.toLowerCase();
    let items = [];

    if (temp > 28) items.push("🧴 Sunscreen", "🕶️ Sunglasses", "🩳 Light Clothing");
    else if (temp < 15) items.push("🧥 Warm Jacket", "🧣 Scarf");
    else items.push("👕 Comfortable Layers");

    if (condition.includes('rain')) items.push("☔ Umbrella", "🥾 Waterproof Shoes");
    if (condition.includes('clear')) items.push("🧢 Sun Hat");

    let html = `<ul class="recommendation-list">`;
    items.forEach(item => html += `<li>${item}</li>`);
    packingDisplay.innerHTML = html + `</ul>`;
}

// Favorites Logic
favBtn.addEventListener('click', () => {
    let favorites = JSON.parse(localStorage.getItem('ecoFavorites')) || [];
    if (!favorites.includes(currentCityName)) {
        favorites.push(currentCityName);
        localStorage.setItem('ecoFavorites', JSON.stringify(favorites));
        renderFavorites();
        alert(`${currentCityName} saved to profile!`);
    }
});

function renderFavorites() {
    let favorites = JSON.parse(localStorage.getItem('ecoFavorites')) || [];
    if (favorites.length === 0) {
        favListDisplay.innerHTML = "<p>No locations saved yet.</p>";
        return;
    }
    
    favListDisplay.innerHTML = "";
    favorites.forEach(city => {
        const li = document.createElement('li');
        li.className = 'fav-item';
        li.innerHTML = `<span>${city}</span> <button onclick="removeFav('${city}')">Remove</button>`;
        favListDisplay.appendChild(li);
    });
}

window.removeFav = function(city) { // Global function for the inline onclick
    let favorites = JSON.parse(localStorage.getItem('ecoFavorites')) || [];
    favorites = favorites.filter(c => c !== city);
    localStorage.setItem('ecoFavorites', JSON.stringify(favorites));
    renderFavorites();
};

// --- 7. NEW MODULE: COMPARE CITIES ---
async function fetchComparisonData(city1, city2) {
    const apiKey = CONFIG.API_KEY;
    compareCard.classList.remove('hidden');
    compareDisplay.innerHTML = "<p>Analyzing comparison data...</p>";

    try {
        const res1 = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city1}&appid=${apiKey}&units=metric`);
        const res2 = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city2}&appid=${apiKey}&units=metric`);
        
        const data1 = await res1.json();
        const data2 = await res2.json();

        compareDisplay.innerHTML = `
            <div class="compare-grid">
                <div class="compare-col">
                    <h3>${data1.name}</h3>
                    <p class="temp-large">${Math.round(data1.main.temp)}°C</p>
                    <p>${data1.weather[0].main}</p>
                </div>
                <div class="compare-col">
                    <h3>${data2.name}</h3>
                    <p class="temp-large" style="color: #ff8c42;">${Math.round(data2.main.temp)}°C</p>
                    <p>${data2.weather[0].main}</p>
                </div>
            </div>
        `;
    } catch (error) {
        compareDisplay.innerHTML = "<p>Error loading comparison. Check city spelling.</p>";
    }
}

// --- 8. OLD UI RENDER FUNCTIONS (Slightly compressed) ---
function updateWeatherUI(data) {
    weatherDisplay.innerHTML = `<div class="temp-large">${Math.round(data.main.temp)}°C</div><p><strong>Condition:</strong> ${data.weather[0].main}</p><p><strong>Humidity:</strong> ${data.main.humidity}%</p>`;
}

function updateAqiUI(aqi) {
    let status = 'Optimal'; let alertColor = '#28a745';
    if (aqi === 3) { status = 'Moderate'; alertColor = '#ffc107'; }
    else if (aqi >= 4) { status = 'Hazardous'; alertColor = '#dc3545'; }
    aqiDisplay.innerHTML = `<h3>Index Level: ${aqi} / 5</h3><span class="aqi-badge" style="background-color: ${alertColor};">${status}</span>`;
}

function generateSmartRecommendations(data, aqi) {
    let recs = [];
    if (data.weather[0].main.toLowerCase().includes('rain')) recs.push("Precipitation detected. Re-routing to indoor facilities.");
    else recs.push("Conditions optimal. Safe for standard outdoor itineraries.");
    if (aqi > 150) recs.push("Warning: Poor air quality. Mask advised.");
    
    let html = '<ul class="recommendation-list">';
    recs.forEach(r => html += `<li>${r}</li>`);
    recommendationDisplay.innerHTML = html + '</ul>';
}