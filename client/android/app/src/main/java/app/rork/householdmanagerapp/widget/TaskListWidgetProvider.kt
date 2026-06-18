package app.rork.householdmanagerapp.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import app.rork.householdmanagerapp.MainActivity
import app.rork.householdmanagerapp.R
import org.json.JSONArray
import org.json.JSONObject

class TaskListWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    updateWidgets(context, appWidgetManager, appWidgetIds)
  }

  override fun onEnabled(context: Context) {
    updateAll(context)
  }

  companion object {
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val componentName = ComponentName(context, TaskListWidgetProvider::class.java)
      val widgetIds = manager.getAppWidgetIds(componentName)
      if (widgetIds.isNotEmpty()) {
        updateWidgets(context, manager, widgetIds)
      }
    }

    private fun updateWidgets(context: Context, manager: AppWidgetManager, widgetIds: IntArray) {
      val payload = TaskWidgetStore.read(context)?.let { JSONObject(it) }
      widgetIds.forEach { widgetId ->
        manager.updateAppWidget(widgetId, buildRemoteViews(context, widgetId, payload))
      }
    }

    private fun buildRemoteViews(context: Context, widgetId: Int, payload: JSONObject?): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.widget_task_list)

      val homeName = payload?.optString("homeName").orEmpty().ifBlank { context.getString(R.string.task_widget_title) }
      val userName = payload?.optString("userName").orEmpty().ifBlank { "You" }
      val pendingCount = payload?.optInt("pendingCount", 0) ?: 0
      val totalCount = payload?.optInt("totalCount", 0) ?: 0
      val emptyMessage = payload?.optString("emptyMessage").orEmpty().ifBlank { context.getString(R.string.task_widget_empty) }
      val items = payload?.optJSONArray("items")

      views.setTextViewText(R.id.widget_home_name, homeName)
      views.setTextViewText(
        R.id.widget_summary,
        if (pendingCount == 0) {
          "$userName has no open tasks"
        } else {
          "$pendingCount open of $totalCount"
        },
      )

      val rows = listOf(
        Triple(R.id.widget_item_row_1, R.id.widget_item_name_1, R.id.widget_item_meta_1),
        Triple(R.id.widget_item_row_2, R.id.widget_item_name_2, R.id.widget_item_meta_2),
        Triple(R.id.widget_item_row_3, R.id.widget_item_name_3, R.id.widget_item_meta_3),
        Triple(R.id.widget_item_row_4, R.id.widget_item_name_4, R.id.widget_item_meta_4),
      )

      rows.forEachIndexed { index, row ->
        val item = items?.optJSONObject(index)
        val rowId = row.first
        val nameId = row.second
        val metaId = row.third

        if (item == null) {
          views.setViewVisibility(rowId, View.GONE)
          return@forEachIndexed
        }

        val taskId = item.optInt("id")
        val name = item.optString("name")
        val dueText = item.optString("dueText").orEmpty()
        val roomName = item.optString("roomName").orEmpty()
        val meta = buildList {
          if (dueText.isNotBlank()) add(dueText)
          if (roomName.isNotBlank()) add(roomName)
        }.joinToString(" • ").ifBlank { context.getString(R.string.task_widget_no_details) }

        views.setViewVisibility(rowId, View.VISIBLE)
        views.setTextViewText(nameId, name)
        views.setTextViewText(metaId, meta)
        views.setOnClickPendingIntent(rowId, createTaskPendingIntent(context, taskId))
      }

      if (items == null || items.length() == 0) {
        views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
        views.setTextViewText(R.id.widget_empty, emptyMessage)
      } else {
        views.setViewVisibility(R.id.widget_empty, View.GONE)
      }

      views.setOnClickPendingIntent(R.id.widget_root, createOpenPendingIntent(context))
      views.setOnClickPendingIntent(R.id.widget_open_button, createOpenPendingIntent(context))
      views.setOnClickPendingIntent(R.id.widget_add_button, createAddPendingIntent(context))

      return views
    }

    private fun createOpenPendingIntent(context: Context): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("household-manager-app:///tasks"))
      intent.setClass(context, MainActivity::class.java)
      intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      return PendingIntent.getActivity(
        context,
        1001,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    private fun createAddPendingIntent(context: Context): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("household-manager-app:///tasks?widgetAdd=1"))
      intent.setClass(context, MainActivity::class.java)
      intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      return PendingIntent.getActivity(
        context,
        1002,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    private fun createTaskPendingIntent(context: Context, taskId: Int): PendingIntent {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("household-manager-app:///tasks/$taskId"))
      intent.setClass(context, MainActivity::class.java)
      intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      return PendingIntent.getActivity(
        context,
        2000 + taskId,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
  }
}
