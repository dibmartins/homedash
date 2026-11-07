package br.com.homedash

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Abre o painel quando a TV/stick termina de ligar. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED && action != "android.intent.action.QUICKBOOT_POWERON") return
        if (!Prefs(context).startOnBoot) return
        context.startActivity(
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
    }
}
