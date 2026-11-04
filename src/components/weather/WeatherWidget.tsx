import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Droplets, Wind, Thermometer, Loader2 } from 'lucide-react';
import { WeatherData } from '@/types';

interface WeatherWidgetProps {
  latitude?: number;
  longitude?: number;
}

export function WeatherWidget({ latitude = 40.7128, longitude = -74.006 }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code`
        );
        
        if (!response.ok) throw new Error('Failed to fetch weather');
        
        const data = await response.json();
        
        setWeather({
          temperature: data.current.temperature_2m,
          humidity: data.current.relative_humidity_2m,
          precipitation: data.current.precipitation,
          windSpeed: data.current.wind_speed_10m,
          description: getWeatherDescription(data.current.weather_code),
          icon: getWeatherIcon(data.current.weather_code),
        });
        setError(null);
      } catch (err) {
        setError('Unable to load weather');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-water-light to-secondary">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="bg-gradient-to-br from-water-light to-secondary">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">{error || 'No weather data'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-water-light to-secondary border-water/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
          <Cloud className="h-4 w-4 text-primary" />
          Current Weather
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-3xl font-bold font-display text-foreground">
              {Math.round(weather.temperature)}°C
            </p>
            <p className="text-sm text-muted-foreground">{weather.description}</p>
          </div>
          <div className="text-4xl">{weather.icon}</div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-card/50">
            <Droplets className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Humidity</p>
            <p className="text-sm font-medium">{weather.humidity}%</p>
          </div>
          <div className="p-2 rounded-lg bg-card/50">
            <Wind className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Wind</p>
            <p className="text-sm font-medium">{weather.windSpeed} km/h</p>
          </div>
          <div className="p-2 rounded-lg bg-card/50">
            <Thermometer className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Precip</p>
            <p className="text-sm font-medium">{weather.precipitation} mm</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Rain showers',
    95: 'Thunderstorm',
  };
  return descriptions[code] || 'Unknown';
}

function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌧️';
  if (code <= 65) return '🌧️';
  if (code <= 75) return '❄️';
  if (code <= 80) return '🌦️';
  return '⛈️';
}
