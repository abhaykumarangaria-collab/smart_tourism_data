// 1. DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const weatherDisplay = document.getElementById('weather-display');
const aqiDisplay = document.getElementById('aqi-display');
const recommendationDisplay = document.getElementById('recommendation-display');

// 2. Event Listener for the Search Button
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        fetchEnvironmentData(city);
    } else {
        alert('Please enter a city name.');
    }
});

// 3. Event Listener for the 'Enter' Key
cityInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); 
        searchBtn.click(); 
    }
});

// 4. Main Function to Fetch Live Data
async function fetchEnvironmentData(city) {
    weatherDisplay.innerHTML = '<p>Loading weather...</p>';
    aqiDisplay.innerHTML = '<p>Loading air quality...</p>';
    
    // Your OpenWeatherMap API Key:
    const apiKey = '51be64207ac08e8b1012336287076270'; 

    try {
        // Fetch Weather Data
        const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
        
        if (!weatherResponse.ok) {
            throw new Error('City not found');
        }
        
        const rawWeatherData = await weatherResponse.json();

        // Extract Coordinates for the AQI API
        const lat = rawWeatherData.coord.lat;
        const lon = rawWeatherData.coord.lon;

        // Fetch Air Pollution Data
        const aqiResponse = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
        const rawAqiData = await aqiResponse.json();

        // Format the data for our UI
        const weather = {
            temp: Math.round(rawWeatherData.main.temp),
            condition: rawWeatherData.weather[0].main,
            humidity: rawWeatherData.main.humidity
        };
        
        const aqi = {
            value: rawAqiData.list[0].main.aqi // OpenWeather returns an index from 1 to 5
        };

        // Update the UI
        updateWeatherUI(weather);
        updateAqiUI(aqi);
        
        // We multiply the 1-5 scale by 50 just so it works with our existing Smart Algorithm logic
        generateSmartRecommendations(weather, { value: aqi.value * 50 });
        updateTheme(weather.condition, aqi.value * 50);

    } catch (error) {
        console.error("Error:", error);
        weatherDisplay.innerHTML = `<p style="color: red;">Error: ${error.message}. Please check spelling.</p>`;
        aqiDisplay.innerHTML = '';
        recommendationDisplay.innerHTML = '';
    }
}

// 5. UI Update Functions
function updateWeatherUI(weather) {
    weatherDisplay.innerHTML = `
        <div class="temp-large">${weather.temp}°C</div>
        <p><strong>Condition:</strong> ${weather.condition}</p>
        <p><strong>Humidity:</strong> ${weather.humidity}%</p>
    `;
}

// Updated AQI UI Function (Maps 1-5 scale to text)
function updateAqiUI(aqi) {
    let status = 'Good';
    let alertColor = 'var(--alert-color)'; // Default green

    // OpenWeatherMap AQI Scale: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
    if (aqi.value === 3) {
        status = 'Moderate';
        alertColor = '#ffc107'; // Yellow
    } else if (aqi.value >= 4) {
        status = 'Poor / Hazardous';
        alertColor = '#dc3545'; // Red
    }

    aqiDisplay.innerHTML = `
        <h3>Index Level: ${aqi.value} / 5</h3>
        <span class="aqi-badge" style="background-color: ${alertColor};">${status}</span>
    `;
}

// 6. The "Smart" Algorithm
function generateSmartRecommendations(weather, aqi) {
    let recommendations = [];

    // Weather rules
    if (weather.condition.toLowerCase().includes('rain')) {
        recommendations.push("Rain expected. Consider indoor activities or museums.");
    } else if (weather.temp > 35) {
        recommendations.push("Extreme heat. Stay hydrated and avoid outdoor activities during peak afternoon hours.");
    } else {
        recommendations.push("Weather is optimal for outdoor sightseeing and walking tours.");
    }

    // AQI rules
    if (aqi.value > 150) {
        recommendations.push("Poor air quality detected. Wearing a mask is recommended outdoors.");
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

// 7. Dynamic Theming
function updateTheme(condition, aqiValue) {
    document.body.className = ''; // Reset classes
    
    if (condition.toLowerCase().includes('rain')) {
        document.body.classList.add('theme-rainy');
    }
    if (aqiValue > 100) {
        document.body.classList.add('theme-poor-air');
    }
}