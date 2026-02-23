const fs = require('fs');

const path = 'src/features/reader/html_pilot/RisaleHtmlReaderScreen.tsx';
let c = fs.readFileSync(path, 'utf8');

const targetStrId = '{/* SETTINGS MODAL */}';
const targetStrEnd = '{/* FOOTNOTE MODAL (Bottom Sheet Style) */}';

const startIdx = c.indexOf(targetStrId);
const endIdx = c.indexOf(targetStrEnd, startIdx);

if (startIdx === -1 || endIdx === -1) {
    console.error('Target blocks not found');
    process.exit(1);
}

const newModal = `{/* SETTINGS MODAL */}
            <Modal visible={settingsVisible} animationType="slide" transparent onRequestClose={() => setSettingsVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSettingsVisible(false)}>
                    <View style={[styles.modalContent, { backgroundColor: modalBg }]} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.candTitle, { color: modalText, fontFamily: uiFont }]}>Okuma Ayarları</Text>
                            <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                                <Ionicons name="close-circle" size={30} color={modalSecText} />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.separator, { backgroundColor: bColor }]} />

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
                            {/* Font Size */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: modalText, fontFamily: uiFont }]}>Yazı Boyutu</Text>
                                <View style={styles.fontSizeControls}>
                                    <TouchableOpacity style={[styles.fontSizeBtn, { backgroundColor: chipBg }]} onPress={() => updateSetting('fontSize', Math.max(MIN_FONT_SIZE, fontSize - FONT_STEP))}>
                                        <Text style={[styles.fontSizeBtnText, { color: modalText, fontFamily: uiFont }]}>A−</Text>
                                    </TouchableOpacity>
                                    <Text style={[styles.fontSizeValue, { color: modalText, fontFamily: uiFont }]}>{fontSize}</Text>
                                    <TouchableOpacity style={[styles.fontSizeBtn, { backgroundColor: chipBg }]} onPress={() => updateSetting('fontSize', Math.min(MAX_FONT_SIZE, fontSize + FONT_STEP))}>
                                        <Text style={[styles.fontSizeBtnText, { color: modalText, fontFamily: uiFont }]}>A+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Theme */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: modalText, fontFamily: uiFont }]}>Tema</Text>
                            </View>
                            <View style={styles.colorRow}>
                                {THEME_OPTIONS.map(t => (
                                    <TouchableOpacity
                                        key={t.id}
                                        onPress={() => updateSetting('themeId', t.id)}
                                        style={[
                                            styles.colorCircle,
                                            { backgroundColor: t.bg, borderColor: bColor },
                                            themeId === t.id && styles.colorCircleActive
                                        ]}
                                    />
                                ))}
                            </View>

                            {/* Font Family */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: modalText, fontFamily: uiFont }]}>Yazı Tipi</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                {FONT_OPTIONS.map(f => {
                                    const active = f.id === fontFamily;
                                    return (
                                        <TouchableOpacity
                                            key={f.id}
                                            style={[styles.chip, { backgroundColor: chipBg, borderColor: bColor }, active && styles.chipActive]}
                                            onPress={() => updateSetting('fontFamily', f.id)}
                                        >
                                            <Text style={[styles.chipText, { color: active ? '#fff' : modalText, fontFamily: f.id === 'System' ? undefined : f.id }, active && styles.chipTextActive]}>{f.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* Text Align */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: modalText, fontFamily: uiFont }]}>Hizalama</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                {ALIGN_OPTIONS.map(a => {
                                    const active = a.id === textAlign;
                                    return (
                                        <TouchableOpacity
                                            key={a.id}
                                            style={[styles.chip, { backgroundColor: chipBg, borderColor: bColor }, active && styles.chipActive]}
                                            onPress={() => updateSetting('textAlign', a.id)}
                                        >
                                            <Text style={[styles.chipText, { color: active ? '#fff' : modalText, fontFamily: uiFont }, active && styles.chipTextActive]}>{a.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Line Height */}
                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: modalText, fontFamily: uiFont }]}>Satır Aralığı</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                                {LINE_HEIGHT_OPTIONS.map(l => {
                                    const active = l.id === lineHeight;
                                    return (
                                        <TouchableOpacity
                                            key={l.id}
                                            style={[styles.chip, { backgroundColor: chipBg, borderColor: bColor }, active && styles.chipActive]}
                                            onPress={() => updateSetting('lineHeight', l.id)}
                                        >
                                            <Text style={[styles.chipText, { color: active ? '#fff' : modalText, fontFamily: uiFont }, active && styles.chipTextActive]}>{l.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Auto Scroll Modülü */}
                            <View style={[styles.separator, { backgroundColor: bColor }]} />
                            <View style={[styles.settingRow, { marginBottom: 16 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: chipBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                        <Ionicons name="swap-vertical" size={18} color={modalText} />
                                    </View>
                                    <View>
                                        <Text style={[styles.settingLabel, { color: modalText, fontFamily: uiFont }]}>Akış Modu</Text>
                                        <Text style={{ fontSize: 12, color: modalSecText, fontFamily: uiFont }}>Otomatik ekran kaydırma</Text>
                                    </View>
                                </View>
                                
                                <TouchableOpacity 
                                    onPress={toggleAutoScroll}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                        backgroundColor: isAutoScrolling ? '#ef4444' : '#10b981',
                                        borderRadius: 20
                                    }}>
                                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, fontFamily: uiFont }}>
                                        {isAutoScrolling ? 'Durdur' : 'Başlat'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Speed Controls */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
                                <TouchableOpacity onPress={() => updateSetting('autoScrollSpeed', Math.max(0.5, autoScrollSpeed - 0.5))} style={[styles.asBtn, { backgroundColor: chipBg, borderColor: bColor }]}>
                                    <Ionicons name="remove" size={20} color={modalText} />
                                </TouchableOpacity>
                                
                                <View style={{ alignItems: 'center', width: 60 }}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: modalText, fontFamily: uiFont }}>{autoScrollSpeed.toFixed(1)}x</Text>
                                    <Text style={{ fontSize: 10, color: modalSecText, fontFamily: uiFont }}>Hız</Text>
                                </View>
                                
                                <TouchableOpacity onPress={() => updateSetting('autoScrollSpeed', Math.min(5, autoScrollSpeed + 0.5))} style={[styles.asBtn, { backgroundColor: chipBg, borderColor: bColor }]}>
                                    <Ionicons name="add" size={20} color={modalText} />
                                </TouchableOpacity>
                            </View>

                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            `;

c = c.substring(0, startIdx) + newModal + c.substring(endIdx);
fs.writeFileSync(path, c);
console.log('Success');
