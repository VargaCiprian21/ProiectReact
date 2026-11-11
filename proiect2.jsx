import { useState, useEffect } from 'react';
import './App.css';

// --- DATE ȘI FUNCȚII AJUTĂTOARE ---
const defaultCities = [
  { name: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'Londra', lat: 51.5074, lon: -0.1278 },
  { name: 'Tokyo', lat: 35.6895, lon: 139.6917 },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708 }
];

const getWeatherDescription = (code) => {
  const weatherCodes = {
    0: { desc: 'Senin', emoji: '☀️' }, 1: { desc: 'Predominant senin', emoji: '🌤️' },
    2: { desc: 'Parțial noros', emoji: '⛅' }, 3: { desc: 'Noros', emoji: '☁️' },
    45: { desc: 'Ceață', emoji: '🌫️' }, 48: { desc: 'Ceață', emoji: '🌫️' },
    51: { desc: 'Averse slabe', emoji: '🌦️' }, 53: { desc: 'Averse moderate', emoji: '🌦️' },
    55: { desc: 'Averse dense', emoji: '🌧️' }, 61: { desc: 'Ploaie slabă', emoji: '🌧️' },
    63: { desc: 'Ploaie moderată', emoji: '🌧️' }, 65: { desc: 'Ploaie puternică', emoji: '🌧️' },
    71: { desc: 'Ninsoare slabă', emoji: '🌨️' }, 73: { desc: 'Ninsoare moderată', emoji: '❄️' },
    75: { desc: 'Ninsoare puternică', emoji: '❄️' }, 80: { desc: 'Averse', emoji: '🌦️' },
    81: { desc: 'Averse puternice', emoji: '🌧️' }, 82: { desc: 'Averse violente', emoji: '⛈️' },
    95: { desc: 'Furtună', emoji: '🌩️' }, 96: { desc: 'Furtună grindină', emoji: '⛈️' },
    99: { desc: 'Furtună puternică', emoji: '⛈️' }
  };
  return weatherCodes[code] || { desc: 'Condiții variabile', emoji: '🌡️' };
};

const updateBackgroundImage = (code) => {
  let imageUrl = 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?auto=format&fit=crop&w=1920&q=80';
  if (code === 2 || code === 3) imageUrl = 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1920&q=80';
  else if (code === 45 || code === 48) imageUrl = 'https://images.unsplash.com/photo-1487621167305-5d248087c724?auto=format&fit=crop&w=1920&q=80';
  else if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82)) imageUrl = 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?auto=format&fit=crop&w=1920&q=80';
  else if (code >= 71 && code <= 75) imageUrl = 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=1920&q=80';
  else if (code >= 95 && code <= 99) imageUrl = 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?auto=format&fit=crop&w=1920&q=80';
  document.body.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('${imageUrl}')`;
};

// --- COMPONENTA PRINCIPALĂ ---
export default function App() {
  // State-uri globale
  const [useMetric, setUseMetric] = useState(true);
  const [view, setView] = useState('home'); // 'home' sau 'result'
  const [lastLocation, setLastLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  
  // State-uri pentru căutare și sugestii
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  
  // State-uri pentru favorite și dashboard
  const [showFavoritesSection, setShowFavoritesSection] = useState(false);
  const [favoriteCities, setFavoriteCities] = useState(() => JSON.parse(localStorage.getItem('meteo_favorites')) || ['Brașov', 'Londra']);
  const [favInputVal, setFavInputVal] = useState('');
  const [homeWeather, setHomeWeather] = useState([]);
  const [favWeather, setFavWeather] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  const tempUnit = useMetric ? 'celsius' : 'fahrenheit';
  const windUnit = useMetric ? 'kmh' : 'mph';
  const tempSymbol = useMetric ? '°C' : '°F';
  const windSymbol = useMetric ? 'km/h' : 'mph';

  // 1. Efect pentru încărcarea orașelor de pe Home
  useEffect(() => {
    const fetchHome = async () => {
      const results = await Promise.all(defaultCities.map(async (city) => {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true&temperature_unit=${tempUnit}`);
        const data = await res.json();
        return { ...city, temp: Math.round(data.current_weather.temperature) };
      }));
      setHomeWeather(results);
    };
    fetchHome();
  }, [tempUnit]);

  // 2. Efect pentru încărcarea favoritelor
  useEffect(() => {
    const fetchFavorites = async () => {
      const results = [];
      for (const city of favoriteCities) {
        try {
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&format=json`);
          const geoData = await geoRes.json();
          if (!geoData.results) continue;
          
          const { latitude, longitude, name } = geoData.results[0];
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=${tempUnit}`);
          const data = await weatherRes.json();
          
          results.push({ name, latitude, longitude, current: data.current_weather });
        } catch (err) {
          console.error('Eroare la favorite:', err);
        }
      }
      setFavWeather(results);
    };
    fetchFavorites();
    localStorage.setItem('meteo_favorites', JSON.stringify(favoriteCities));
  }, [favoriteCities, tempUnit]);

  // 3. Efect pentru refresh la orașul curent vizualizat dacă se schimbă unitatea (°C / °F)
  useEffect(() => {
    if (lastLocation && view === 'result') {
      fetchWeatherByCoords(lastLocation.lat, lastLocation.lon, lastLocation.name);
    }
  }, [useMetric]);

  // 4. Efect pentru Autocomplete (Debounce)
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=ro&format=json`);
        const data = await res.json();
        setSuggestions(data.results || []);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Funcția principală de preluare date pentru un oraș
  const fetchWeatherByCoords = async (latitude, longitude, locationName) => {
    setLastLocation({ lat: latitude, lon: longitude, name: locationName });
    setView('result');
    setErrorMsg(null);
    setSearchQuery('');
    setSuggestions([]);

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset&temperature_unit=${tempUnit}&windspeed_unit=${windUnit}&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.current_weather) throw new Error('Nu s-au putut prelua datele.');
      
      updateBackgroundImage(data.current_weather.weathercode);
      setWeatherData(data);
    } catch (err) {
      setErrorMsg(err.message);
      setWeatherData(null);
    }
  };

  // Căutare din form
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=ro&format=json`);
      const data = await res.json();
      if (!data.results?.length) throw new Error('Orașul nu a fost găsit!');
      const loc = data.results[0];
      const displayName = `${loc.name}${loc.country ? `, ${loc.country}` : ''}`;
      fetchWeatherByCoords(loc.latitude, loc.longitude, displayName);
    } catch (err) {
      setView('result');
      setErrorMsg(err.message);
      setWeatherData(null);
    }
  };

  // Geolocație
  const handleGeoClick = () => {
    if (!navigator.geolocation) return alert('Geolocația nu este suportată.');
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude, '📍 Locația ta curentă'),
      () => alert('Accesul la locație a fost respins.')
    );
  };

  // Logica de Favorite
  const toggleFavorite = (cityName) => {
    const isFav = favoriteCities.includes(cityName);
    if (isFav) {
      setFavoriteCities(prev => prev.filter(c => c !== cityName));
    } else {
      setFavoriteCities(prev => [...prev, cityName]);
    }
  };

  const handleAddFavForm = (e) => {
    e.preventDefault();
    const city = favInputVal.trim();
    if (city && !favoriteCities.includes(city)) {
      setFavoriteCities(prev => [...prev, city]);
    }
    setFavInputVal('');
  };

  // Randare
  return (
    <>
      <nav className="top-navbar">
        <h1 className="nav-logo" title="Înapoi la pagina principală" onClick={() => { setView('home'); updateBackgroundImage(0); }}>
          Meteo<span>Pro</span>
        </h1>
        
        <div className="search-wrapper">
          <form className="nav-search-form" onSubmit={handleSearchSubmit}>
            <input type="text" placeholder="Caută un oraș (ex: Paris)..." autoComplete="off"
                   value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <button type="submit" className="nav-search-btn">🔍</button>
          </form>
          
          {suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map((city, idx) => (
                <li key={idx} onClick={() => fetchWeatherByCoords(city.latitude, city.longitude, `${city.name}, ${city.country || ''}`)}>
                  {city.name}, {city.country || ''}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="nav-actions">
          <button type="button" className="nav-btn" title="Vremea în locația mea" onClick={handleGeoClick}>📍</button>
          <button type="button" className="nav-btn" title="Schimbă unitățile" onClick={() => setUseMetric(!useMetric)}>
            {useMetric ? '°C' : '°F'}
          </button>
          <button type="button" className="nav-btn" title="Vezi Favorite" onClick={() => setShowFavoritesSection(!showFavoritesSection)}>⭐</button>
        </div>
      </nav>

      <main className="dashboard-container">
        {/* ECRAN HOME */}
        {view === 'home' && (
          <div className="home-dashboard">
            <h2 className="dashboard-title">🌍 Vremea în lume chiar acum</h2>
            <div className="world-grid">
              {homeWeather.map((city, idx) => (
                <div key={idx} className="world-card" onClick={() => fetchWeatherByCoords(city.lat, city.lon, city.name)}>
                  <div className="world-city">{city.name}</div>
                  <div className="world-temp">{city.temp}{tempSymbol}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ECRAN REZULTAT */}
        {view === 'result' && (
          <div className="result-container">
            {errorMsg ? (
              <p className="error" style={{color: 'red', fontWeight: 'bold'}}>❌ Eroare: {errorMsg}</p>
            ) : weatherData ? (
              <>
                <div className="city-header-wrapper">
                  <h2 className="city-name" style={{ marginBottom: 0 }}>{lastLocation.name}</h2>
                  <button 
                    className={`add-fav-btn ${favoriteCities.includes(lastLocation.name) ? 'added' : ''}`}
                    onClick={() => toggleFavorite(lastLocation.name)}
                  >
                    {favoriteCities.includes(lastLocation.name) ? '⭐ Salvat' : '➕ Adaugă la favorite'}
                  </button>
                </div>

                <div className="weather-desc">
                  <span>{getWeatherDescription(weatherData.current_weather.weathercode).emoji}</span> {getWeatherDescription(weatherData.current_weather.weathercode).desc}
                </div>
                
                <div className="temp">{Math.round(weatherData.current_weather.temperature)}{tempSymbol}</div>
                
                <div className="details">
                  <div className="detail-item"><strong>Vânt:</strong> {weatherData.current_weather.windspeed} {windSymbol}</div>
                  <div className="detail-item"><strong>Direcție:</strong> {weatherData.current_weather.winddirection}°</div>
                </div>
                
                <div className="astro-details">
                  <div className="astro-item">🌅 Răsărit: {weatherData.daily.sunrise[0].split('T')[1]}</div>
                  <div className="astro-item">🌇 Apus: {weatherData.daily.sunset[0].split('T')[1]}</div>
                </div>

                {/* Prognoza pe 5 zile */}
                <div className="forecast-container">
                  <h3 className="forecast-title">Prognoză 5 Zile 📅</h3>
                  <div className="forecast-cards">
                    {weatherData.daily.time.slice(0, 5).map((time, i) => {
                      const dateObj = new Date(time);
                      const dayName = i === 0 ? 'Azi' : dateObj.toLocaleDateString('ro-RO', { weekday: 'short' });
                      const dateFormatted = dateObj.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
                      const dayInfo = getWeatherDescription(weatherData.daily.weathercode[i]);
                      
                      return (
                        <div key={i} className="forecast-card">
                          <span className="forecast-day">{dayName}</span>
                          <span className="forecast-date">{dateFormatted}</span>
                          <span className="forecast-emoji">{dayInfo.emoji}</span>
                          <span className="forecast-temp"><strong>{Math.round(weatherData.daily.temperature_2m_max[i])}°</strong> / {Math.round(weatherData.daily.temperature_2m_min[i])}°</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Radar */}
                <div style={{ marginTop: '25px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '15px' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#2c3e50', marginBottom: '15px' }}>Radar Precipitații 🛰️</h3>
                  <iframe 
                    title="RainRadar"
                    src={`https://www.rainviewer.com/map.html?loc=${lastLocation.lat},${lastLocation.lon},7&oParams=1,0,1&c=1&o=83&ac=0&g=0&be=0&bd=0&v=1`} 
                    width="100%" height="320" frameBorder="0" 
                    style={{ border: 'none', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                  </iframe>
                </div>
              </>
            ) : (
              <p>Se încarcă datele...</p>
            )}
          </div>
        )}

        {/* SECȚIUNE FAVORITE */}
        {showFavoritesSection && (
          <div className="favorites-section">
            <h3>Orașe Favorite ⭐</h3>
            <form id="fav-form" onSubmit={handleAddFavForm}>
              <input type="text" placeholder="Adaugă un oraș (ex: Roma)" value={favInputVal} onChange={(e) => setFavInputVal(e.target.value)} />
              <button type="submit">+ Adaugă</button>
            </form>
            
            <div className="favorites-grid">
              {favWeather.map((city, idx) => {
                const info = getWeatherDescription(city.current.weathercode);
                return (
                  <div key={idx} className="fav-card" onClick={() => {
                    fetchWeatherByCoords(city.latitude, city.longitude, city.name);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    <button className="remove-fav" title="Șterge" onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(city.name);
                    }}>&times;</button>
                    <div className="fav-title">{city.name}</div>
                    <div>{info.emoji}</div>
                    <div className="fav-temp">{Math.round(city.current.temperature)}{tempSymbol}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </>
  );
}