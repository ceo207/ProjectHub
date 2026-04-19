#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                use tauri::Manager;
                use image::GenericImageView;
                let window = app.get_webview_window("main").unwrap();
                let bytes = include_bytes!("../icons/app-icon.png");
                let img = image::load_from_memory(bytes).unwrap();
                let (w, h) = img.dimensions();
                let icon = tauri::image::Image::new_owned(img.into_rgba8().into_raw(), w, h);
                window.set_icon(icon)?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
