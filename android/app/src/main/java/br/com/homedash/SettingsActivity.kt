package br.com.homedash

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

/**
 * Configuração pelo controle remoto. Dica: no app Google TV do celular, o teclado
 * do controle virtual permite colar textos longos (como o token).
 */
class SettingsActivity : AppCompatActivity() {

    private lateinit var prefs: Prefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)
        prefs = Prefs(this)

        val group = findViewById<RadioGroup>(R.id.profiles)
        Prefs.PROFILES.forEach { (key, label) ->
            group.addView(RadioButton(this).apply {
                id = View.generateViewId()
                text = label
                tag = key
                textSize = 20f
                isChecked = key == prefs.profile
            })
        }

        val page = findViewById<EditText>(R.id.page_url).apply { setText(prefs.pageUrl) }
        val api = findViewById<EditText>(R.id.api_url).apply { setText(prefs.apiUrl) }
        val token = findViewById<EditText>(R.id.token).apply { setText(prefs.token) }
        val city = findViewById<EditText>(R.id.city).apply { setText(prefs.city) }
        val latLon = findViewById<EditText>(R.id.lat_lon).apply { setText(prefs.latLon) }
        val boot = findViewById<CheckBox>(R.id.start_on_boot).apply { isChecked = prefs.startOnBoot }

        // Colar o endereço completo do painel (o mesmo do navegador) preenche todos os campos.
        val full = findViewById<EditText>(R.id.full_url)
        fun applyFullUrl(showErrors: Boolean): Boolean {
            val text = full.text.toString().trim()
            if (text.isEmpty()) return false
            val uri = try { Uri.parse(text) } catch (e: Exception) { null }
            val apiValue = uri?.getQueryParameter("api")
            val tokenValue = uri?.getQueryParameter("token")
            if (uri == null || uri.scheme.isNullOrEmpty() || apiValue.isNullOrEmpty() || tokenValue.isNullOrEmpty()) {
                if (showErrors) Toast.makeText(this, R.string.full_url_invalid, Toast.LENGTH_LONG).show()
                return false
            }
            page.setText(uri.buildUpon().clearQuery().fragment(null).build().toString())
            api.setText(apiValue)
            token.setText(tokenValue)
            uri.getQueryParameter("cidade")?.let { city.setText(it) }
            val lat = uri.getQueryParameter("lat")
            val lon = uri.getQueryParameter("lon")
            if (!lat.isNullOrEmpty() && !lon.isNullOrEmpty()) latLon.setText("$lat, $lon")
            uri.getQueryParameter("pessoa")?.let { key ->
                for (i in 0 until group.childCount) {
                    val rb = group.getChildAt(i) as RadioButton
                    if (rb.tag == key) rb.isChecked = true
                }
            }
            return true
        }
        var lastApplied = ""
        full.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val now = s?.toString()?.trim() ?: ""
                if (now != lastApplied && applyFullUrl(false)) {
                    lastApplied = now
                    Toast.makeText(this@SettingsActivity, R.string.full_url_ok, Toast.LENGTH_SHORT).show()
                }
            }
        })

        findViewById<TextView>(R.id.version).text = getString(R.string.version, BuildConfig.VERSION_NAME)

        findViewById<Button>(R.id.save).setOnClickListener {
            if (full.text.isNotBlank() && !applyFullUrl(true)) return@setOnClickListener
            val checked = group.findViewById<RadioButton>(group.checkedRadioButtonId)
            prefs.profile = (checked?.tag as? String) ?: "familia"
            prefs.pageUrl = page.text.toString().ifBlank { BuildConfig.DEFAULT_PAGE_URL }
            prefs.apiUrl = api.text.toString()
            prefs.token = token.text.toString()
            prefs.city = city.text.toString()
            prefs.latLon = latLon.text.toString()
            prefs.startOnBoot = boot.isChecked
            if (boot.isChecked) askOverlayPermissionIfNeeded()
            Toast.makeText(this, R.string.saved, Toast.LENGTH_SHORT).show()
            finish()
        }

        full.requestFocus()
    }

    /** Android 10+ só deixa abrir um app sozinho no boot se ele puder "sobrepor outros apps". */
    private fun askOverlayPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || Settings.canDrawOverlays(this)) return
        try {
            startActivity(
                Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))
            )
        } catch (e: Exception) {
            // algumas Android TV escondem essa tela; veja o README (comando adb)
            Toast.makeText(this, R.string.overlay_hint, Toast.LENGTH_LONG).show()
        }
    }
}
