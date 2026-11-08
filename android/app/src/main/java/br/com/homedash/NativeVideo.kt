package br.com.homedash

import android.app.Activity
import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.VideoView
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Toca os vídeos do álbum com o player do próprio Android (decodificação por hardware),
 * atrás da página. O WebView fica transparente onde o vídeo aparece.
 *
 * A página chama, pelo objeto `HomeDashTV`:
 *  - prepare(url): baixa o vídeo inteiro para o cache; responde "ready" ou "error";
 *  - play(url, left): toca o vídeo já baixado, a partir de `left` (0–1) da largura da tela;
 *    responde "playing", "ended" ou "error";
 *  - stop(): para e esconde o vídeo.
 * As respostas chegam em window.__nativeVideo(url, estado).
 */
class NativeVideo(private val activity: Activity, private val web: WebView) {

    val box = FrameLayout(activity).apply {
        setBackgroundColor(Color.BLACK)
        visibility = View.INVISIBLE
    }
    private val video = VideoView(activity)
    private val io = Executors.newSingleThreadExecutor()
    private var current: String? = null

    init {
        box.addView(video, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER))
        video.setOnPreparedListener { mp ->
            mp.setVolume(0f, 0f)
            video.start()
            current?.let { send(it, "playing") }
        }
        video.setOnCompletionListener { current?.let { send(it, "ended") } }
        video.setOnErrorListener { _, _, _ ->
            current?.let { send(it, "error") }
            true
        }
    }

    @JavascriptInterface
    fun prepare(url: String) {
        if (!allowed(url)) { send(url, "error"); return }
        io.execute {
            val ok = try { download(url); true } catch (e: Exception) { false }
            send(url, if (ok) "ready" else "error")
        }
    }

    @JavascriptInterface
    fun play(url: String, left: Double) {
        activity.runOnUiThread {
            val file = fileFor(url)
            if (!file.exists()) { send(url, "error"); return@runOnUiThread }
            current = url
            val root = box.parent as? View
            val lp = box.layoutParams as FrameLayout.LayoutParams
            lp.leftMargin = ((root?.width ?: 0) * left.coerceIn(0.0, 0.9)).toInt()
            box.layoutParams = lp
            box.visibility = View.VISIBLE
            video.setVideoPath(file.path)
        }
    }

    @JavascriptInterface
    fun stop() {
        activity.runOnUiThread {
            current = null
            video.stopPlayback()
            box.visibility = View.INVISIBLE
        }
    }

    fun release() {
        io.shutdownNow()
        video.stopPlayback()
    }

    // só baixa vídeos do Google Fotos
    private fun allowed(url: String) = try {
        val u = URL(url)
        u.protocol == "https" && u.host.endsWith(".googleusercontent.com")
    } catch (e: Exception) { false }

    private fun fileFor(url: String) =
        File(activity.cacheDir, "video-" + Integer.toHexString(url.hashCode()) + ".mp4")

    private fun download(url: String) {
        val file = fileFor(url)
        if (file.exists() && file.length() > 0) { file.setLastModified(System.currentTimeMillis()); return }
        val part = File(file.path + ".part")
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.instanceFollowRedirects = true
            conn.connectTimeout = 15_000
            conn.readTimeout = 30_000
            if (conn.responseCode !in 200..299) throw IOException("http " + conn.responseCode)
            if (!(conn.contentType ?: "").startsWith("video/")) throw IOException("não é vídeo")
            val len = conn.getHeaderField("Content-Length")?.toLongOrNull() ?: -1L
            if (len > MAX_BYTES) throw IOException("vídeo grande demais")
            var total = 0L
            conn.inputStream.use { input ->
                part.outputStream().use { out ->
                    val buf = ByteArray(64 * 1024)
                    while (true) {
                        val n = input.read(buf)
                        if (n < 0) break
                        total += n
                        if (total > MAX_BYTES) throw IOException("vídeo grande demais")
                        out.write(buf, 0, n)
                    }
                }
            }
            if (!part.renameTo(file)) throw IOException("não salvou")
        } catch (e: Exception) {
            part.delete()
            throw e
        } finally {
            conn.disconnect()
        }
        prune()
    }

    // guarda só os vídeos mais recentes no cache
    private fun prune() {
        val files = activity.cacheDir.listFiles { f -> f.name.startsWith("video-") && f.name.endsWith(".mp4") } ?: return
        files.sortedByDescending { it.lastModified() }.drop(KEEP).forEach { if (fileFor(current ?: "").path != it.path) it.delete() }
    }

    private fun send(url: String, state: String) {
        activity.runOnUiThread {
            web.evaluateJavascript(
                "window.__nativeVideo && window.__nativeVideo(" + JSONObject.quote(url) + "," + JSONObject.quote(state) + ")", null)
        }
    }

    companion object {
        private const val MAX_BYTES = 200L * 1024 * 1024
        private const val KEEP = 4
    }
}
