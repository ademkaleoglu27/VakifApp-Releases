# Local Android Build Instructions

Terminale sırasıyla aşağıdaki komutları yapıştırın:

### 1. Android Klasörüne Git
```powershell
cd android
```

### 2. Temizlik Yap (Opsiyonel ama önerilir)
```powershell
./gradlew clean
```

### 3. Build Al (Release Modu)
```powershell
./gradlew assembleRelease
```

---
**APK Nerede Oluşacak?**
İşlem başarılı olursa APK şurada olacaktır:
`android\app\build\outputs\apk\release\app-release.apk`

**Klasörü Açmak İçin:**
```powershell
invoke-item app\build\outputs\apk\release
```
