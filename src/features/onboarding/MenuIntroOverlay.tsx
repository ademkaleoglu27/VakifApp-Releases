import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { OnboardingStorage, ONBOARDING_ENABLED } from './storage';

const { width, height } = Dimensions.get('window');

// Adjust these relative positions based on your actual Drawer item layout
const MARKS = [
    { top: 120, label: "Kütüphane", desc: "Kitaplarınız ve bölümler burada." },
    { top: 180, label: "İndirilebilir Kitaplar", desc: "Tüm külliyatı buradan indirin." },
    { top: height - 100, label: "Ayarlar", desc: "Okuma ve görünüm tercihleri." }
];

export const MenuIntroOverlay = ({ visible, onClose }: { visible: boolean, onClose: () => void }) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (visible) {
            checkStatus();
        }
    }, [visible]);

    const checkStatus = async () => {
        if (!ONBOARDING_ENABLED) return;
        const completed = await OnboardingStorage.isMenuIntroCompleted();
        if (!completed) {
            setShow(true);
        }
    };

    const handleComplete = async () => {
        setShow(false);
        await OnboardingStorage.setMenuIntroCompleted();
        onClose();
    };

    if (!show || !visible) return null;

    return (
        <Modal transparent visible={true} animationType="fade">
            <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={handleComplete}>
                {/* Darker left side for menu highlight feel */}
                <View style={styles.menuDimmer}>
                    {MARKS.map((mark, index) => (
                        <View key={index} style={[styles.markContainer, { top: mark.top }]}>
                            <View style={styles.dot} />
                            <View style={styles.textBox}>
                                <Text style={styles.label}>{mark.label}</Text>
                                <Text style={styles.desc}>{mark.desc}</Text>
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity style={styles.btn} onPress={handleComplete}>
                        <Text style={styles.btnText}>Anlaşıldı</Text>
                    </TouchableOpacity>
                </View>

                {/* Right side Touch area to close */}
                <View style={styles.rightDimmer} />
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        flexDirection: 'row',
    },
    menuDimmer: {
        width: '75%', // Approx drawer width
        height: '100%',
        backgroundColor: 'rgba(31, 41, 55, 0.85)', // Dark blue-gray overlay over menu
        paddingLeft: 20
    },
    rightDimmer: {
        width: '25%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.3)'
    },
    markContainer: {
        position: 'absolute',
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FCD34D', // Amber for visibility
        marginRight: 12,
        shadowColor: "#FCD34D",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 5
    },
    textBox: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderLeftWidth: 2,
        borderLeftColor: '#FCD34D'
    },
    label: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 2
    },
    desc: {
        color: '#D1D5DB',
        fontSize: 12
    },
    btn: {
        position: 'absolute',
        bottom: 40,
        right: 20,
        backgroundColor: '#4F46E5',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold'
    }
});
