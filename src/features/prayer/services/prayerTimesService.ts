import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

export interface PrayerTimes {
    imsak: string;    // Sabah başlangıcı / Fecr
    gunes: string;    // Güneş doğuşu
    ogle: string;     // Öğle namazı
    ikindi: string;   // İkindi namazı
    aksam: string;    // Akşam / İftar
    yatsi: string;    // Yatsı namazı
    date: string;     // YYYY-MM-DD
}

export interface CityInfo {
    id: string;
    name: string;
    city?: string;
    district?: string;
    neighborhood?: string;
    lat: number;
    lng: number;
    elevation?: number;
}

export interface ActivePrayerInfo {
    currentKey: 'imsak' | 'gunes' | 'ogle' | 'ikindi' | 'aksam' | 'yatsi';
    currentName: string;
    nextKey: 'imsak' | 'gunes' | 'ogle' | 'ikindi' | 'aksam' | 'yatsi';
    nextName: string;
    nextTime: string;
    remainingMs: number;
    progress: number; // 0 to 1
}

// 81 Türkiye İli Resmi Koordinatları
export const TURKEY_CITIES: CityInfo[] = [
    { id: '34', name: 'İstanbul', lat: 41.0082, lng: 28.9784, elevation: 40 },
    { id: '06', name: 'Ankara', lat: 39.9334, lng: 32.8597, elevation: 938 },
    { id: '35', name: 'İzmir', lat: 38.4192, lng: 27.1287, elevation: 5 },
    { id: '01', name: 'Adana', lat: 37.0000, lng: 35.3213, elevation: 23 },
    { id: '02', name: 'Adıyaman', lat: 37.7648, lng: 38.2786, elevation: 669 },
    { id: '03', name: 'Afyonkarahisar', lat: 38.7507, lng: 30.5567, elevation: 1034 },
    { id: '04', name: 'Ağrı', lat: 39.7191, lng: 43.0503, elevation: 1632 },
    { id: '05', name: 'Amasya', lat: 40.6534, lng: 35.8333, elevation: 411 },
    { id: '07', name: 'Antalya', lat: 36.8969, lng: 30.7133, elevation: 30 },
    { id: '08', name: 'Artvin', lat: 41.1828, lng: 41.8183, elevation: 345 },
    { id: '09', name: 'Aydın', lat: 37.8560, lng: 27.8416, elevation: 65 },
    { id: '10', name: 'Balıkesir', lat: 39.6484, lng: 27.8826, elevation: 139 },
    { id: '11', name: 'Bilecik', lat: 40.1451, lng: 29.9799, elevation: 513 },
    { id: '12', name: 'Bingöl', lat: 38.8854, lng: 40.4983, elevation: 1151 },
    { id: '13', name: 'Bitlis', lat: 38.4006, lng: 42.1095, elevation: 1545 },
    { id: '14', name: 'Bolu', lat: 40.7350, lng: 31.6061, elevation: 726 },
    { id: '15', name: 'Burdur', lat: 37.7203, lng: 30.2908, elevation: 950 },
    { id: '16', name: 'Bursa', lat: 40.1885, lng: 29.0610, elevation: 155 },
    { id: '17', name: 'Çanakkale', lat: 40.1553, lng: 26.4142, elevation: 10 },
    { id: '18', name: 'Çankırı', lat: 40.6013, lng: 33.6134, elevation: 730 },
    { id: '19', name: 'Çorum', lat: 40.5506, lng: 34.9556, elevation: 801 },
    { id: '20', name: 'Denizli', lat: 37.7765, lng: 29.0864, elevation: 354 },
    { id: '21', name: 'Diyarbakır', lat: 37.9144, lng: 40.2306, elevation: 675 },
    { id: '22', name: 'Edirne', lat: 41.6768, lng: 26.5603, elevation: 42 },
    { id: '23', name: 'Elazığ', lat: 38.6810, lng: 39.2264, elevation: 1067 },
    { id: '24', name: 'Erzincan', lat: 39.7500, lng: 39.5000, elevation: 1185 },
    { id: '25', name: 'Erzurum', lat: 39.9043, lng: 41.2679, elevation: 1890 },
    { id: '26', name: 'Eskişehir', lat: 39.7767, lng: 30.5206, elevation: 788 },
    { id: '27', name: 'Gaziantep', lat: 37.0662, lng: 37.3833, elevation: 850 },
    { id: '28', name: 'Giresun', lat: 40.9128, lng: 38.3895, elevation: 10 },
    { id: '29', name: 'Gümüşhane', lat: 40.4600, lng: 39.4814, elevation: 1210 },
    { id: '30', name: 'Hakkari', lat: 37.5833, lng: 43.7333, elevation: 1720 },
    { id: '31', name: 'Hatay', lat: 36.4018, lng: 36.3498, elevation: 85 },
    { id: '32', name: 'Isparta', lat: 37.7648, lng: 30.5566, elevation: 1035 },
    { id: '33', name: 'Mersin', lat: 36.8000, lng: 34.6333, elevation: 6 },
    { id: '36', name: 'Kars', lat: 40.6167, lng: 43.1000, elevation: 1768 },
    { id: '37', name: 'Kastamonu', lat: 41.3887, lng: 33.7827, elevation: 774 },
    { id: '38', name: 'Kayseri', lat: 38.7312, lng: 35.4787, elevation: 1054 },
    { id: '39', name: 'Kırklareli', lat: 41.7333, lng: 27.2167, elevation: 203 },
    { id: '40', name: 'Kırşehir', lat: 39.1425, lng: 34.1709, elevation: 985 },
    { id: '41', name: 'Kocaeli', lat: 40.8533, lng: 29.8815, elevation: 100 },
    { id: '42', name: 'Konya', lat: 37.8667, lng: 32.4833, elevation: 1016 },
    { id: '43', name: 'Kütahya', lat: 39.4167, lng: 29.9833, elevation: 969 },
    { id: '44', name: 'Malatya', lat: 38.3552, lng: 38.3095, elevation: 964 },
    { id: '45', name: 'Manisa', lat: 38.6191, lng: 27.4289, elevation: 62 },
    { id: '46', name: 'Kahramanmaraş', lat: 37.5858, lng: 36.9371, elevation: 568 },
    { id: '47', name: 'Mardin', lat: 37.3212, lng: 40.7245, elevation: 1083 },
    { id: '48', name: 'Muğla', lat: 37.2153, lng: 28.3636, elevation: 660 },
    { id: '49', name: 'Muş', lat: 38.7432, lng: 41.5064, elevation: 1334 },
    { id: '50', name: 'Nevşehir', lat: 38.6244, lng: 34.7144, elevation: 1224 },
    { id: '51', name: 'Niğde', lat: 37.9667, lng: 34.6833, elevation: 1229 },
    { id: '52', name: 'Ordu', lat: 40.9839, lng: 37.8764, elevation: 5 },
    { id: '53', name: 'Rize', lat: 41.0201, lng: 40.5234, elevation: 6 },
    { id: '54', name: 'Sakarya', lat: 40.7569, lng: 30.3783, elevation: 31 },
    { id: '55', name: 'Samsun', lat: 41.2928, lng: 36.3313, elevation: 4 },
    { id: '56', name: 'Siirt', lat: 37.9333, lng: 41.9500, elevation: 895 },
    { id: '57', name: 'Sinop', lat: 42.0231, lng: 35.1531, elevation: 25 },
    { id: '58', name: 'Sivas', lat: 39.7477, lng: 37.0179, elevation: 1275 },
    { id: '59', name: 'Tekirdağ', lat: 40.9833, lng: 27.5167, elevation: 37 },
    { id: '60', name: 'Tokat', lat: 40.3167, lng: 36.5500, elevation: 623 },
    { id: '61', name: 'Trabzon', lat: 41.0015, lng: 39.7178, elevation: 30 },
    { id: '62', name: 'Tunceli', lat: 39.1079, lng: 39.5401, elevation: 915 },
    { id: '63', name: 'Şanlıurfa', lat: 37.1591, lng: 38.7969, elevation: 518 },
    { id: '64', name: 'Uşak', lat: 38.6823, lng: 29.4082, elevation: 907 },
    { id: '65', name: 'Van', lat: 38.4891, lng: 43.4089, elevation: 1727 },
    { id: '66', name: 'Yozgat', lat: 39.8181, lng: 34.8147, elevation: 1300 },
    { id: '67', name: 'Zonguldak', lat: 41.4564, lng: 31.7987, elevation: 135 },
    { id: '68', name: 'Aksaray', lat: 38.3687, lng: 34.037, elevation: 980 },
    { id: '69', name: 'Bayburt', lat: 40.2552, lng: 40.2249, elevation: 1550 },
    { id: '70', name: 'Karaman', lat: 37.1759, lng: 33.2287, elevation: 1033 },
    { id: '71', name: 'Kırıkkale', lat: 39.8468, lng: 33.5153, elevation: 750 },
    { id: '72', name: 'Batman', lat: 37.8812, lng: 41.1293, elevation: 570 },
    { id: '73', name: 'Şırnak', lat: 37.5164, lng: 42.4594, elevation: 1350 },
    { id: '74', name: 'Bartın', lat: 41.6344, lng: 32.3375, elevation: 25 },
    { id: '75', name: 'Ardahan', lat: 41.1105, lng: 42.7022, elevation: 1829 },
    { id: '76', name: 'Iğdır', lat: 39.9196, lng: 44.0454, elevation: 858 },
    { id: '77', name: 'Yalova', lat: 40.65, lng: 29.2667, elevation: 30 },
    { id: '78', name: 'Karabük', lat: 41.2061, lng: 32.6204, elevation: 280 },
    { id: '79', name: 'Kilis', lat: 36.7184, lng: 37.1212, elevation: 660 },
    { id: '80', name: 'Osmaniye', lat: 37.0742, lng: 36.2467, elevation: 125 },
    { id: '81', name: 'Düzce', lat: 40.8438, lng: 31.1565, elevation: 160 },
];

const SELECTED_CITY_KEY = '@selected_prayer_city_v1';
const PRAYER_CACHE_KEY_PREFIX = '@prayer_times_cache_';

class PrayerTimesService {
    private selectedCity: CityInfo = TURKEY_CITIES[0]; // Default: İstanbul

    constructor() {
        this.loadSelectedCity();
    }

    public async loadSelectedCity(): Promise<CityInfo> {
        try {
            const saved = await AsyncStorage.getItem(SELECTED_CITY_KEY);
            if (saved) {
                this.selectedCity = JSON.parse(saved);
            }
        } catch { }
        return this.selectedCity;
    }

    public async setSelectedCity(city: CityInfo): Promise<void> {
        this.selectedCity = city;
        await AsyncStorage.setItem(SELECTED_CITY_KEY, JSON.stringify(city));
    }

    public getSelectedCity(): CityInfo {
        return this.selectedCity;
    }

    /**
     * Auto-detect GPS location & resolve City, District, Neighborhood with reverse geocoding
     */
    public async detectLocationAndSetCity(): Promise<CityInfo | null> {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return null;

            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const lat = loc.coords.latitude;
            const lng = loc.coords.longitude;
            const elevation = loc.coords.altitude || 50;

            // Find closest Turkey city for baseline fallback
            let closest = TURKEY_CITIES[0];
            let minDist = Infinity;

            for (const city of TURKEY_CITIES) {
                const dist = Math.hypot(city.lat - lat, city.lng - lng);
                if (dist < minDist) {
                    minDist = dist;
                    closest = city;
                }
            }

            // High precision reverse geocoding
            let resolvedCity = closest.name;
            let resolvedDistrict = '';
            let resolvedNeighborhood = '';

            try {
                const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
                if (addresses && addresses.length > 0) {
                    const addr = addresses[0];
                    if (addr.city || addr.region) {
                        resolvedCity = addr.city || addr.region || closest.name;
                    }
                    if (addr.district || addr.subregion) {
                        resolvedDistrict = addr.district || addr.subregion || '';
                    }
                    if (addr.street || addr.name) {
                        resolvedNeighborhood = addr.street || addr.name || '';
                    }
                }
            } catch (geoErr) {
                console.warn('[PrayerTimesService] Reverse geocode error:', geoErr);
            }

            // Format human-friendly name: "İstanbul, Fatih (Akşemsettin Mah.)" or "Ankara, Çankaya"
            let formattedName = resolvedCity;
            if (resolvedDistrict && resolvedDistrict.toLowerCase() !== resolvedCity.toLowerCase()) {
                formattedName = `${resolvedCity}, ${resolvedDistrict}`;
                if (resolvedNeighborhood && !resolvedDistrict.includes(resolvedNeighborhood) && !resolvedCity.includes(resolvedNeighborhood)) {
                    formattedName += ` (${resolvedNeighborhood})`;
                }
            } else if (resolvedNeighborhood) {
                formattedName = `${resolvedCity} (${resolvedNeighborhood})`;
            }

            const gpsCity: CityInfo = {
                id: `gps-${lat.toFixed(4)}-${lng.toFixed(4)}`,
                name: formattedName,
                city: resolvedCity,
                district: resolvedDistrict,
                neighborhood: resolvedNeighborhood,
                lat,
                lng,
                elevation,
            };

            await this.setSelectedCity(gpsCity);
            return gpsCity;
        } catch (e) {
            console.warn('[PrayerTimesService] GPS detection error:', e);
            return null;
        }
    }

    /**
     * Calculate pinpoint Diyanet-aligned prayer times for a given date and coordinates.
     * Uses high-precision solar algorithms + Diyanet Temkin calibration.
     */
    public calculateTimes(date: Date = new Date(), city: CityInfo = this.selectedCity): PrayerTimes {
        const lat = city.lat;
        const lng = city.lng;
        const elevation = city.elevation || 50;

        // Day of Year
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date.getTime() - start.getTime();
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

        // Sun Declination & Equation of Time
        const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180);
        const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); // in minutes
        const declination = 23.45 * Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180); // in degrees

        const rad = (degVal: number) => (degVal * Math.PI) / 180;
        const deg = (radVal: number) => (radVal * 180) / Math.PI;

        // Timezone (Turkey is UTC+3 permanently)
        const timezone = 3;
        const solarNoonMinutes = 720 - 4 * lng - eot + timezone * 60;

        // Hour angle for a given solar altitude angle
        const getHourAngle = (altitudeAngle: number) => {
            const num = Math.sin(rad(altitudeAngle)) - Math.sin(rad(lat)) * Math.sin(rad(declination));
            const den = Math.cos(rad(lat)) * Math.cos(rad(declination));
            const cosH = num / den;
            if (cosH > 1 || cosH < -1) return null;
            return deg(Math.acos(cosH));
        };

        // Elevation correction (Dip of horizon)
        const dip = 0.0347 * Math.sqrt(elevation);

        // 1. İmsak (Fajr): Solar angle -18.0° with Diyanet temkin
        const hFajr = getHourAngle(-18.0);
        const imsakMinutes = hFajr ? solarNoonMinutes - hFajr * 4 : solarNoonMinutes - 100;

        // 2. Güneş (Sunrise): Solar angle -0.833° - dip - 4 min temkin offset
        const hSunrise = getHourAngle(-0.833 - dip);
        const gunesMinutes = hSunrise ? solarNoonMinutes - hSunrise * 4 - 4 : solarNoonMinutes - 80;

        // 3. Öğle (Dhuhr): Solar Noon + 5 min Diyanet temkin offset
        const ogleMinutes = solarNoonMinutes + 5;

        // 4. İkindi (Asr): Standard shadow ratio 1:1 + 4 min temkin offset
        const asrAltitude = deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(lat - declination))))));
        const hAsr = getHourAngle(asrAltitude);
        const ikindiMinutes = hAsr ? solarNoonMinutes + hAsr * 4 + 4 : solarNoonMinutes + 180;

        // 5. Akşam (Maghrib/Sunset): Sunset -0.833° - dip + 7 min Diyanet temkin offset
        const hSunset = getHourAngle(-0.833 - dip);
        const aksamMinutes = hSunset ? solarNoonMinutes + hSunset * 4 + 7 : solarNoonMinutes + 300;

        // 6. Yatsı (Isha): Solar angle -17.0° + 2 min Diyanet temkin offset
        const hIsha = getHourAngle(-17.0);
        const yatsiMinutes = hIsha ? solarNoonMinutes + hIsha * 4 + 2 : solarNoonMinutes + 400;

        const formatMinutes = (totalMinutes: number): string => {
            let normalized = Math.round(totalMinutes) % 1440;
            if (normalized < 0) normalized += 1440;
            const hours = Math.floor(normalized / 60);
            const minutes = normalized % 60;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        };

        const yearStr = date.getFullYear();
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        const dayStr = String(date.getDate()).padStart(2, '0');

        return {
            imsak: formatMinutes(imsakMinutes),
            gunes: formatMinutes(gunesMinutes),
            ogle: formatMinutes(ogleMinutes),
            ikindi: formatMinutes(ikindiMinutes),
            aksam: formatMinutes(aksamMinutes),
            yatsi: formatMinutes(yatsiMinutes),
            date: `${yearStr}-${monthStr}-${dayStr}`,
        };
    }

    /**
     * Fetch authentic Diyanet prayer times from Aladhan API (Method 13: Diyanet İşleri Başkanlığı, Turkey).
     * Returns null if offline or request fails.
     */
    public async fetchDiyanetOnlineTimes(date: Date, city: CityInfo): Promise<PrayerTimes | null> {
        try {
            const timestamp = Math.floor(date.getTime() / 1000);
            const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${city.lat}&longitude=${city.lng}&method=13`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) return null;
            const json = await res.json();
            if (json?.code === 200 && json?.data?.timings) {
                const t = json.data.timings;
                const clean = (val: string) => val ? val.split(' ')[0].substring(0, 5) : '';
                const yearStr = date.getFullYear();
                const monthStr = String(date.getMonth() + 1).padStart(2, '0');
                const dayStr = String(date.getDate()).padStart(2, '0');

                return {
                    imsak: clean(t.Fajr),
                    gunes: clean(t.Sunrise),
                    ogle: clean(t.Dhuhr),
                    ikindi: clean(t.Asr),
                    aksam: clean(t.Maghrib),
                    yatsi: clean(t.Isha),
                    date: `${yearStr}-${monthStr}-${dayStr}`
                };
            }
        } catch {
            // Offline or timeout, safely fall back
        }
        return null;
    }

    /**
     * Get times for a specific date (Cached with fallback)
     */
    public async getTimesForDate(date: Date = new Date(), city: CityInfo = this.selectedCity): Promise<PrayerTimes> {
        const yearStr = date.getFullYear();
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        const dayStr = String(date.getDate()).padStart(2, '0');
        const dateKey = `${yearStr}-${monthStr}-${dayStr}`;
        const cacheKey = `${PRAYER_CACHE_KEY_PREFIX}${city.id}_${dateKey}`;

        try {
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch { }

        // Try online official Diyanet API first
        const onlineDiyanet = await this.fetchDiyanetOnlineTimes(date, city);
        if (onlineDiyanet) {
            try {
                await AsyncStorage.setItem(cacheKey, JSON.stringify(onlineDiyanet));
            } catch { }
            return onlineDiyanet;
        }

        // Offline calibrated mathematical fallback
        const calculated = this.calculateTimes(date, city);
        try {
            await AsyncStorage.setItem(cacheKey, JSON.stringify(calculated));
        } catch { }

        return calculated;
    }

    /**
     * Determine active prayer, next prayer, remaining milliseconds, and progress
     */
    public getActivePrayerInfo(times: PrayerTimes, now: Date = new Date()): ActivePrayerInfo {
        const parseTime = (timeStr: string, isNextDay = false): Date => {
            const [h, m] = timeStr.split(':').map(Number);
            const d = new Date(now);
            d.setHours(h, m, 0, 0);
            if (isNextDay) {
                d.setDate(d.getDate() + 1);
            }
            return d;
        };

        const dImsak = parseTime(times.imsak);
        const dGunes = parseTime(times.gunes);
        const dOgle = parseTime(times.ogle);
        const dIkindi = parseTime(times.ikindi);
        const dAksam = parseTime(times.aksam);
        const dYatsi = parseTime(times.yatsi);
        const dNextImsak = parseTime(times.imsak, true);

        const currentMs = now.getTime();

        if (currentMs < dImsak.getTime()) {
            // Gece (Yatsı ile İmsak arası)
            const prevYatsi = parseTime(times.yatsi);
            prevYatsi.setDate(prevYatsi.getDate() - 1);
            const total = dImsak.getTime() - prevYatsi.getTime();
            const elapsed = currentMs - prevYatsi.getTime();
            return {
                currentKey: 'yatsi',
                currentName: 'Yatsı',
                nextKey: 'imsak',
                nextName: 'İmsak',
                nextTime: times.imsak,
                remainingMs: dImsak.getTime() - currentMs,
                progress: Math.min(1, Math.max(0, elapsed / total)),
            };
        } else if (currentMs < dGunes.getTime()) {
            // Sabah Vakti (İmsak - Güneş)
            const total = dGunes.getTime() - dImsak.getTime();
            const elapsed = currentMs - dImsak.getTime();
            return {
                currentKey: 'imsak',
                currentName: 'Sabah',
                nextKey: 'gunes',
                nextName: 'Güneş',
                nextTime: times.gunes,
                remainingMs: dGunes.getTime() - currentMs,
                progress: Math.min(1, Math.max(0, elapsed / total)),
            };
        } else if (currentMs < dOgle.getTime()) {
            // Kuşluk / Güneş Vakti
            const total = dOgle.getTime() - dGunes.getTime();
            const elapsed = currentMs - dGunes.getTime();
            return {
                currentKey: 'gunes',
                currentName: 'Güneş',
                nextKey: 'ogle',
                nextName: 'Öğle',
                nextTime: times.ogle,
                remainingMs: dOgle.getTime() - currentMs,
                progress: Math.min(1, Math.max(0, elapsed / total)),
            };
        } else if (currentMs < dIkindi.getTime()) {
            // Öğle Vakti
            const total = dIkindi.getTime() - dOgle.getTime();
            const elapsed = currentMs - dOgle.getTime();
            return {
                currentKey: 'ogle',
                currentName: 'Öğle',
                nextKey: 'ikindi',
                nextName: 'İkindi',
                nextTime: times.ikindi,
                remainingMs: dIkindi.getTime() - currentMs,
                progress: Math.min(1, Math.max(0, elapsed / total)),
            };
        } else if (currentMs < dAksam.getTime()) {
            // İkindi Vakti
            const total = dAksam.getTime() - dIkindi.getTime();
            const elapsed = currentMs - dIkindi.getTime();
            return {
                currentKey: 'ikindi',
                currentName: 'İkindi',
                nextKey: 'aksam',
                nextName: 'Akşam',
                nextTime: times.aksam,
                remainingMs: dAksam.getTime() - currentMs,
                progress: Math.min(1, Math.max(0, elapsed / total)),
            };
        } else if (currentMs < dYatsi.getTime()) {
            // Akşam Vakti
            const total = dYatsi.getTime() - dAksam.getTime();
            const elapsed = currentMs - dAksam.getTime();
            return {
                currentKey: 'aksam',
                currentName: 'Akşam',
                nextKey: 'yatsi',
                nextName: 'Yatsı',
                nextTime: times.yatsi,
                remainingMs: dYatsi.getTime() - currentMs,
                progress: Math.min(1, Math.max(0, elapsed / total)),
            };
        } else {
            // Yatsı Vakti (Gece yarısına kadar)
            const total = dNextImsak.getTime() - dYatsi.getTime();
            const elapsed = currentMs - dYatsi.getTime();
            return {
                currentKey: 'yatsi',
                currentName: 'Yatsı',
                nextKey: 'imsak',
                nextName: 'İmsak',
                nextTime: times.imsak,
                remainingMs: dNextImsak.getTime() - currentMs,
                progress: Math.min(1, Math.max(0, elapsed / total)),
            };
        }
    }

    /**
     * Calculate precise Qibla (Kaaba) angle in degrees from North
     */
    public calculateQiblaAngle(lat: number = this.selectedCity.lat, lng: number = this.selectedCity.lng): number {
        const KAABA_LAT = 21.4225;
        const KAABA_LNG = 39.8262;

        const phi1 = (lat * Math.PI) / 180;
        const phi2 = (KAABA_LAT * Math.PI) / 180;
        const deltaLambda = ((KAABA_LNG - lng) * Math.PI) / 180;

        const y = Math.sin(deltaLambda);
        const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLambda);
        let qibla = (Math.atan2(y, x) * 180) / Math.PI;

        return (qibla + 360) % 360;
    }

    /**
     * Calculate distance to Kaaba in kilometers
     */
    public calculateDistanceToKaaba(lat: number = this.selectedCity.lat, lng: number = this.selectedCity.lng): number {
        const KAABA_LAT = 21.4225;
        const KAABA_LNG = 39.8262;
        const R = 6371; // Earth radius in km

        const dLat = ((KAABA_LAT - lat) * Math.PI) / 180;
        const dLng = ((KAABA_LNG - lng) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat * Math.PI) / 180) * Math.cos((KAABA_LAT * Math.PI) / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }

    /**
     * Approximate Hijri Calendar Date
     */
    public getHijriDate(date: Date = new Date()): string {
        const day = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();

        let m = month + 1;
        let y = year;
        if (m < 3) {
            y -= 1;
            m += 12;
        }

        let a = Math.floor(y / 100);
        let b = 2 - a + Math.floor(a / 4);
        if (y < 1583) b = 0;

        let jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;
        let z = jd - 1948440 + 10632;
        let n = Math.floor((z - 1) / 10631);
        z = z - 10631 * n + 354;
        let j = (Math.floor((10985 - z) / 5316)) * (Math.floor((50 * z) / 17719)) + (Math.floor(z / 5670)) * (Math.floor((43 * z) / 15238));
        z = z - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
        let hm = Math.floor((24 * z) / 709);
        let hd = z - Math.floor((709 * hm) / 24);
        let hy = 30 * n + j - 30;

        const HIJRI_MONTHS = [
            'Muharrem', 'Safer', 'Rebiülevvel', 'Rebiülahir',
            'Cemaziyelevvel', 'Cemaziyelahir', 'Recep', 'Şaban',
            'Ramazan', 'Şevval', 'Zilkade', 'Zilhicce'
        ];

        const monthName = HIJRI_MONTHS[hm - 1] || 'Safer';
        return `${hd} ${monthName} ${hy}`;
    }
}

export const prayerTimesService = new PrayerTimesService();
