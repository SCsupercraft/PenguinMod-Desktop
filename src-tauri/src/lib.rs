// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use chrono;
use std::{path::PathBuf, sync::{Arc, Mutex}};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_log;
use tokio::fs;

struct SetupState {
    frontend_init_task: bool,
    frontend_load_task: bool,
    frontend_changelog_closed: bool,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_process::init())
        .manage(Arc::new(Mutex::new(SetupState {
            frontend_init_task: false,
            frontend_load_task: false,
            frontend_changelog_closed: false,
        })))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some(
                            chrono::Local::now().format("%Y-%m-%d_%H-%M-%S").to_string(),
                        ),
                    }),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                ])
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![create_changelog_window, create_main_window, set_complete])
        .setup(|app| {
            let app_handle = app.handle().clone();

            Ok(if let Some(init_window) = app.get_webview_window("init") {
                init_window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Destroyed = event {
                        if let Some(main) = app_handle.get_webview_window("main") {
                            if !main.is_visible().unwrap_or(false) {
                                log::warn!("splash screen was closed before setup has completed; shutting down");
                                app_handle.exit(0);
                            }
                        } else {
                            log::warn!("splash screen was closed before setup has completed; shutting down");
                            app_handle.exit(0);
                        }
                    }
                });
            })
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn set_complete_sync(
    app: AppHandle,
    state: Arc<Mutex<SetupState>>,
    task: String,
) -> () {
    let mut state_lock = state.lock().unwrap();
    match task.as_str() {
        "frontend_init" => state_lock.frontend_init_task = true,
        "frontend_load" => state_lock.frontend_load_task = true,
        "frontend_changelog_closed" => state_lock.frontend_changelog_closed = true,
        _ => panic!("invalid task completed!"),
    }
    if state_lock.frontend_init_task && state_lock.frontend_load_task && state_lock.frontend_changelog_closed {
        log::info!("loaded; showing main window");

        let splash_window = app.get_webview_window("init").unwrap();
        let main_window = app.get_webview_window("main").unwrap();
        splash_window.destroy().unwrap();
        main_window.show().unwrap();
    }
    return;
}

#[tauri::command]
async fn set_complete(
    app: AppHandle,
    state: State<'_, Arc<Mutex<SetupState>>>,
    task: String,
) -> Result<(), ()> {
    set_complete_sync(app, state.inner().clone(), task);
    Ok(())
}

#[tauri::command]
async fn create_changelog_window(
    app: AppHandle, 
    state: State<'_, Arc<Mutex<SetupState>>>,
) -> Result<(), ()> {
    let current_version = app.package_info().version.to_string();
    let config_dir = app.path().app_config_dir().unwrap();
    let version_file = config_dir.join("version");

    let stored_version = fs::read_to_string(&version_file)
        .await
        .ok()
        .map(|s| s.trim().to_string());

    if let Some(v) = stored_version {
        if v.trim() == current_version {
            log::info!("version unchanged; skipping changelog window");
            
            set_complete_sync(app, state.inner().clone(), "frontend_changelog_closed".to_string());
            return Ok(());
        }
    }

    fs::create_dir_all(&config_dir).await.ok();
    fs::write(&version_file, current_version.as_bytes()).await.ok();

    let config = app.config().app.windows.get(2).cloned().unwrap();
    let state_handle = state.inner().clone();

    tauri::WebviewWindowBuilder::from_config(&app, &config)
        .unwrap()
        .build()
        .unwrap()
        .on_window_event(move |event| { 
            if let tauri::WindowEvent::Destroyed = event { 
                log::info!("changelog window was closed");
                set_complete_sync(app.clone(), state_handle.clone(), "frontend_changelog_closed".to_string());
                return;
            }
        });

    log::info!("created changelog window");
    Ok(())
}

#[tauri::command]
async fn create_main_window(
    app: AppHandle, 
    deep_link: Option<String>,
) -> Result<(), ()> {
    let mut config = app.config().app.windows.get(1).cloned().unwrap();

    if let Some(link) = deep_link {
        log::info!("deep link: {}", link);
        if let Some(project_id) = link.strip_prefix("penguinmod:projects/") {
            config.url = tauri::WebviewUrl::App(PathBuf::from(format!("fullscreen.html#{}", project_id)));
        }
        if let Some(project_url) = link.strip_prefix("penguinmod:project/") {
            config.url = tauri::WebviewUrl::App(PathBuf::from(format!("fullscreen.html?project_url={}", project_url)));
        }
    }

    let window = tauri::WebviewWindowBuilder::from_config(&app, &config)
        .unwrap()
        .build()
        .unwrap();

    let app_handle = app.clone();

    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Destroyed = event {
            log::info!("main window was closed; shutting down");
            app_handle.exit(0);
        }
    });

    log::info!("created main window");
    Ok(())
}
