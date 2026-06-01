import java.util.Properties

import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localPropertiesFile.inputStream().use { localProperties.load(it) }
}

fun readMapsKeyFromEnvFiles(): String {
    val candidates = listOf(
        rootProject.file("../../../../../frontend/.env.local"),
        rootProject.file("../../../../../apps/web/.env.local"),
        rootProject.file("../../../../../backend/.env"),
    )
    for (file in candidates) {
        if (!file.exists()) continue
        for (line in file.readLines()) {
            val trimmed = line.trim()
            if (trimmed.startsWith("#") || !trimmed.contains("=")) continue
            val eq = trimmed.indexOf('=')
            val name = trimmed.substring(0, eq).trim()
            val value = trimmed.substring(eq + 1).trim()
            if ((name == "NEXT_PUBLIC_GOOGLE_MAPS_KEY" || name == "GOOGLE_MAPS_API_KEY") &&
                value.isNotEmpty() && !value.contains("your_")
            ) {
                return value
            }
        }
    }
    return ""
}

val googleMapsApiKey = localProperties.getProperty("GOOGLE_MAPS_API_KEY")
    ?.takeIf { it.isNotEmpty() }
    ?: readMapsKeyFromEnvFiles()

android {
    namespace = "com.getgas.getgas_customer"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.getgas.getgas_customer"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["GOOGLE_MAPS_API_KEY"] = googleMapsApiKey
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_11)
    }
}
