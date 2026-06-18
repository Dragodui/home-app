package app.rork.householdmanagerapp.widget

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

internal object TaskWidgetStore {
  private const val DIR_NAME = "task-widget"
  private const val FILE_NAME = "task_widget.json"

  fun save(context: Context, payload: String) {
    val directory = File(context.filesDir, DIR_NAME)
    if (!directory.exists()) {
      directory.mkdirs()
    }

    val file = File(directory, FILE_NAME)
    file.writeText(payload)
  }

  fun read(context: Context): String? {
    val file = File(File(context.filesDir, DIR_NAME), FILE_NAME)
    if (!file.exists()) return null

    val contents = file.readText().trim()
    if (contents.isEmpty() || contents == "null") return null
    return contents
  }
}

class TaskListWidgetModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "TaskListWidgetModule"

  @ReactMethod
  fun saveTaskWidgetData(payload: String?) {
    if (payload.isNullOrBlank() || payload == "null") {
      val directory = File(reactContext.filesDir, "task-widget")
      val file = File(directory, "task_widget.json")
      if (file.exists()) {
        file.delete()
      }
      TaskListWidgetProvider.updateAll(reactContext)
      return
    }

    TaskWidgetStore.save(reactContext, payload)
    TaskListWidgetProvider.updateAll(reactContext)
  }

  @ReactMethod
  fun refresh() {
    TaskListWidgetProvider.updateAll(reactContext)
  }
}
