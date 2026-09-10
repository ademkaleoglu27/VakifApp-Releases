import { CityInfo } from '../services/prayerTimesService';

export interface DiyanetLocation {
    stateId: string;
    districtId: string;
    districtName: string;
}

export const DIYANET_CITY_MAPPING: Record<string, DiyanetLocation> = {
    "ADANA": {
        "stateId": "500",
        "districtId": "9146",
        "districtName": "ADANA"
    },
    "ADIYAMAN": {
        "stateId": "501",
        "districtId": "9158",
        "districtName": "ADIYAMAN"
    },
    "AFYONKARAHİSAR": {
        "stateId": "502",
        "districtId": "9167",
        "districtName": "AFYONKARAHİSAR"
    },
    "AKSARAY": {
        "stateId": "504",
        "districtId": "9193",
        "districtName": "AKSARAY"
    },
    "AMASYA": {
        "stateId": "505",
        "districtId": "9198",
        "districtName": "AMASYA"
    },
    "ANKARA": {
        "stateId": "506",
        "districtId": "9206",
        "districtName": "ANKARA"
    },
    "ANTALYA": {
        "stateId": "507",
        "districtId": "9225",
        "districtName": "ANTALYA"
    },
    "ARDAHAN": {
        "stateId": "508",
        "districtId": "9238",
        "districtName": "ARDAHAN"
    },
    "ARTVİN": {
        "stateId": "509",
        "districtId": "9246",
        "districtName": "ARTVİN"
    },
    "AYDIN": {
        "stateId": "510",
        "districtId": "9252",
        "districtName": "AYDIN"
    },
    "AĞRI": {
        "stateId": "503",
        "districtId": "9185",
        "districtName": "AĞRI"
    },
    "BALIKESİR": {
        "stateId": "511",
        "districtId": "9270",
        "districtName": "BALIKESİR"
    },
    "BARTIN": {
        "stateId": "512",
        "districtId": "9285",
        "districtName": "BARTIN"
    },
    "BATMAN": {
        "stateId": "513",
        "districtId": "9288",
        "districtName": "BATMAN"
    },
    "BAYBURT": {
        "stateId": "514",
        "districtId": "9295",
        "districtName": "BAYBURT"
    },
    "BOLU": {
        "stateId": "518",
        "districtId": "9315",
        "districtName": "BOLU"
    },
    "BURDUR": {
        "stateId": "519",
        "districtId": "9327",
        "districtName": "BURDUR"
    },
    "BURSA": {
        "stateId": "520",
        "districtId": "9335",
        "districtName": "BURSA"
    },
    "BİLECİK": {
        "stateId": "515",
        "districtId": "9297",
        "districtName": "BİLECİK"
    },
    "BİNGÖL": {
        "stateId": "516",
        "districtId": "9303",
        "districtName": "BİNGÖL"
    },
    "BİTLİS": {
        "stateId": "517",
        "districtId": "9311",
        "districtName": "BİTLİS"
    },
    "DENİZLİ": {
        "stateId": "524",
        "districtId": "9392",
        "districtName": "DENİZLİ"
    },
    "DÜZCE": {
        "stateId": "526",
        "districtId": "9414",
        "districtName": "DÜZCE"
    },
    "DİYARBAKIR": {
        "stateId": "525",
        "districtId": "9402",
        "districtName": "DİYARBAKIR"
    },
    "EDİRNE": {
        "stateId": "527",
        "districtId": "9419",
        "districtName": "EDİRNE"
    },
    "ELAZIĞ": {
        "stateId": "528",
        "districtId": "9432",
        "districtName": "ELAZIĞ"
    },
    "ERZURUM": {
        "stateId": "530",
        "districtId": "9451",
        "districtName": "ERZURUM"
    },
    "ERZİNCAN": {
        "stateId": "529",
        "districtId": "9440",
        "districtName": "ERZİNCAN"
    },
    "ESKİŞEHİR": {
        "stateId": "531",
        "districtId": "9470",
        "districtName": "ESKİŞEHİR"
    },
    "GAZİANTEP": {
        "stateId": "532",
        "districtId": "9479",
        "districtName": "GAZİANTEP"
    },
    "GÜMÜŞHANE": {
        "stateId": "534",
        "districtId": "9501",
        "districtName": "GÜMÜŞHANE"
    },
    "GİRESUN": {
        "stateId": "533",
        "districtId": "9494",
        "districtName": "GİRESUN"
    },
    "HAKKARİ": {
        "stateId": "535",
        "districtId": "9507",
        "districtName": "HAKKARİ"
    },
    "HATAY": {
        "stateId": "536",
        "districtId": "20089",
        "districtName": "HATAY"
    },
    "ISPARTA": {
        "stateId": "538",
        "districtId": "9528",
        "districtName": "ISPARTA"
    },
    "IĞDIR": {
        "stateId": "537",
        "districtId": "9522",
        "districtName": "IĞDIR"
    },
    "KAHRAMANMARAŞ": {
        "stateId": "541",
        "districtId": "9577",
        "districtName": "KAHRAMANMARAŞ"
    },
    "KARABÜK": {
        "stateId": "542",
        "districtId": "9581",
        "districtName": "KARABÜK"
    },
    "KARAMAN": {
        "stateId": "543",
        "districtId": "9587",
        "districtName": "KARAMAN"
    },
    "KARS": {
        "stateId": "544",
        "districtId": "9594",
        "districtName": "KARS"
    },
    "KASTAMONU": {
        "stateId": "545",
        "districtId": "9609",
        "districtName": "KASTAMONU"
    },
    "KAYSERİ": {
        "stateId": "546",
        "districtId": "9620",
        "districtName": "KAYSERİ"
    },
    "KIRIKKALE": {
        "stateId": "548",
        "districtId": "9635",
        "districtName": "KIRIKKALE"
    },
    "KIRKLARELİ": {
        "stateId": "549",
        "districtId": "9638",
        "districtName": "KIRKLARELİ"
    },
    "KIRŞEHİR": {
        "stateId": "550",
        "districtId": "9646",
        "districtName": "KIRŞEHİR"
    },
    "KOCAELİ": {
        "stateId": "551",
        "districtId": "9654",
        "districtName": "KOCAELİ"
    },
    "KONYA": {
        "stateId": "552",
        "districtId": "9676",
        "districtName": "KONYA"
    },
    "KÜTAHYA": {
        "stateId": "553",
        "districtId": "9689",
        "districtName": "KÜTAHYA"
    },
    "KİLİS": {
        "stateId": "547",
        "districtId": "9629",
        "districtName": "KİLİS"
    },
    "MALATYA": {
        "stateId": "554",
        "districtId": "9703",
        "districtName": "MALATYA"
    },
    "MANİSA": {
        "stateId": "555",
        "districtId": "9716",
        "districtName": "MANİSA"
    },
    "MARDİN": {
        "stateId": "556",
        "districtId": "9726",
        "districtName": "MARDİN"
    },
    "MERSİN": {
        "stateId": "557",
        "districtId": "9737",
        "districtName": "MERSİN"
    },
    "MUĞLA": {
        "stateId": "558",
        "districtId": "9747",
        "districtName": "MUĞLA"
    },
    "MUŞ": {
        "stateId": "559",
        "districtId": "9755",
        "districtName": "MUŞ"
    },
    "NEVŞEHİR": {
        "stateId": "560",
        "districtId": "9760",
        "districtName": "NEVŞEHİR"
    },
    "NİĞDE": {
        "stateId": "561",
        "districtId": "9766",
        "districtName": "NİĞDE"
    },
    "ORDU": {
        "stateId": "562",
        "districtId": "9782",
        "districtName": "ORDU"
    },
    "OSMANİYE": {
        "stateId": "563",
        "districtId": "9788",
        "districtName": "OSMANİYE"
    },
    "RİZE": {
        "stateId": "564",
        "districtId": "9799",
        "districtName": "RİZE"
    },
    "SAKARYA": {
        "stateId": "565",
        "districtId": "9807",
        "districtName": "SAKARYA"
    },
    "SAMSUN": {
        "stateId": "566",
        "districtId": "9819",
        "districtName": "SAMSUN"
    },
    "SİNOP": {
        "stateId": "569",
        "districtId": "9847",
        "districtName": "SİNOP"
    },
    "SİVAS": {
        "stateId": "571",
        "districtId": "9868",
        "districtName": "SİVAS"
    },
    "SİİRT": {
        "stateId": "568",
        "districtId": "9839",
        "districtName": "SİİRT"
    },
    "TEKİRDAĞ": {
        "stateId": "572",
        "districtId": "9879",
        "districtName": "TEKİRDAĞ"
    },
    "TOKAT": {
        "stateId": "573",
        "districtId": "9887",
        "districtName": "TOKAT"
    },
    "TRABZON": {
        "stateId": "574",
        "districtId": "9905",
        "districtName": "TRABZON"
    },
    "TUNCELİ": {
        "stateId": "575",
        "districtId": "9914",
        "districtName": "TUNCELİ"
    },
    "UŞAK": {
        "stateId": "576",
        "districtId": "9919",
        "districtName": "UŞAK"
    },
    "VAN": {
        "stateId": "577",
        "districtId": "9930",
        "districtName": "VAN"
    },
    "YALOVA": {
        "stateId": "578",
        "districtId": "9935",
        "districtName": "YALOVA"
    },
    "YOZGAT": {
        "stateId": "579",
        "districtId": "9949",
        "districtName": "YOZGAT"
    },
    "ZONGULDAK": {
        "stateId": "580",
        "districtId": "9955",
        "districtName": "ZONGULDAK"
    },
    "ÇANAKKALE": {
        "stateId": "521",
        "districtId": "9352",
        "districtName": "ÇANAKKALE"
    },
    "ÇANKIRI": {
        "stateId": "522",
        "districtId": "9359",
        "districtName": "ÇANKIRI"
    },
    "ÇORUM": {
        "stateId": "523",
        "districtId": "9370",
        "districtName": "ÇORUM"
    },
    "İSTANBUL": {
        "stateId": "539",
        "districtId": "9541",
        "districtName": "İSTANBUL"
    },
    "İZMİR": {
        "stateId": "540",
        "districtId": "9560",
        "districtName": "İZMİR"
    },
    "ŞANLIURFA": {
        "stateId": "567",
        "districtId": "9831",
        "districtName": "ŞANLIURFA"
    },
    "ŞIRNAK": {
        "stateId": "570",
        "districtId": "9854",
        "districtName": "ŞIRNAK"
    }
};

export const TURKEY_CITIES: CityInfo[] = [
    {
        "id": "34",
        "name": "İstanbul",
        "lat": 41.0082,
        "lng": 28.9784,
        "elevation": 40,
        "diyanetDistrictId": "9541",
        "diyanetStateId": "539"
    },
    {
        "id": "06",
        "name": "Ankara",
        "lat": 39.9334,
        "lng": 32.8597,
        "elevation": 938,
        "diyanetDistrictId": "9206",
        "diyanetStateId": "506"
    },
    {
        "id": "35",
        "name": "İzmir",
        "lat": 38.4192,
        "lng": 27.1287,
        "elevation": 5,
        "diyanetDistrictId": "9560",
        "diyanetStateId": "540"
    },
    {
        "id": "01",
        "name": "Adana",
        "lat": 37,
        "lng": 35.3213,
        "elevation": 23,
        "diyanetDistrictId": "9146",
        "diyanetStateId": "500"
    },
    {
        "id": "02",
        "name": "Adıyaman",
        "lat": 37.7648,
        "lng": 38.2786,
        "elevation": 669,
        "diyanetDistrictId": "9158",
        "diyanetStateId": "501"
    },
    {
        "id": "03",
        "name": "Afyonkarahisar",
        "lat": 38.7507,
        "lng": 30.5567,
        "elevation": 1034,
        "diyanetDistrictId": "9167",
        "diyanetStateId": "502"
    },
    {
        "id": "04",
        "name": "Ağrı",
        "lat": 39.7191,
        "lng": 43.0503,
        "elevation": 1632,
        "diyanetDistrictId": "9185",
        "diyanetStateId": "503"
    },
    {
        "id": "05",
        "name": "Amasya",
        "lat": 40.6534,
        "lng": 35.8333,
        "elevation": 411,
        "diyanetDistrictId": "9198",
        "diyanetStateId": "505"
    },
    {
        "id": "07",
        "name": "Antalya",
        "lat": 36.8969,
        "lng": 30.7133,
        "elevation": 30,
        "diyanetDistrictId": "9225",
        "diyanetStateId": "507"
    },
    {
        "id": "08",
        "name": "Artvin",
        "lat": 41.1828,
        "lng": 41.8183,
        "elevation": 345,
        "diyanetDistrictId": "9246",
        "diyanetStateId": "509"
    },
    {
        "id": "09",
        "name": "Aydın",
        "lat": 37.856,
        "lng": 27.8416,
        "elevation": 65,
        "diyanetDistrictId": "9252",
        "diyanetStateId": "510"
    },
    {
        "id": "10",
        "name": "Balıkesir",
        "lat": 39.6484,
        "lng": 27.8826,
        "elevation": 139,
        "diyanetDistrictId": "9270",
        "diyanetStateId": "511"
    },
    {
        "id": "11",
        "name": "Bilecik",
        "lat": 40.1451,
        "lng": 29.9799,
        "elevation": 513,
        "diyanetDistrictId": "9297",
        "diyanetStateId": "515"
    },
    {
        "id": "12",
        "name": "Bingöl",
        "lat": 38.8854,
        "lng": 40.4983,
        "elevation": 1151,
        "diyanetDistrictId": "9303",
        "diyanetStateId": "516"
    },
    {
        "id": "13",
        "name": "Bitlis",
        "lat": 38.4006,
        "lng": 42.1095,
        "elevation": 1545,
        "diyanetDistrictId": "9311",
        "diyanetStateId": "517"
    },
    {
        "id": "14",
        "name": "Bolu",
        "lat": 40.735,
        "lng": 31.6061,
        "elevation": 726,
        "diyanetDistrictId": "9315",
        "diyanetStateId": "518"
    },
    {
        "id": "15",
        "name": "Burdur",
        "lat": 37.7203,
        "lng": 30.2908,
        "elevation": 950,
        "diyanetDistrictId": "9327",
        "diyanetStateId": "519"
    },
    {
        "id": "16",
        "name": "Bursa",
        "lat": 40.1885,
        "lng": 29.061,
        "elevation": 155,
        "diyanetDistrictId": "9335",
        "diyanetStateId": "520"
    },
    {
        "id": "17",
        "name": "Çanakkale",
        "lat": 40.1553,
        "lng": 26.4142,
        "elevation": 10,
        "diyanetDistrictId": "9352",
        "diyanetStateId": "521"
    },
    {
        "id": "18",
        "name": "Çankırı",
        "lat": 40.6013,
        "lng": 33.6134,
        "elevation": 730,
        "diyanetDistrictId": "9359",
        "diyanetStateId": "522"
    },
    {
        "id": "19",
        "name": "Çorum",
        "lat": 40.5506,
        "lng": 34.9556,
        "elevation": 801,
        "diyanetDistrictId": "9370",
        "diyanetStateId": "523"
    },
    {
        "id": "20",
        "name": "Denizli",
        "lat": 37.7765,
        "lng": 29.0864,
        "elevation": 354,
        "diyanetDistrictId": "9392",
        "diyanetStateId": "524"
    },
    {
        "id": "21",
        "name": "Diyarbakır",
        "lat": 37.9144,
        "lng": 40.2306,
        "elevation": 675,
        "diyanetDistrictId": "9402",
        "diyanetStateId": "525"
    },
    {
        "id": "22",
        "name": "Edirne",
        "lat": 41.6768,
        "lng": 26.5603,
        "elevation": 42,
        "diyanetDistrictId": "9419",
        "diyanetStateId": "527"
    },
    {
        "id": "23",
        "name": "Elazığ",
        "lat": 38.681,
        "lng": 39.2264,
        "elevation": 1067,
        "diyanetDistrictId": "9432",
        "diyanetStateId": "528"
    },
    {
        "id": "24",
        "name": "Erzincan",
        "lat": 39.75,
        "lng": 39.5,
        "elevation": 1185,
        "diyanetDistrictId": "9440",
        "diyanetStateId": "529"
    },
    {
        "id": "25",
        "name": "Erzurum",
        "lat": 39.9043,
        "lng": 41.2679,
        "elevation": 1890,
        "diyanetDistrictId": "9451",
        "diyanetStateId": "530"
    },
    {
        "id": "26",
        "name": "Eskişehir",
        "lat": 39.7767,
        "lng": 30.5206,
        "elevation": 788,
        "diyanetDistrictId": "9470",
        "diyanetStateId": "531"
    },
    {
        "id": "27",
        "name": "Gaziantep",
        "lat": 37.0662,
        "lng": 37.3833,
        "elevation": 850,
        "diyanetDistrictId": "9479",
        "diyanetStateId": "532"
    },
    {
        "id": "28",
        "name": "Giresun",
        "lat": 40.9128,
        "lng": 38.3895,
        "elevation": 10,
        "diyanetDistrictId": "9494",
        "diyanetStateId": "533"
    },
    {
        "id": "29",
        "name": "Gümüşhane",
        "lat": 40.46,
        "lng": 39.4814,
        "elevation": 1210,
        "diyanetDistrictId": "9501",
        "diyanetStateId": "534"
    },
    {
        "id": "30",
        "name": "Hakkari",
        "lat": 37.5833,
        "lng": 43.7333,
        "elevation": 1720,
        "diyanetDistrictId": "9507",
        "diyanetStateId": "535"
    },
    {
        "id": "31",
        "name": "Hatay",
        "lat": 36.4018,
        "lng": 36.3498,
        "elevation": 85,
        "diyanetDistrictId": "20089",
        "diyanetStateId": "536"
    },
    {
        "id": "32",
        "name": "Isparta",
        "lat": 37.7648,
        "lng": 30.5566,
        "elevation": 1035,
        "diyanetDistrictId": "9528",
        "diyanetStateId": "538"
    },
    {
        "id": "33",
        "name": "Mersin",
        "lat": 36.8,
        "lng": 34.6333,
        "elevation": 6,
        "diyanetDistrictId": "9737",
        "diyanetStateId": "557"
    },
    {
        "id": "36",
        "name": "Kars",
        "lat": 40.6167,
        "lng": 43.1,
        "elevation": 1768,
        "diyanetDistrictId": "9594",
        "diyanetStateId": "544"
    },
    {
        "id": "37",
        "name": "Kastamonu",
        "lat": 41.3887,
        "lng": 33.7827,
        "elevation": 774,
        "diyanetDistrictId": "9609",
        "diyanetStateId": "545"
    },
    {
        "id": "38",
        "name": "Kayseri",
        "lat": 38.7312,
        "lng": 35.4787,
        "elevation": 1054,
        "diyanetDistrictId": "9620",
        "diyanetStateId": "546"
    },
    {
        "id": "39",
        "name": "Kırklareli",
        "lat": 41.7333,
        "lng": 27.2167,
        "elevation": 203,
        "diyanetDistrictId": "9638",
        "diyanetStateId": "549"
    },
    {
        "id": "40",
        "name": "Kırşehir",
        "lat": 39.1425,
        "lng": 34.1709,
        "elevation": 985,
        "diyanetDistrictId": "9646",
        "diyanetStateId": "550"
    },
    {
        "id": "41",
        "name": "Kocaeli",
        "lat": 40.8533,
        "lng": 29.8815,
        "elevation": 100,
        "diyanetDistrictId": "9654",
        "diyanetStateId": "551"
    },
    {
        "id": "42",
        "name": "Konya",
        "lat": 37.8667,
        "lng": 32.4833,
        "elevation": 1016,
        "diyanetDistrictId": "9676",
        "diyanetStateId": "552"
    },
    {
        "id": "43",
        "name": "Kütahya",
        "lat": 39.4167,
        "lng": 29.9833,
        "elevation": 969,
        "diyanetDistrictId": "9689",
        "diyanetStateId": "553"
    },
    {
        "id": "44",
        "name": "Malatya",
        "lat": 38.3552,
        "lng": 38.3095,
        "elevation": 964,
        "diyanetDistrictId": "9703",
        "diyanetStateId": "554"
    },
    {
        "id": "45",
        "name": "Manisa",
        "lat": 38.6191,
        "lng": 27.4289,
        "elevation": 62,
        "diyanetDistrictId": "9716",
        "diyanetStateId": "555"
    },
    {
        "id": "46",
        "name": "Kahramanmaraş",
        "lat": 37.5858,
        "lng": 36.9371,
        "elevation": 568,
        "diyanetDistrictId": "9577",
        "diyanetStateId": "541"
    },
    {
        "id": "47",
        "name": "Mardin",
        "lat": 37.3212,
        "lng": 40.7245,
        "elevation": 1083,
        "diyanetDistrictId": "9726",
        "diyanetStateId": "556"
    },
    {
        "id": "48",
        "name": "Muğla",
        "lat": 37.2153,
        "lng": 28.3636,
        "elevation": 660,
        "diyanetDistrictId": "9747",
        "diyanetStateId": "558"
    },
    {
        "id": "49",
        "name": "Muş",
        "lat": 38.7432,
        "lng": 41.5064,
        "elevation": 1334,
        "diyanetDistrictId": "9755",
        "diyanetStateId": "559"
    },
    {
        "id": "50",
        "name": "Nevşehir",
        "lat": 38.6244,
        "lng": 34.7144,
        "elevation": 1224,
        "diyanetDistrictId": "9760",
        "diyanetStateId": "560"
    },
    {
        "id": "51",
        "name": "Niğde",
        "lat": 37.9667,
        "lng": 34.6833,
        "elevation": 1229,
        "diyanetDistrictId": "9766",
        "diyanetStateId": "561"
    },
    {
        "id": "52",
        "name": "Ordu",
        "lat": 40.9839,
        "lng": 37.8764,
        "elevation": 5,
        "diyanetDistrictId": "9782",
        "diyanetStateId": "562"
    },
    {
        "id": "53",
        "name": "Rize",
        "lat": 41.0201,
        "lng": 40.5234,
        "elevation": 6,
        "diyanetDistrictId": "9799",
        "diyanetStateId": "564"
    },
    {
        "id": "54",
        "name": "Sakarya",
        "lat": 40.7569,
        "lng": 30.3783,
        "elevation": 31,
        "diyanetDistrictId": "9807",
        "diyanetStateId": "565"
    },
    {
        "id": "55",
        "name": "Samsun",
        "lat": 41.2928,
        "lng": 36.3313,
        "elevation": 4,
        "diyanetDistrictId": "9819",
        "diyanetStateId": "566"
    },
    {
        "id": "56",
        "name": "Siirt",
        "lat": 37.9333,
        "lng": 41.95,
        "elevation": 895,
        "diyanetDistrictId": "9839",
        "diyanetStateId": "568"
    },
    {
        "id": "57",
        "name": "Sinop",
        "lat": 42.0231,
        "lng": 35.1531,
        "elevation": 25,
        "diyanetDistrictId": "9847",
        "diyanetStateId": "569"
    },
    {
        "id": "58",
        "name": "Sivas",
        "lat": 39.7477,
        "lng": 37.0179,
        "elevation": 1275,
        "diyanetDistrictId": "9868",
        "diyanetStateId": "571"
    },
    {
        "id": "59",
        "name": "Tekirdağ",
        "lat": 40.9833,
        "lng": 27.5167,
        "elevation": 37,
        "diyanetDistrictId": "9879",
        "diyanetStateId": "572"
    },
    {
        "id": "60",
        "name": "Tokat",
        "lat": 40.3167,
        "lng": 36.55,
        "elevation": 623,
        "diyanetDistrictId": "9887",
        "diyanetStateId": "573"
    },
    {
        "id": "61",
        "name": "Trabzon",
        "lat": 41.0015,
        "lng": 39.7178,
        "elevation": 30,
        "diyanetDistrictId": "9905",
        "diyanetStateId": "574"
    },
    {
        "id": "62",
        "name": "Tunceli",
        "lat": 39.1079,
        "lng": 39.5401,
        "elevation": 915,
        "diyanetDistrictId": "9914",
        "diyanetStateId": "575"
    },
    {
        "id": "63",
        "name": "Şanlıurfa",
        "lat": 37.1591,
        "lng": 38.7969,
        "elevation": 518,
        "diyanetDistrictId": "9831",
        "diyanetStateId": "567"
    },
    {
        "id": "64",
        "name": "Uşak",
        "lat": 38.6823,
        "lng": 29.4082,
        "elevation": 907,
        "diyanetDistrictId": "9919",
        "diyanetStateId": "576"
    },
    {
        "id": "65",
        "name": "Van",
        "lat": 38.4891,
        "lng": 43.4089,
        "elevation": 1727,
        "diyanetDistrictId": "9930",
        "diyanetStateId": "577"
    },
    {
        "id": "66",
        "name": "Yozgat",
        "lat": 39.8181,
        "lng": 34.8147,
        "elevation": 1300,
        "diyanetDistrictId": "9949",
        "diyanetStateId": "579"
    },
    {
        "id": "67",
        "name": "Zonguldak",
        "lat": 41.4564,
        "lng": 31.7987,
        "elevation": 135,
        "diyanetDistrictId": "9955",
        "diyanetStateId": "580"
    },
    {
        "id": "68",
        "name": "Aksaray",
        "lat": 38.3687,
        "lng": 34.037,
        "elevation": 980,
        "diyanetDistrictId": "9193",
        "diyanetStateId": "504"
    },
    {
        "id": "69",
        "name": "Bayburt",
        "lat": 40.2552,
        "lng": 40.2249,
        "elevation": 1550,
        "diyanetDistrictId": "9295",
        "diyanetStateId": "514"
    },
    {
        "id": "70",
        "name": "Karaman",
        "lat": 37.1759,
        "lng": 33.2287,
        "elevation": 1033,
        "diyanetDistrictId": "9587",
        "diyanetStateId": "543"
    },
    {
        "id": "71",
        "name": "Kırıkkale",
        "lat": 39.8468,
        "lng": 33.5153,
        "elevation": 750,
        "diyanetDistrictId": "9635",
        "diyanetStateId": "548"
    },
    {
        "id": "72",
        "name": "Batman",
        "lat": 37.8812,
        "lng": 41.1293,
        "elevation": 570,
        "diyanetDistrictId": "9288",
        "diyanetStateId": "513"
    },
    {
        "id": "73",
        "name": "Şırnak",
        "lat": 37.5164,
        "lng": 42.4594,
        "elevation": 1350,
        "diyanetDistrictId": "9854",
        "diyanetStateId": "570"
    },
    {
        "id": "74",
        "name": "Bartın",
        "lat": 41.6344,
        "lng": 32.3375,
        "elevation": 25,
        "diyanetDistrictId": "9285",
        "diyanetStateId": "512"
    },
    {
        "id": "75",
        "name": "Ardahan",
        "lat": 41.1105,
        "lng": 42.7022,
        "elevation": 1829,
        "diyanetDistrictId": "9238",
        "diyanetStateId": "508"
    },
    {
        "id": "76",
        "name": "Iğdır",
        "lat": 39.9196,
        "lng": 44.0454,
        "elevation": 858,
        "diyanetDistrictId": "9522",
        "diyanetStateId": "537"
    },
    {
        "id": "77",
        "name": "Yalova",
        "lat": 40.65,
        "lng": 29.2667,
        "elevation": 30,
        "diyanetDistrictId": "9935",
        "diyanetStateId": "578"
    },
    {
        "id": "78",
        "name": "Karabük",
        "lat": 41.2061,
        "lng": 32.6204,
        "elevation": 280,
        "diyanetDistrictId": "9581",
        "diyanetStateId": "542"
    },
    {
        "id": "79",
        "name": "Kilis",
        "lat": 36.7184,
        "lng": 37.1212,
        "elevation": 660,
        "diyanetDistrictId": "9629",
        "diyanetStateId": "547"
    },
    {
        "id": "80",
        "name": "Osmaniye",
        "lat": 37.0742,
        "lng": 36.2467,
        "elevation": 125,
        "diyanetDistrictId": "9788",
        "diyanetStateId": "563"
    },
    {
        "id": "81",
        "name": "Düzce",
        "lat": 40.8438,
        "lng": 31.1565,
        "elevation": 160,
        "diyanetDistrictId": "9414",
        "diyanetStateId": "526"
    }
];
