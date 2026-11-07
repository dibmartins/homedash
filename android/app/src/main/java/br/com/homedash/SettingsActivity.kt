package br.com.homedash

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
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

        findViewById<TextView>(R.id.version).text = getString(R.string.version, BuildConfig.VERSION_NAME)

        findViewById<Button>(R.id.save).setOnClickListener {
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

        group.requestFocus()
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
