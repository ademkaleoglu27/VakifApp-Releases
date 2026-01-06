import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, SafeAreaView, TouchableOpacity, Modal } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { RisaleReader, ReaderLocation, ReaderConfig } from '../../../modules/risale-reader';

// Assuming this asset exists based on previous file exploration
// If typescript complains, will need a declare module or @ts-ignore
// @ts-ignore
import SozlerPdf from '../../../../assets/risale_pdfs/sozler.pdf';
// @ts-ignore
import SozlerJson from '../../../../assets/risale_json/sozler.json';

const SAMPLE_BLOCKS = [
    { type: "heading", text: "Birinci Söz" },
    { type: "arabic_block", text: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحٖيمِ وَ بِهٖ نَسْتَعٖينُ اَلْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمٖينَ وَ الصَّلَاةُ وَ السَّلَامُ عَلٰى سَيِّدِنَا مُحَمَّدٍ وَ عَلٰى اٰلِهٖ وَ صَحْبِهٖ اَجْمَعٖينَ", variant: "hero" },
    { type: "paragraph", text: "Ey kardeş! Benden birkaç nasihat istedin. Sen bir asker olduğun için askerlik temsilatıyla, sekiz hikâyecikler ile birkaç hakikati nefsimle beraber dinle. Çünkü ben nefsimi herkesten ziyade nasihate muhtaç görüyorum. Vaktiyle sekiz âyetten istifade ettiğim sekiz sözü biraz uzunca nefsime demiştim. Şimdi kısaca ve avam lisanıyla nefsime diyeceğim. Kim isterse beraber dinlesin." },
    { type: "heading", text: "Birinci Söz" },
    { type: "paragraph", text: "Bismillah her hayrın başıdır. Biz dahi başta ona başlarız. Bil ey nefsim, şu mübarek kelime İslâm nişanı olduğu gibi bütün mevcudatın lisan-ı haliyle vird-i zebanıdır[1]." },
    { type: "paragraph", text: "Bismillah ne büyük tükenmez bir kuvvet, ne çok bitmez bir bereket olduğunu anlamak istersen şu temsilî hikâyeciğe bak, dinle. Şöyle ki:" },
    { type: "ayah_hadith_block", text: "Bedevî Arap çöllerinde seyahat eden adama gerektir ki bir kabile reisinin ismini alsın ve himayesine girsin, tâ şakîlerin şerrinden kurtulup hâcatını tedarik edebilsin. Yoksa tek başıyla hadsiz düşman ve ihtiyacatına karşı perişan olacaktır." },
    { type: "paragraph", text: "İşte böyle bir seyahat için iki adam sahraya çıkıp gidiyorlar. Onlardan birisi mütevazi idi, diğeri mağrur. Mütevazii, bir reisin ismini aldı. Mağrur, almadı. Alanı, her yerde selâmetle gezdi. Bir kātıu’t-tarîke rast gelse der: “Ben, filan reisin ismiyle gezerim.” Şakî def’olur, ilişemez. Bir çadıra girse o nam ile hürmet görür. Öteki mağrur, bütün seyahatinde öyle belalar çeker ki tarif edilmez. Daima titrer, daima dilencilik ederdi. Hem zelil hem rezil oldu." },
    { type: "paragraph", text: "İşte ey mağrur nefsim, sen o seyyahsın. Şu dünya ise bir çöldür. Aczin ve fakrın hadsizdir. Düşmanın, hâcatın nihayetsizdir. Madem öyledir, şu sahranın Mâlik-i Ebedî’si ve Hâkim-i Ezelî’sinin ismini al. Tâ bütün kâinatın dilenciliğinden ve her hâdisatın karşısında titremeden kurtulasın." },
    { type: "paragraph", text: "Evet, bu kelime öyle mübarek bir definedir ki senin nihayetsiz aczin ve fakrın, seni nihayetsiz kudrete, rahmete rabtedip Kadîr-i Rahîm’in dergâhında aczi, fakrı en makbul bir şefaatçi yapar." },
    { type: "paragraph", text: "Evet, bu kelime ile hareket eden, o adama benzer ki askere kaydolur, devlet namına hareket eder. Hiçbir kimseden pervası kalmaz. Kanun namına, devlet namına der, her işi yapar, her şeye karşı dayanır." },
    { type: "paragraph", text: "Başta demiştik: Bütün mevcudat, lisan-ı hal ile Bismillah der. Öyle mi?" },
    { type: "note", text: "(Makam münasebetiyle buraya alınmıştır.)" },
    { type: "arabic_block", text: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحٖيمِ قَالَتْ يَٓا اَيُّهَا الْمَلَؤُا اِنّٖٓى اُلْقِىَ اِلَىَّ كِتَابٌ كَرٖيمٌ اِنَّهُ مِنْ سُلَيْمٰنَ وَ اِنَّهُ بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحٖيمِ", variant: "block" },
    { type: "heading", text: "Birinci Sır" },
    { type: "paragraph", text: "Bismillahirrahmanirrahîm’in bir cilvesini şöyle gördüm ki: Kâinat simasında, arz simasında ve insan simasında birbiri içinde birbirinin numunesini gösteren üç sikke-i rububiyet var." },
    { type: "paragraph", text: "Biri: Kâinatın heyet-i mecmuasındaki teavün, tesanüd, teanuk, tecavübden tezahür eden sikke-i kübra-i uluhiyettir ki “Bismillah” ona bakıyor." },
    { type: "heading", text: "İkinci Sır" },
    { type: "paragraph", text: "Kur’an-ı Mu’cizü’l-Beyan, hadsiz kesret-i mahlukatta tezahür eden vâhidiyet içinde ukûlü boğmamak için daima o vâhidiyet içinde ehadiyet cilvesini gösteriyor." },
    { type: "paragraph", text: "İşte vâhidiyet içinde ukûlü boğmamak ve kalpler Zat-ı Akdes’i unutmamak için daima vâhidiyetteki sikke-i ehadiyeti nazara veriyor ki o sikkenin üç mühim ukdesini irae eden Bismillahirrahmanirrahîm’dir." },
];

// Duplicate blocks to simulate 20 pages
const BLOCKS_REPEATED = [
    ...SAMPLE_BLOCKS,
    ...SAMPLE_BLOCKS,
    ...SAMPLE_BLOCKS,
    ...SAMPLE_BLOCKS,
    ...SAMPLE_BLOCKS // 5x ~20 blocks = 100 blocks, maybe add more if needed
];

const GOLDEN_MASTER_JSON = {
    blocks: BLOCKS_REPEATED,
    footnotes: {
        "1": "Yani; kendi kendine o zikri yapıyor."
    }
};


const READER_ROOT = `${FileSystem.documentDirectory}reader_testing/`;

export const DevReaderIsolationScreen = ({ navigation }: any) => {
    const [isReady, setIsReady] = useState(false);
    const [isReaderOpen, setIsReaderOpen] = useState(false);
    const [status, setStatus] = useState("Initializing...");
    const [location, setLocation] = useState<ReaderLocation>({ bookId: 'sozler', pageNumber: 1 });
    const [useTextMode, setUseTextMode] = useState(false);

    useEffect(() => {
        checkEnvironment();
    }, []);

    const checkEnvironment = async () => {
        try {
            const dirInfo = await FileSystem.getInfoAsync(READER_ROOT);
            if (dirInfo.exists) {
                setIsReady(true);
                setStatus("Environment Ready.");
            } else {
                setIsReady(false);
                setStatus("Environment requires setup.");
            }
        } catch (e: any) {
            setStatus(`Error Checking: ${e.message}`);
        }
    };

    const setupEnvironment = async () => {
        try {
            setStatus("Setting up...");

            // 1. Create Directories
            const booksDir = `${READER_ROOT}books/sozler/pdf/`;
            await FileSystem.makeDirectoryAsync(booksDir, { intermediates: true });

            // 2. Copy PDF
            setStatus("Copying Sozler PDF...");
            const asset = Asset.fromModule(SozlerPdf);
            await asset.downloadAsync(); // Ensure it's available locally

            if (!asset.localUri) throw new Error("Asset download failed");

            const destPdf = `${booksDir}sozler.pdf`;
            await FileSystem.copyAsync({ from: asset.localUri, to: destPdf });

            // 3. Copy JSON
            setStatus("Copying Sozler JSON...");
            // JSON is imported as an object, so we can verify it and write it directly
            if (!SozlerJson || !SozlerJson.blocks) {
                console.warn("Imported JSON might be empty or invalid", SozlerJson);
            }

            const booksJsonDir = `${READER_ROOT}books/sozler/json/`;
            await FileSystem.makeDirectoryAsync(booksJsonDir, { intermediates: true });

            await FileSystem.writeAsStringAsync(
                `${booksJsonDir}sozler.json`,
                // Use GOLDEN_MASTER_JSON to prove the UI changes to the user
                JSON.stringify(GOLDEN_MASTER_JSON)
            );


            // 4. Create Manifest
            setStatus("Creating Manifest...");
            const manifest = {
                version: "1.0",
                buildDate: new Date().toISOString(),
                books: {
                    "sozler": {
                        id: "sozler",
                        title: "Sözler",
                        formats: {
                            pdf: {
                                enabled: true,
                                root: "books/sozler/pdf",
                                files: {
                                    path: "sozler.pdf"
                                }
                            },
                            json: {
                                enabled: true,
                                root: "books/sozler/json", // relative to manifest
                                files: {
                                    range_strategy: "blocks",
                                    path: "sozler.json"
                                }
                            }
                        }
                    }
                }
            };

            await FileSystem.writeAsStringAsync(
                `${READER_ROOT}manifest.json`,
                JSON.stringify(manifest, null, 2)
            );

            setStatus("Setup Complete!");
            setIsReady(true);

        } catch (error: any) {
            console.error(error);
            setStatus(`Setup Failed: ${error.message}`);
            Alert.alert("Error", error.message);
        }
    };

    const handleClose = () => {
        setIsReaderOpen(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Modal visible={isReaderOpen} animationType="slide" onRequestClose={handleClose}>
                <View style={{ flex: 1 }}>
                    <RisaleReader
                        manifestUri={`${READER_ROOT}manifest.json`}
                        initialLocation={location}
                        config={{
                            theme: 'light',
                            useScrollMode: false,
                            preferredFormat: useTextMode ? 'json' : 'pdf'
                        }}
                        onClose={handleClose}
                        onLocationChange={(loc) => {
                            console.log("Location Changed:", loc);
                            setLocation(loc);
                        }}
                    />
                    <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                        <Text style={styles.closeText}>Close Debug</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            <Text style={styles.title}>Reader Isolation Dev Harness</Text>

            <View style={styles.statusBox}>
                <Text style={styles.status}>Status: {status}</Text>
            </View>

            {!isReady ? (
                <Button title="Setup Test Environment" onPress={setupEnvironment} />
            ) : (
                <View style={styles.actions}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <Text>Mode: {useTextMode ? "Text (JSON)" : "PDF"}</Text>
                        <View style={{ width: 10 }} />
                        <Button title="Toggle" onPress={() => setUseTextMode(!useTextMode)} />
                    </View>
                    <Button title={`Launch Reader (${useTextMode ? 'Text' : 'PDF'})`} onPress={() => setIsReaderOpen(true)} />
                    <View style={{ height: 20 }} />
                    <Button title="Reset Environment" color="red" onPress={async () => {
                        await FileSystem.deleteAsync(READER_ROOT, { idempotent: true });
                        checkEnvironment();
                    }} />
                </View>
            )}

            <Button title="Back" onPress={() => navigation.goBack()} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
        justifyContent: 'center'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center'
    },
    statusBox: {
        padding: 10,
        backgroundColor: '#f0f0f0',
        marginBottom: 20,
        borderRadius: 8
    },
    status: {
        fontFamily: 'monospace'
    },
    actions: {
        marginVertical: 20
    },
    closeBtn: {
        position: 'absolute',
        bottom: 30, // Move to bottom
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.7)', // Darker for better visibility
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        elevation: 5,
    },
    closeText: {
        color: '#fff',
        fontWeight: 'bold'
    }
});
