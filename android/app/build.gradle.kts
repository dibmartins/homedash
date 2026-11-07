plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "br.com.homedash"
    compileSdk = 35

    defaultConfig {
        applicationId = "br.com.homedash"
        minSdk = 24
        targetSdk = 35
        versionCode = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
        versionName = "0.1.${System.getenv("GITHUB_RUN_NUMBER") ?: "0"}"
        // Endereço padrão do painel (GitHub Pages). Pode ser trocado na tela de configuração.
        buildConfigField("String", "DEFAULT_PAGE_URL", "\"https://dibmartins.github.io/homedash/\"")
    }

    signingConfigs {
        // Assinatura opcional via segredos do GitHub (ver README). Sem eles, o APK sai assinado com a chave de debug.
        val ks = System.getenv("HOMEDASH_KEYSTORE_PATH")
        if (ks != null && file(ks).exists()) {
            create("release") {
                storeFile = file(ks)
                storePassword = System.getenv("HOMEDASH_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("HOMEDASH_KEY_ALIAS")
                keyPassword = System.getenv("HOMEDASH_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
}
