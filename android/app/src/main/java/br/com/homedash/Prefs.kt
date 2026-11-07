package br.com.homedash

import android.content.Context
import android.net.Uri

/** Configuração salva no aparelho. O token nunca sai daqui, a não ser para o script do Google. */
class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("homedash", Context.MODE_PRIVATE)

    var pageUrl: String
        get() = sp.getString(KEY_PAGE, null) ?: BuildConfig.DEFAULT_PAGE_URL
        set(v) = sp.edit().putString(KEY_PAGE, v.trim()).apply()

    var apiUrl: String
        get() = sp.getString(KEY_API, "") ?: ""
        set(v) = sp.edit().putString(KEY_API, v.trim()).apply()

    var token: String
        get() = sp.getString(KEY_TOKEN, "") ?: ""
        set(v) = sp.edit().putString(KEY_TOKEN, v.trim()).apply()

    var profile: String
        get() = sp.getString(KEY_PROFILE, "familia") ?: "familia"
        set(v) = sp.edit().putString(KEY_PROFILE, v).apply()

    var city: String
        get() = sp.getString(KEY_CITY, "") ?: ""
        set(v) = sp.edit().putString(KEY_CITY, v.trim()).apply()

    var latLon: String
        get() = sp.getString(KEY_LATLON, "") ?: ""
        set(v) = sp.edit().putString(KEY_LATLON, v.trim()).apply()

    var startOnBoot: Boolean
        get() = sp.getBoolean(KEY_BOOT, true)
        set(v) = sp.edit().putBoolean(KEY_BOOT, v).apply()

    val isConfigured: Boolean
        get() = sp.contains(KEY_PROFILE)

    /** Monta o endereço do painel com os parâmetros que o index.html entende. */
    fun dashboardUrl(): String {
        val b = Uri.parse(pageUrl).buildUpon()
        b.appendQueryParameter("pessoa", profile)
        if (apiUrl.isNotEmpty()) b.appendQueryParameter("api", apiUrl)
        if (token.isNotEmpty()) b.appendQueryParameter("token", token)
        if (city.isNotEmpty()) b.appendQueryParameter("cidade", city)
        val parts = latLon.split(",").map { it.trim() }
        if (parts.size == 2 && parts.all { it.toDoubleOrNull() != null }) {
            b.appendQueryParameter("lat", parts[0])
            b.appendQueryParameter("lon", parts[1])
        }
        return b.build().toString()
    }

    companion object {
        private const val KEY_PAGE = "page_url"
        private const val KEY_API = "api_url"
        private const val KEY_TOKEN = "token"
        private const val KEY_PROFILE = "profile"
        private const val KEY_CITY = "city"
        private const val KEY_LATLON = "lat_lon"
        private const val KEY_BOOT = "start_on_boot"

        val PROFILES = linkedMapOf(
            "familia" to "Família",
            "diego" to "Diego",
            "mariana" to "Mariana",
            "antonio" to "Antônio",
        )
    }
}
