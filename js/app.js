// DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const weatherDisplay = document.getElementById('weather-display');
const aqiDisplay = document.getElementById('aqi-display');
const recommendationDisplay = document.getElementById('recommendation-display');

// Event Listener for the Search Button
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        fetchEnvironmentData(city);
    } else {
        alert('Please enter a city name.');
    }
});

// Main Function to Fetch and Process Data
async function fetchEnvironmentData(city) {
    // Show loading state
    weatherDisplay.innerHTML = '<p>Loading...</p>';
    aqiDisplay.innerHTML = '<p>Loading...</p>';
    
    try {
        /* =========================================================
        REAL API IMPLEMENTATION (Commented out for now)
        Once you get a free API key from OpenWeatherMap, uncomment this:
        
        const apiKey = 'YOUR_OPENWEATHER_API_KEY';
        const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
        const weatherData = await weatherResponse.json();
        =========================================================
        */

        // MOCK DATA: Simulating a response from an API for immediate testing
        const mockData = getMockData(city);
        
        // Process and Display Data
        updateWeatherUI(mockData.weather);
        updateAqiUI(mockData.aqi);
        generateSmartRecommendations(mockData.weather, mockData.aqi);
        updateTheme(mockData.weather.condition, mockData.aqi.value);

    } catch (error) {
        console.error("Error fetching data:", error);
        weatherDisplay.innerHTML = '<p>Error loading data. Please try again.</p>';
    }
}

// UI Update Functions
function updateWeatherUI(weather) {
    weatherDisplay.innerHTML = `
        <div class="temp-large">${weather.temp}°C</div>
        <p><strong>Condition:</strong> ${weather.condition}</p>
        <p><strong>Humidity:</strong> ${weather.humidity}%</p>
    `;
}

function updateAqiUI(aqi) {
    let status = 'Good';
    if (aqi.value > 100) status = 'Unhealthy';
    if (aqi.value > 200) status = 'Hazardous';

    aqiDisplay.innerHTML = `
        <h3>Index: ${aqi.value}</h3>
        <span class="aqi-badge">${status}</span>
    `;
}

// The "Smart" Algorithm
function generateSmartRecommendations(weather, aqi) {
    let recommendations = [];

    // Weather rules
    if (weather.condition.toLowerCase().includes('rain')) {
        recommendations.push("Heavy rain expected. Consider indoor activities like visiting local museums or art galleries.");
    } else if (weather.temp > 35) {
        recommendations.push("Extreme heat. Stay hydrated, avoid outdoor hiking between 12 PM and 4 PM.");
    } else {
        recommendations.push("Weather is optimal for outdoor sightseeing and walking tours.");
    }

    // AQI rules
    if (aqi.value > 150) {
        recommendations.push("Poor air quality detected. Wearing an N95 mask is recommended outdoors.");
        recommendations.push("Sensitive groups should avoid prolonged outdoor exertion.");
    }

    // Render the list
    let listHTML = '<ul class="recommendation-list">';
    recommendations.forEach(rec => {
        listHTML += `<li>${rec}</li>`;
    });
    listHTML += '</ul>';
    
    recommendationDisplay.innerHTML = listHTML;
}

// Dynamic Theming
function updateTheme(condition, aqiValue) {
    // Reset classes
    document.body.className = '';
    
    // Set weather theme
    if (condition.toLowerCase().includes('rain')) {
        document.body.classList.add('theme-rainy');
    }

    // Set AQI theme (overrides accent colors)
    if (aqiValue > 100) {
        document.body.classList.add('theme-poor-air');
    }
}

// --- Helper Function for Mocking Data ---
function getMockData(city) {
    // Simulate different conditions based on city length just to show varied data
    if (city.length > 6) {
        return {
            weather: { temp: 22, condition: 'Rainy', humidity: 80 },
            aqi: { value: 65 } // Good air, bad weather
        };
    } else {
        return {
            weather: { temp: 36, condition: 'Clear', humidity: 40 },
            aqi: { value: 160 } // Good weather, bad air
        };
    }
}