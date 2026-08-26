import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    Dimensions,
    Vibration,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { prayerTimesService, CityInfo } from '../services/prayerTimesService';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width * 0.82, 330);

export const QiblaCompassScreen: React.FC = () => {
    const navigation = useNavigation();
    const [heading, setHeading] = useState<number>(0);
    const [qiblaAngle, setQiblaAngle] = useState<number>(155);
    const [kaabaDistance, setKaabaDistance] = useState<number>(2410);
    const [city, setCity] = useState<CityInfo>(prayerTimesService.getSelectedCity());
    const [loading, setLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState(true);
    const lastVibratedRef = useRef<number>(0);

    useEffect(() => {
        let headingSubscription: Location.LocationSubscription | null = null;

        const setup = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setHasPermission(false);
                    setLoading(false);
                    return;
                }

                // Get accurate position and resolve city
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const currentCity = await prayerTimesService.loadSelectedCity();
                setCity(currentCity);

                const lat = loc.coords.latitude;
                const lng = loc.coords.longitude;

                const angle = prayerTimesService.calculateQiblaAngle(lat, lng);
                setQiblaAngle(angle);

                const dist = prayerTimesService.calculateDistanceToKaaba(lat, lng);
                setKaabaDistance(dist);

                // Watch heading
                headingSubscription = await Location.watchHeadingAsync((data) => {
                    const trueHeading = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
                    setHeading(Math.round(trueHeading));
                });

                setLoading(false);
            } catch (e) {
                console.warn('[Qibla] Setup error:', e);
                setLoading(false);
            }
        };

        setup();

        return () => {
            if (headingSubscription) {
                headingSubscription.remove();
            }
        };
    }, []);

    // Calculate relative needle angle towards Kaaba
    const relativeQiblaAngle = Math.round((qiblaAngle - heading + 360) % 360);
    const isAligned = Math.abs(relativeQiblaAngle) <= 3 || Math.abs(relativeQiblaAngle - 360) <= 3;

    // Haptic feedback when freshly aligned
    useEffect(() => {
        if (isAligned) {
            const now = Date.now();
            if (now - lastVibratedRef.current > 1500) {
                lastVibratedRef.current = now;
                Vibration.vibrate(Platform.OS === 'android' ? 40 : 10);
            }
        }
    }, [isAligned]);

    const getDirectionText = (deg: number): string => {
        if (deg >= 337.5 || deg < 22.5) return 'Kuzey';
        if (deg >= 22.5 && deg < 67.5) return 'Kuzeydoğu';
        if (deg >= 67.5 && deg < 112.5) return 'Doğu';
        if (deg >= 112.5 && deg < 157.5) return 'Güneydoğu';
        if (deg >= 157.5 && deg < 202.5) return 'Güney';
        if (deg >= 202.5 && deg < 247.5) return 'Güneybatı';
        if (deg >= 247.5 && deg < 292.5) return 'Batı';
        return 'Kuzeybatı';
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor="#021B14" />

            {/* Header */}
            <LinearGradient
                colors={['#064E3B', '#021B14']}
                style={styles.header}
            >
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={22} color="#ffffff" />
                </TouchableOpacity>
                <View style={styles.headerTitleBox}>
                    <Text style={styles.headerTitle}>KIBLE PUSULASI</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                        {city.name}
                    </Text>
                </View>
                <View style={{ width: 40 }} />
            </LinearGradient>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#F59E0B" />
                    <Text style={styles.loadingText}>Manyetik Sensörler Kalibre Ediliyor...</Text>
                </View>
            ) : !hasPermission ? (
                <View style={styles.centered}>
                    <Ionicons name="location-outline" size={48} color="#EF4444" />
                    <Text style={styles.errorTitle}>Konum İzni Gerekli</Text>
                    <Text style={styles.errorText}>
                        Kıble yönünü doğru tayin edebilmek için konum izni vermeniz gerekmektedir.
                    </Text>
                </View>
            ) : (
                <View style={styles.content}>
                    {/* Direction Readout Status Card */}
                    <LinearGradient
                        colors={isAligned ? ['#065F46', '#047857'] : ['#1E293B', '#0F172A']}
                        style={[styles.statusCard, isAligned && styles.statusCardAligned]}
                    >
                        <View style={styles.statusIconWrap}>
                            <MaterialCommunityIcons
                                name={isAligned ? 'check-decagram' : 'compass'}
                                size={28}
                                color={isAligned ? '#FDE68A' : '#F59E0B'}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.statusTitle, isAligned && styles.statusTitleAligned]}>
                                {isAligned ? 'Kâbe-i Muazzama İstikametindesiniz' : 'Telefonu Çevirerek Kıbleye Yönelin'}
                            </Text>
                            <Text style={styles.statusSubtitle}>
                                Cihaz: {heading}° ({getDirectionText(heading)}) • Kâbe: {qiblaAngle.toFixed(1)}°
                            </Text>
                        </View>
                    </LinearGradient>

                    {/* Stats Strip: Distance & Degrees */}
                    <View style={styles.statsStrip}>
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="map-marker-distance" size={16} color="#F59E0B" />
                            <Text style={styles.statLabel}>Kâbe'ye Mesafe:</Text>
                            <Text style={styles.statValue}>{kaabaDistance.toLocaleString('tr-TR')} km</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="rotate-3d-variant" size={16} color="#34D399" />
                            <Text style={styles.statLabel}>Kıble Açısı:</Text>
                            <Text style={styles.statValue}>{qiblaAngle.toFixed(1)}°</Text>
                        </View>
                    </View>

                    {/* Luxury Astrolabe / Brass Compass Wrapper */}
                    <View style={styles.compassContainer}>
                        {/* Outer Glowing Brass Ring */}
                        <View style={[styles.astrolabeRing, isAligned && styles.astrolabeRingAligned]}>
                            {/* Inner Compass Dial rotating with Device Heading */}
                            <View
                                style={[
                                    styles.compassDial,
                                    { transform: [{ rotate: `${-heading}deg` }] }
                                ]}
                            >
                                {/* Cardinal Points */}
                                <Text style={[styles.cardinalPoint, styles.north]}>K</Text>
                                <Text style={[styles.cardinalPoint, styles.east]}>D</Text>
                                <Text style={[styles.cardinalPoint, styles.south]}>G</Text>
                                <Text style={[styles.cardinalPoint, styles.west]}>B</Text>

                                {/* Intercardinal Points */}
                                <Text style={[styles.intercardinalPoint, styles.ne]}>KD</Text>
                                <Text style={[styles.intercardinalPoint, styles.se]}>GD</Text>
                                <Text style={[styles.intercardinalPoint, styles.sw]}>GB</Text>
                                <Text style={[styles.intercardinalPoint, styles.nw]}>KB</Text>

                                {/* Degree Ticks */}
                                <View style={[styles.tickMarker, { transform: [{ rotate: '0deg' }] }]} />
                                <View style={[styles.tickMarker, { transform: [{ rotate: '45deg' }] }]} />
                                <View style={[styles.tickMarker, { transform: [{ rotate: '90deg' }] }]} />
                                <View style={[styles.tickMarker, { transform: [{ rotate: '135deg' }] }]} />
                                <View style={[styles.tickMarker, { transform: [{ rotate: '180deg' }] }]} />
                                <View style={[styles.tickMarker, { transform: [{ rotate: '225deg' }] }]} />
                                <View style={[styles.tickMarker, { transform: [{ rotate: '270deg' }] }]} />
                                <View style={[styles.tickMarker, { transform: [{ rotate: '315deg' }] }]} />

                                {/* Kaaba Emblem on Dial Perimeter */}
                                <View
                                    style={[
                                        styles.kaabaMarkerContainer,
                                        { transform: [{ rotate: `${qiblaAngle}deg` }] }
                                    ]}
                                >
                                    <View style={styles.kaabaMarkerBox}>
                                        <MaterialCommunityIcons name="cube-outline" size={16} color="#FEF3C7" />
                                        <Text style={styles.kaabaMarkerText}>KÂBE</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Center Needle Pointing to Kaaba */}
                            <View
                                style={[
                                    styles.needleContainer,
                                    { transform: [{ rotate: `${relativeQiblaAngle}deg` }] }
                                ]}
                            >
                                <View style={[styles.needleNorth, isAligned && styles.needleNorthAligned]} />
                                <View style={styles.needleSouth} />
                                <View style={[styles.needlePivot, isAligned && styles.needlePivotAligned]} />
                            </View>
                        </View>
                    </View>

                    {/* Calibration & Accuracy Hint */}
                    <View style={styles.hintBox}>
                        <Ionicons name="information-circle" size={18} color="#F59E0B" />
                        <Text style={styles.hintText}>
                            En yüksek hassasiyet için telefonunuzu yere paralel (düz) tutunuz ve manyetik kılıf/metal cisimlerden uzaklaştırınız.
                        </Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#021B14',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        elevation: 6,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleBox: {
        alignItems: 'center',
        maxWidth: '70%',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#FBBF24',
        marginTop: 2,
    },
    content: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusCard: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        elevation: 4,
    },
    statusCardAligned: {
        borderColor: '#F59E0B',
        borderWidth: 2,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    statusIconWrap: {
        marginRight: 12,
    },
    statusTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    statusTitleAligned: {
        color: '#FEF3C7',
    },
    statusSubtitle: {
        fontSize: 11,
        color: '#94A3B8',
    },
    statsStrip: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 16,
        width: '100%',
        justifyContent: 'space-around',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginVertical: 10,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statLabel: {
        fontSize: 11,
        color: '#D1FAE5',
    },
    statValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    statDivider: {
        width: 1,
        height: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    compassContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    astrolabeRing: {
        width: COMPASS_SIZE,
        height: COMPASS_SIZE,
        borderRadius: COMPASS_SIZE / 2,
        backgroundColor: '#04271D',
        borderWidth: 8,
        borderColor: '#B45309',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
    },
    astrolabeRingAligned: {
        borderColor: '#F59E0B',
        shadowColor: '#F59E0B',
        shadowOpacity: 0.6,
        shadowRadius: 20,
    },
    compassDial: {
        width: COMPASS_SIZE - 20,
        height: COMPASS_SIZE - 20,
        borderRadius: (COMPASS_SIZE - 20) / 2,
        backgroundColor: '#021B14',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(245, 158, 11, 0.25)',
    },
    cardinalPoint: {
        position: 'absolute',
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F59E0B',
    },
    north: { top: 10, color: '#EF4444' },
    east: { right: 12 },
    south: { bottom: 10 },
    west: { left: 12 },
    intercardinalPoint: {
        position: 'absolute',
        fontSize: 10,
        fontWeight: '600',
        color: '#6EE7B7',
    },
    ne: { top: 38, right: 38 },
    se: { bottom: 38, right: 38 },
    sw: { bottom: 38, left: 38 },
    nw: { top: 38, left: 38 },
    tickMarker: {
        position: 'absolute',
        width: 2,
        height: '100%',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
    },
    kaabaMarkerContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    kaabaMarkerBox: {
        marginTop: 4,
        alignItems: 'center',
        backgroundColor: '#78350F',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FBBF24',
    },
    kaabaMarkerText: {
        fontSize: 7,
        fontWeight: 'bold',
        color: '#FEF3C7',
    },
    needleContainer: {
        position: 'absolute',
        width: 32,
        height: COMPASS_SIZE - 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    needleNorth: {
        width: 0,
        height: 0,
        borderLeftWidth: 12,
        borderRightWidth: 12,
        borderBottomWidth: (COMPASS_SIZE - 80) / 2,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#F59E0B',
    },
    needleNorthAligned: {
        borderBottomColor: '#10B981',
    },
    needleSouth: {
        width: 0,
        height: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopWidth: (COMPASS_SIZE - 100) / 2,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#475569',
    },
    needlePivot: {
        position: 'absolute',
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#D97706',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        elevation: 6,
    },
    needlePivotAligned: {
        backgroundColor: '#10B981',
    },
    hintBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
        gap: 10,
        marginBottom: 10,
    },
    hintText: {
        flex: 1,
        fontSize: 11,
        color: '#D1FAE5',
        lineHeight: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#F59E0B',
        fontWeight: '600',
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#EF4444',
        marginTop: 16,
    },
    errorText: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 8,
    },
});
