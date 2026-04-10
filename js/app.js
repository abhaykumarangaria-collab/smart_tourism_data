// --- 1. DOM ELEMENTS ---
const splashScreen = document.getElementById('splash-screen');
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username-input');
const userDisplayName = document.getElementById('user-display-name');
const profileName = document.getElementById('profile-name');
const logoutBtn = document.getElementById('logout-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const weatherDisplay = document.getElementById('weather-display');
const aqiDisplay = document.getElementById('aqi-display');
const recommendationDisplay = document.getElementById('recommendation-display');
const dashboardCards = document.querySelectorAll('.card');

// --- 2. STARTUP ANIMATION (Splash Screen) ---
window.addEventListener('load', () => {
    setTimeout(() => {
        splashScreen.style.animation = 'fadeOut 0.5s ease forwards';
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            checkLoginState(); 
        }, 500);
    }, 1500); 
});

// --- 3. GLOBAL CLICK ANIMATION ---
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        e.target.classList.add('btn-click-anim');
        setTimeout(() => e.target.classList.remove('btn-click-anim'), 200);
    }
});

// --- 4. LOGIN & AUTHENTICATION LOGIC ---
function checkLoginState() {
    const savedUser = localStorage.getItem('ecoUsername');
    if (savedUser) {
        showMainApp(savedUser);
    } else {
        loginScreen.classList.remove('hidden');
    }
}

loginBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (name) {
        localStorage.setItem('ecoUsername', name);
        loginScreen.classList.add('hidden');
        showMainApp(name);
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('ecoUsername');
    mainApp.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    usernameInput.value = '';
});

function showMainApp(name) {
    userDisplayName.textContent = name;
    profileName.textContent = name;
    mainApp.classList.remove('hidden');
}

// --- 5. TABBED NAVIGATION LOGIC ---
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(t => t.classList.add('hidden'));

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId).classList.remove('hidden');
    });
});

// --- 6. API FETCH LOGIC (OpenWeatherMap) ---
searchBtn.addEventListener('click', triggerSearch);
cityInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') triggerSearch(); });

function triggerSearch() {
    const city = cityInput.value.trim();
    if (city) fetchEnvironmentData(city);
}

async function fetchEnvironmentData(city) {
    weatherDisplay.innerHTML = '<p style="color: #888;">Fetching weather data...</p>';
    aqiDisplay.innerHTML = '<p style="color: #888;">Scanning air quality sensors...</p>';
    
    // YOUR API KEY:
    const apiKey = 'WEATHER_API_KEY'; 

    try {
        // Fetch Weather
        const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
        if (!weatherResponse.ok) throw new Error('Location not found in database');
        const rawWeatherData = await weatherResponse.json();

        // Fetch AQI
        const lat = rawWeatherData.coord.lat;
        const lon = rawWeatherData.coord.lon;
        const aqiResponse = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
        const rawAqiData = await aqiResponse.json();

        // Process Data
        const weather = {
            temp: Math.round(rawWeatherData.main.temp),
            condition: rawWeatherData.weather[0].main,
            humidity: rawWeatherData.main.humidity
        };
        const aqi = { value: rawAqiData.list[0].main.aqi };

        // Update UI
        updateWeatherUI(weather);
        updateAqiUI(aqi);
        generateSmartRecommendations(weather, { value: aqi.value * 50 });

        // Trigger Card Pop Animations
        dashboardCards.forEach(card => {
            card.classList.remove('card-update');
            void card.offsetWidth; // Trigger reflow
            card.classList.add('card-update');
        });

    } catch (error) {
        weatherDisplay.innerHTML = `<p style="color: #ff6b6b;">Error: ${error.message}</p>`;
        aqiDisplay.innerHTML = ''; recommendationDisplay.innerHTML = '';
    }
}

// --- 7. UI RENDER FUNCTIONS ---
function updateWeatherUI(weather) {
    weatherDisplay.innerHTML = `
        <div class="temp-large">${weather.temp}°C</div>
        <p><strong>Condition:</strong> ${weather.condition}</p>
        <p><strong>Humidity:</strong> ${weather.humidity}%</p>
    `;
}

function updateAqiUI(aqi) {
    let status = 'Optimal'; let alertColor = '#28a745'; // Green
    if (aqi.value === 3) { status = 'Moderate'; alertColor = '#ffc107'; } // Yellow
    else if (aqi.value >= 4) { status = 'Hazardous'; alertColor = '#dc3545'; } // Red
    
    aqiDisplay.innerHTML = `
        <h3>Index Level: ${aqi.value} / 5</h3>
        <span class="aqi-badge" style="background-color: ${alertColor};">${status}</span>
    `;
}

function generateSmartRecommendations(weather, aqi) {
    let recommendations = [];
    
    if (weather.condition.toLowerCase().includes('rain')) {
        recommendations.push("Precipitation detected. Re-routing outdoor plans to indoor facilities.");
    } else if (weather.temp > 35) {
        recommendations.push("Extreme temperature alert. Limit outdoor exposure and maintain hydration.");
    } else {
        recommendations.push("Conditions optimal. Safe for standard outdoor itineraries.");
    }

    if (aqi.value > 150) {
        recommendations.push("Warning: Poor air quality. N95 respiratory protection advised for outdoor activities.");
    }
    
    let listHTML = '<ul class="recommendation-list">';
    recommendations.forEach(rec => listHTML += `<li>${rec}</li>`);
    listHTML += '</ul>';
    recommendationDisplay.innerHTML = listHTML;
}
