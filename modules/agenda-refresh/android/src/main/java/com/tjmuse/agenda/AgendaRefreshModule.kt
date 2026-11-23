package com.tjmuse.agenda

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray

class AgendaRefreshModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AgendaRefresh")
    Function("schedule") { times: List<Double> ->
      appContext.reactContext?.let { context ->
        context.getSharedPreferences("agenda_refresh", Context.MODE_PRIVATE).edit()
          .putString("times", JSONArray(times.map { it.toLong() }).toString()).apply()
        AgendaRefreshReceiver.scheduleNext(context)
      }
    }
  }
}
// Refreshes the already stored, read-only widget snapshot; never launches an app,
// browser, school request or JS conversation. No exact-alarm permission required.
class AgendaRefreshReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val provider = ComponentName(context.packageName, "${context.packageName}.DailyAgendaProvider")
    val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(provider)
    if (ids.isNotEmpty()) context.sendBroadcast(Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
      .setComponent(provider).putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids))
    scheduleNext(context)
  }
  companion object {
    fun scheduleNext(context: Context) {
      val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val pending = PendingIntent.getBroadcast(context, 5050,
        Intent(context, AgendaRefreshReceiver::class.java).setAction("com.tjmuse.agenda.REFRESH"),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      alarm.cancel(pending)
      val raw = context.getSharedPreferences("agenda_refresh", Context.MODE_PRIVATE).getString("times", "[]")
      val now = System.currentTimeMillis()
      val times = try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
      var next = Long.MAX_VALUE
      for (i in 0 until times.length()) { val at = times.optLong(i); if (at > now && at < next) next = at }
      if (next != Long.MAX_VALUE) alarm.setAndAllowWhileIdle(AlarmManager.RTC, next, pending)
    }
  }
}
