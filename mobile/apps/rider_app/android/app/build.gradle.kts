import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
}

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localPropertiesFile.inputStream().use { localProperties.load(it) }
}

// Release signing — create android/key.properties with:
//   storeFile=<absolute path to .jks>
//   storePassword=<password>
//   keyAlias=<alias>
//   keyPassword=<password>
val keyPropertiesFile = rootProject.file("key.properties")
val keyProperties = Properties()
if (keyPropertiesFile.exists()) {
    keyPropertiesFile.inputStream().use { keyProperties.load(it) }
}

fun readMapsKeyFromEnvFiles(): String {
    val candidates = listOf(
        rootProject.file("../../../../frontend/.env.local"),
        rootProject.file("../../../../apps/web/.env.local"),
        rootProject.file("../../../../backend/.env"),
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
    namespace = "com.getgas.rider"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
        isCoreLibraryDesugaringEnabled = true
    }

    defaultConfig {
        applicationId = "com.getgas.rider"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["GOOGLE_MAPS_API_KEY"] = googleMapsApiKey
    }

    signingConfigs {
        if (keyPropertiesFile.exists()) {
            create("release") {
                storeFile = file(keyProperties["storeFile"] as String)
                storePassword = keyProperties["storePassword"] as String
                keyAlias = keyProperties["keyAlias"] as String
                keyPassword = keyProperties["keyPassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (keyPropertiesFile.exists())
                signingConfigs.getByName("release")
            else
                signingConfigs.getByName("debug")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    dependencies {
        coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
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
