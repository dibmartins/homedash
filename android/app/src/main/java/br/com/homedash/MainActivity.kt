package br.com.homedash

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * Tela cheia com o painel. Segure o botão OK do controle (ou aperte MENU) para abrir as configurações.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private lateinit var prefs: Prefs
    private val handler = Handler(Looper.getMainLooper())
    private var loadedUrl: String? = null
    private val retry = Runnable { reload() }
    private lateinit var nativeVideo: NativeVideo

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        web = WebView(this).apply {
            // transparente: o vídeo nativo aparece por trás da página
            setBackgroundColor(Color.TRANSPARENT)
            isFocusable = false
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.loadWithOverviewMode = true
            settings.useWideViewPort = true
            webViewClient = object : WebViewClient() {
                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    // sem internet ao ligar a TV: tenta de novo em 30 segundos
                    if (request.isForMainFrame) scheduleRetry()
                }
            }
        }
        nativeVideo = NativeVideo(this, web)
        web.addJavascriptInterface(nativeVideo, "HomeDashTV")
        val root = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#11151C")) }
        root.addView(nativeVideo.box, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        root.addView(web, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        setContentView(root)
        hideSystemBars()

        if (!prefs.isConfigured) {
            openSettings()
        }
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
        val url = prefs.dashboardUrl()
        if (url != loadedUrl) {
            loadedUrl = url
            web.loadUrl(url)
        }
        web.onResume()
    }

    override fun onPause() {
        nativeVideo.stop()
        web.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        nativeVideo.release()
        web.destroy()
        super.onDestroy()
    }

    private fun reload() {
        nativeVideo.stop()
        loadedUrl = prefs.dashboardUrl()
        web.loadUrl(loadedUrl!!)
    }

    // setas para os lados no controle: passa para o perfil seguinte/anterior e já guarda a escolha
    private var lastSwitch = 0L
    private fun switchProfile(step: Int) {
        val now = System.currentTimeMillis()
        if (now - lastSwitch < 600) return // segurar a seta não fica trocando sem parar
        lastSwitch = now
        val keys = Prefs.PROFILES.keys.toList()
        val i = keys.indexOf(prefs.profile).let { if (it < 0) 0 else it }
        val next = keys[(i + step + keys.size) % keys.size]
        prefs.profile = next
        reload()
        Toast.makeText(this, "◀  " + Prefs.PROFILES[next] + "  ▶", Toast.LENGTH_SHORT).show()
    }

    private fun scheduleRetry() {
        handler.removeCallbacks(retry)
        handler.postDelayed(retry, 30_000)
    }

    private fun openSettings() {
        startActivity(Intent(this, SettingsActivity::class.java))
    }

    private fun hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                event.startTracking()
                return true
            }
            KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_SETTINGS -> {
                openSettings()
                return true
            }
            KeyEvent.KEYCODE_DPAD_RIGHT -> { switchProfile(+1); return true }
            KeyEvent.KEYCODE_DPAD_LEFT -> { switchProfile(-1); return true }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyLongPress(keyCode: Int, event: KeyEvent): Boolean {
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER) {
            openSettings()
            return true
        }
        return super.onKeyLongPress(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
        if ((keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER) && !event.isCanceled) {
            // toque curto no OK: recarrega o painel
            if (event.flags and KeyEvent.FLAG_CANCELED_LONG_PRESS == 0) {
                reload()
                Toast.makeText(this, R.string.reloading, Toast.LENGTH_SHORT).show()
            }
            return true
        }
        return super.onKeyUp(keyCode, event)
    }
}
