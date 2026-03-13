@echo off
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set PATH=%JAVA_HOME%\bin;%PATH%

echo 1. Limpiando...
if exist dist rd /s /q dist
if exist android\app\build rd /s /q android\app\build

echo 2. Web Build...
call npm run build

echo 3. Capacitor Sync...
call npx cap sync android

echo 4. APK Build...
cd android
call gradlew.bat assembleDebug --no-daemon -Dorg.gradle.jvmargs="-Xmx1g"
cd ..

echo LISTO.
