import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { TURKEY_CITIES, DIYANET_CITY_MAPPING } from '../data/diyanetCities';

export { TURKEY_CITIES };

export interface PrayerTimes {
    imsak: string;    // Sabah başlangıcı / Fecr
    gunes: string;    // Güneş doğuşu
    ogle: string;     // Öğle namazı
    ikindi: string;   // İkindi namazı
    aksam: string;    // Akşam / İftar
    yatsi: string;    // Yatsı namazı
    date: string;     // YYYY-MM-DD
    hijriDate?: string; // Resmi Diyanet Hicrî Tarih (ör. "28 Rebiülevvel 1448")
    source?: 'diyanet_official' | 'diyanet_mirror' | 'aladhan_diyanet' | 'calculated';
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
    diyanetDistrictId?: string;
    diyanetStateId?: string;
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

const SELECTED_CITY_KEY = '@selected_prayer_city_v2';
const PRAYER_CACHE_KEY_PREFIX = '@prayer_times_diyanet_v2_';

class PrayerTimesService {
    private selectedCity: CityInfo = TURKEY_CITIES[0]; // Default: İstanbul

    constructor() {
        this.loadSelectedCity();
    }

    public async loadSelectedCity(): Promise<CityInfo> {
        try {
            const saved = await AsyncStorage.getItem(SELECTED_CITY_KEY);
            if (saved) {
                const parsed: CityInfo = JSON.parse(saved);
                // Ensure diyanetDistrictId is populated
                if (!parsed.diyanetDistrictId) {
                    parsed.diyanetDistrictId = this.resolveDiyanetDistrictId(parsed);
                }
                this.selectedCity = parsed;
            }
        } catch { }
        return this.selectedCity;
    }

    public async setSelectedCity(city: CityInfo): Promise<void> {
        if (!city.diyanetDistrictId) {
            city.diyanetDistrictId = this.resolveDiyanetDistrictId(city);
        }
        this.selectedCity = city;
        await AsyncStorage.setItem(SELECTED_CITY_KEY, JSON.stringify(city));
    }

    public getSelectedCity(): CityInfo {
        return this.selectedCity;
    }

    /**
     * Resolve official Diyanet district ID for a city/district
     */
    public resolveDiyanetDistrictId(city: CityInfo): string {
        if (city.diyanetDistrictId) return city.diyanetDistrictId;

        const norm = (s: string) => s.toLocaleUpperCase('tr-TR').trim();
        const candidateNames = [
            city.district,
            city.city,
            city.name,
            city.name.split(',')[0],
        ].filter(Boolean) as string[];

        for (const name of candidateNames) {
            const n = norm(name);
            const entry = DIYANET_CITY_MAPPING[n] || Object.entries(DIYANET_CITY_MAPPING).find(([k]) => norm(k) === n)?.[1];
            if (entry) return entry.districtId;
        }

        // Closest city in Turkey by coordinates
        let closest = TURKEY_CITIES[0];
        let minDist = Infinity;
        for (const c of TURKEY_CITIES) {
            const dist = Math.hypot(c.lat - city.lat, c.lng - city.lng);
            if (dist < minDist) {
                minDist = dist;
                closest = c;
            }
        }

        return closest.diyanetDistrictId || '9541'; // Fallback Istanbul (9541)
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
                diyanetDistrictId: closest.diyanetDistrictId,
                diyanetStateId: closest.diyanetStateId
            };

            // If resolvedCity or resolvedDistrict matches a Diyanet city, resolve its district ID
            gpsCity.diyanetDistrictId = this.resolveDiyanetDistrictId(gpsCity);

            await this.setSelectedCity(gpsCity);
            return gpsCity;
        } catch (e) {
            console.warn('[PrayerTimesService] GPS detection error:', e);
            return null;
        }
    }

    /**
     * Primary Source: Fetch authentic monthly Diyanet prayer times from ezanvakti.imsakiyem.com API
     * Caches the entire month (30 days) in one single network call.
     */
    public async fetchOfficialDiyanetTimes(date: Date, districtId: string): Promise<PrayerTimes | null> {
        try {
            const url = `https://ezanvakti.imsakiyem.com/api/prayer-times/${districtId}/monthly`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) return null;
            const json = await res.json();
            const list: any[] = json.data || [];
            if (!Array.isArray(list) || list.length === 0) return null;

            const targetDateStr = this.formatDateKey(date);
            let matchedTarget: PrayerTimes | null = null;

            // Cache all 30 days locally in AsyncStorage
            for (const item of list) {
                if (!item.times || !item.date) continue;
                const dKey = item.date.substring(0, 10);
                const pTimes: PrayerTimes = {
                    imsak: item.times.imsak,
                    gunes: item.times.gunes,
                    ogle: item.times.ogle,
                    ikindi: item.times.ikindi,
                    aksam: item.times.aksam,
                    yatsi: item.times.yatsi,
                    date: dKey,
                    hijriDate: item.hijri_date?.full_date || '',
                    source: 'diyanet_official'
                };

                const cacheKey = `${PRAYER_CACHE_KEY_PREFIX}${districtId}_${dKey}`;
                AsyncStorage.setItem(cacheKey, JSON.stringify(pTimes)).catch(() => {});

                if (dKey === targetDateStr) {
                    matchedTarget = pTimes;
                }
            }

            return matchedTarget;
        } catch (e) {
            console.warn('[PrayerTimesService] Official Diyanet fetch error:', e);
            return null;
        }
    }

    /**
     * Secondary Mirror Source: Fetch Diyanet prayer times from namazvakti.mtopal.dev
     */
    public async fetchDiyanetMirrorTimes(date: Date, districtId: string): Promise<PrayerTimes | null> {
        try {
            const url = `https://namazvakti.mtopal.dev/vakitler/${districtId}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) return null;
            const list = await res.json();
            if (!Array.isArray(list) || list.length === 0) return null;

            const targetDateStr = this.formatDateKey(date);
            let matchedTarget: PrayerTimes | null = null;

            for (const item of list) {
                const rawIso = item.MiladiTarihUzunIso8601 || '';
                const dKey = rawIso ? rawIso.substring(0, 10) : '';
                if (!dKey) continue;

                const pTimes: PrayerTimes = {
                    imsak: item.Imsak,
                    gunes: item.Gunes,
                    ogle: item.Ogle,
                    ikindi: item.Ikindi,
                    aksam: item.Aksam,
                    yatsi: item.Yatsi,
                    date: dKey,
                    hijriDate: item.HicriTarihUzun || item.HicriTarihKisa || '',
                    source: 'diyanet_mirror'
                };

                const cacheKey = `${PRAYER_CACHE_KEY_PREFIX}${districtId}_${dKey}`;
                AsyncStorage.setItem(cacheKey, JSON.stringify(pTimes)).catch(() => {});

                if (dKey === targetDateStr) {
                    matchedTarget = pTimes;
                }
            }

            return matchedTarget;
        } catch (e) {
            console.warn('[PrayerTimesService] Mirror Diyanet fetch error:', e);
            return null;
        }
    }

    /**
     * Tertiary Fallback: Aladhan API with direct DD-MM-YYYY format (no 302 redirect!)
     * and calibrated with Diyanet official temkin offsets.
     */
    public async fetchAladhanTimes(date: Date, city: CityInfo): Promise<PrayerTimes | null> {
        try {
            const dayStr = String(date.getDate()).padStart(2, '0');
            const monthStr = String(date.getMonth() + 1).padStart(2, '0');
            const yearStr = date.getFullYear();
            const dateFormatted = `${dayStr}-${monthStr}-${yearStr}`;

            const url = `https://api.aladhan.com/v1/timings/${dateFormatted}?latitude=${city.lat}&longitude=${city.lng}&method=13`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) return null;
            const json = await res.json();
            if (json?.code === 200 && json?.data?.timings) {
                const t = json.data.timings;
                const clean = (val: string) => val ? val.split(' ')[0].substring(0, 5) : '';

                const addMin = (timeStr: string, mins: number) => {
                    const [h, m] = timeStr.split(':').map(Number);
                    const total = h * 60 + m + mins;
                    const nh = Math.floor((total % 1440) / 60);
                    const nm = total % 60;
                    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
                };

                const fajr = clean(t.Fajr);
                const sunrise = clean(t.Sunrise);
                const dhuhr = clean(t.Dhuhr);
                const asr = clean(t.Asr);
                const maghrib = addMin(clean(t.Maghrib), 1);
                const isha = addMin(clean(t.Isha), 1);

                return {
                    imsak: fajr,
                    gunes: sunrise,
                    ogle: dhuhr,
                    ikindi: asr,
                    aksam: maghrib,
                    yatsi: isha,
                    date: `${yearStr}-${monthStr}-${dayStr}`,
                    source: 'aladhan_diyanet'
                };
            }
        } catch { }
        return null;
    }

    /**
     * Offline Mathematical Fallback: Calibrated with Diyanet 1982 rules.
     */
    public calculateTimes(date: Date = new Date(), city: CityInfo = this.selectedCity): PrayerTimes {
        const lat = city.lat;
        const lng = city.lng;
        const elevation = city.elevation || 50;

        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date.getTime() - start.getTime();
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

        const B = (360 / 365) * (dayOfYear - 81) * (Math.PI / 180);
        const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
        const declination = 23.45 * Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180);

        const rad = (degVal: number) => (degVal * Math.PI) / 180;
        const deg = (radVal: number) => (radVal * 180) / Math.PI;

        const timezone = 3;
        const solarNoonMinutes = 720 - 4 * lng - eot + timezone * 60;

        const getHourAngle = (altitudeAngle: number) => {
            const num = Math.sin(rad(altitudeAngle)) - Math.sin(rad(lat)) * Math.sin(rad(declination));
            const den = Math.cos(rad(lat)) * Math.cos(rad(declination));
            const cosH = num / den;
            if (cosH > 1 || cosH < -1) return null;
            return deg(Math.acos(cosH));
        };

        const dip = 0.0347 * Math.sqrt(elevation);

        const hFajr = getHourAngle(-18.0);
        const imsakMinutes = hFajr ? solarNoonMinutes - hFajr * 4 : solarNoonMinutes - 100;

        const hSunrise = getHourAngle(-0.833 - dip);
        const gunesMinutes = hSunrise ? solarNoonMinutes - hSunrise * 4 : solarNoonMinutes - 80;

        const ogleMinutes = solarNoonMinutes + 4;

        const asrAltitude = deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(lat - declination))))));
        const hAsr = getHourAngle(asrAltitude);
        const ikindiMinutes = hAsr ? solarNoonMinutes + hAsr * 4 + 4 : solarNoonMinutes + 180;

        const hSunset = getHourAngle(-0.833 - dip);
        const aksamMinutes = hSunset ? solarNoonMinutes + hSunset * 4 + 7 : solarNoonMinutes + 300;

        const hIsha = getHourAngle(-17.0);
        const yatsiMinutes = hIsha ? solarNoonMinutes + hIsha * 4 + 2 : solarNoonMinutes + 400;

        const formatMinutes = (totalMinutes: number): string => {
            let normalized = Math.round(totalMinutes) % 1440;
            if (normalized < 0) normalized += 1440;
            const hours = Math.floor(normalized / 60);
            const minutes = normalized % 60;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        };

        const dateKey = this.formatDateKey(date);

        return {
            imsak: formatMinutes(imsakMinutes),
            gunes: formatMinutes(gunesMinutes),
            ogle: formatMinutes(ogleMinutes),
            ikindi: formatMinutes(ikindiMinutes),
            aksam: formatMinutes(aksamMinutes),
            yatsi: formatMinutes(yatsiMinutes),
            date: dateKey,
            source: 'calculated',
        };
    }

    private formatDateKey(date: Date): string {
        const yearStr = date.getFullYear();
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        const dayStr = String(date.getDate()).padStart(2, '0');
        return `${yearStr}-${monthStr}-${dayStr}`;
    }

    /**
     * Get times for a specific date (Cached with Multi-Tier Diyanet Resolution)
     */
    public async getTimesForDate(date: Date = new Date(), city: CityInfo = this.selectedCity): Promise<PrayerTimes> {
        const dateKey = this.formatDateKey(date);
        const districtId = this.resolveDiyanetDistrictId(city);
        const cacheKey = `${PRAYER_CACHE_KEY_PREFIX}${districtId}_${dateKey}`;

        // 1. Check local cache
        try {
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
                const parsed: PrayerTimes = JSON.parse(cached);
                if (parsed && parsed.imsak && parsed.source !== 'calculated') {
                    return parsed;
                }
            }
        } catch { }

        // 2. Try Primary Source: Official Diyanet Monthly API
        const official = await this.fetchOfficialDiyanetTimes(date, districtId);
        if (official) return official;

        // 3. Try Secondary Mirror: Diyanet Mirror API
        const mirror = await this.fetchDiyanetMirrorTimes(date, districtId);
        if (mirror) return mirror;

        // 4. Try Tertiary: Calibrated Aladhan Diyanet
        const aladhan = await this.fetchAladhanTimes(date, city);
        if (aladhan) {
            try {
                await AsyncStorage.setItem(cacheKey, JSON.stringify(aladhan));
            } catch { }
            return aladhan;
        }

        // 5. Check if we had an older calculated cache
        try {
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch { }

        // 6. Complete Offline Calibrated Fallback
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
     * Official Hijri Calendar Date
     */
    public getHijriDate(date: Date = new Date(), times?: PrayerTimes | null): string {
        if (times?.hijriDate) {
            return times.hijriDate;
        }

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
