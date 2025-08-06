use anyhow::Result;
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::path::PathBuf;
use std::process::Command;
use std::fs;
use std::os::unix::fs::PermissionsExt;
use tauri::Manager;
use reqwest;
use crate::error_messages;

/// Type of Claude installation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum InstallationType {
    /// System-installed binary
    System,
    /// Custom path specified by user
    Custom,
    /// Bundled with application
    Bundled,
}

/// Node.js runtime information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeRuntime {
    /// Path to Node.js binary
    pub path: String,
    /// Version string if available
    pub version: Option<String>,
    /// Source of Node.js (system, bundled, downloaded)
    pub source: String,
    /// Whether this is a bundled runtime
    pub is_bundled: bool,
}

/// Represents a Claude installation with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeInstallation {
    /// Full path to the Claude binary
    pub path: String,
    /// Version string if available
    pub version: Option<String>,
    /// Source of discovery (e.g., "nvm", "system", "homebrew", "which")
    pub source: String,
    /// Type of installation
    pub installation_type: InstallationType,
}

/// Main function to find the Claude binary
/// Checks database first for stored path and preference, then prioritizes accordingly
/// Falls back to bundled Node.js runtime if system Node.js is not available
pub fn find_claude_binary(app_handle: &tauri::AppHandle) -> Result<String, String> {
    info!("Searching for claude binary...");

    // First check if we have a stored path and preference in the database
    if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
        let db_path = app_data_dir.join("agents.db");
        if db_path.exists() {
            if let Ok(conn) = rusqlite::Connection::open(&db_path) {
                // Check for stored path first
                if let Ok(stored_path) = conn.query_row(
                    "SELECT value FROM app_settings WHERE key = 'claude_binary_path'",
                    [],
                    |row| row.get::<_, String>(0),
                ) {
                    info!("Found stored claude path in database: {}", stored_path);
                    
                    // Check if the path still exists
                    let path_buf = PathBuf::from(&stored_path);
                    if path_buf.exists() && path_buf.is_file() {
                        return Ok(stored_path);
                    } else {
                        warn!("Stored claude path no longer exists: {}", stored_path);
                    }
                }
                
                // Check user preference
                let preference = conn.query_row(
                    "SELECT value FROM app_settings WHERE key = 'claude_installation_preference'",
                    [],
                    |row| row.get::<_, String>(0),
                ).unwrap_or_else(|_| "system".to_string());
                
                info!("User preference for Claude installation: {}", preference);
            }
        }
    }

    // Discover all available system installations
    let installations = discover_system_installations();

    if installations.is_empty() {
        info!("No system Claude installations found, attempting to use bundled Node.js runtime");
        
        // Try to ensure Node.js runtime is available (system or bundled)
        match ensure_node_runtime(app_handle) {
            Ok(node_runtime) => {
                info!("Node.js runtime available: {:?}", node_runtime);
                // Try to use global Claude installation with bundled Node.js
                if let Ok(claude_path) = find_global_claude_with_bundled_node(app_handle) {
                    return Ok(claude_path);
                }
            }
            Err(e) => {
                warn!("Failed to ensure Node.js runtime: {}", e);
            }
        }
        
        error!("Could not find claude binary in any location and Node.js runtime unavailable");
        return Err(error_messages::format_error_with_suggestion("Claude Code not found"));
    }

    // Log all found installations
    for installation in &installations {
        info!("Found Claude installation: {:?}", installation);
    }

    // Select the best installation (highest version)
    if let Some(best) = select_best_installation(installations) {
        info!(
            "Selected Claude installation: path={}, version={:?}, source={}",
            best.path, best.version, best.source
        );
        Ok(best.path)
    } else {
        Err("No valid Claude installation found".to_string())
    }
}

/// Discovers all available Claude installations and returns them for selection
/// This allows UI to show a version selector
pub fn discover_claude_installations() -> Vec<ClaudeInstallation> {
    info!("Discovering all Claude installations...");

    let mut installations = discover_system_installations();

    // Sort by version (highest first), then by source preference
    installations.sort_by(|a, b| {
        match (&a.version, &b.version) {
            (Some(v1), Some(v2)) => {
                // Compare versions in descending order (newest first)
                match compare_versions(v2, v1) {
                    Ordering::Equal => {
                        // If versions are equal, prefer by source
                        source_preference(a).cmp(&source_preference(b))
                    }
                    other => other,
                }
            }
            (Some(_), None) => Ordering::Less, // Version comes before no version
            (None, Some(_)) => Ordering::Greater,
            (None, None) => source_preference(a).cmp(&source_preference(b)),
        }
    });

    installations
}

/// Returns a preference score for installation sources (lower is better)
fn source_preference(installation: &ClaudeInstallation) -> u8 {
    match installation.source.as_str() {
        "which" => 1,
        "homebrew" => 2,
        "system" => 3,
        source if source.starts_with("nvm") => 4,
        "local-bin" => 5,
        "claude-local" => 6,
        "npm-global" => 7,
        "yarn" | "yarn-global" => 8,
        "bun" => 9,
        "node-modules" => 10,
        "home-bin" => 11,
        "PATH" => 12,
        _ => 13,
    }
}

/// Discovers all Claude installations on the system
fn discover_system_installations() -> Vec<ClaudeInstallation> {
    let mut installations = Vec::new();

    // 1. Try 'which' command first (now works in production)
    if let Some(installation) = try_which_command() {
        installations.push(installation);
    }

    // 2. Check NVM paths
    installations.extend(find_nvm_installations());

    // 3. Check standard paths
    installations.extend(find_standard_installations());

    // Remove duplicates by path
    let mut unique_paths = std::collections::HashSet::new();
    installations.retain(|install| unique_paths.insert(install.path.clone()));

    installations
}

/// Try using the 'which' command to find Claude
fn try_which_command() -> Option<ClaudeInstallation> {
    debug!("Trying 'which claude' to find binary...");

    match Command::new("which").arg("claude").output() {
        Ok(output) if output.status.success() => {
            let output_str = String::from_utf8_lossy(&output.stdout).trim().to_string();

            if output_str.is_empty() {
                return None;
            }

            // Parse aliased output: "claude: aliased to /path/to/claude"
            let path = if output_str.starts_with("claude:") && output_str.contains("aliased to") {
                output_str
                    .split("aliased to")
                    .nth(1)
                    .map(|s| s.trim().to_string())
            } else {
                Some(output_str)
            }?;

            debug!("'which' found claude at: {}", path);

            // Verify the path exists
            if !PathBuf::from(&path).exists() {
                warn!("Path from 'which' does not exist: {}", path);
                return None;
            }

            // Get version
            let version = get_claude_version(&path).ok().flatten();

            Some(ClaudeInstallation {
                path,
                version,
                source: "which".to_string(),
                installation_type: InstallationType::System,
            })
        }
        _ => None,
    }
}

/// Find Claude installations in NVM directories
fn find_nvm_installations() -> Vec<ClaudeInstallation> {
    let mut installations = Vec::new();

    if let Ok(home) = std::env::var("HOME") {
        let nvm_dir = PathBuf::from(&home)
            .join(".nvm")
            .join("versions")
            .join("node");

        debug!("Checking NVM directory: {:?}", nvm_dir);

        if let Ok(entries) = std::fs::read_dir(&nvm_dir) {
            for entry in entries.flatten() {
                if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                    let claude_path = entry.path().join("bin").join("claude");

                    if claude_path.exists() && claude_path.is_file() {
                        let path_str = claude_path.to_string_lossy().to_string();
                        let node_version = entry.file_name().to_string_lossy().to_string();

                        debug!("Found Claude in NVM node {}: {}", node_version, path_str);

                        // Get Claude version
                        let version = get_claude_version(&path_str).ok().flatten();

                        installations.push(ClaudeInstallation {
                            path: path_str,
                            version,
                            source: format!("nvm ({})", node_version),
                            installation_type: InstallationType::System,
                        });
                    }
                }
            }
        }
    }

    installations
}

/// Check standard installation paths
fn find_standard_installations() -> Vec<ClaudeInstallation> {
    let mut installations = Vec::new();

    // Common installation paths for claude
    let mut paths_to_check: Vec<(String, String)> = vec![
        ("/usr/local/bin/claude".to_string(), "system".to_string()),
        (
            "/opt/homebrew/bin/claude".to_string(),
            "homebrew".to_string(),
        ),
        ("/usr/bin/claude".to_string(), "system".to_string()),
        ("/bin/claude".to_string(), "system".to_string()),
    ];

    // Also check user-specific paths
    if let Ok(home) = std::env::var("HOME") {
        paths_to_check.extend(vec![
            (
                format!("{}/.claude/local/claude", home),
                "claude-local".to_string(),
            ),
            (
                format!("{}/.local/bin/claude", home),
                "local-bin".to_string(),
            ),
            (
                format!("{}/.npm-global/bin/claude", home),
                "npm-global".to_string(),
            ),
            (format!("{}/.yarn/bin/claude", home), "yarn".to_string()),
            (format!("{}/.bun/bin/claude", home), "bun".to_string()),
            (format!("{}/bin/claude", home), "home-bin".to_string()),
            // Check common node_modules locations
            (
                format!("{}/node_modules/.bin/claude", home),
                "node-modules".to_string(),
            ),
            (
                format!("{}/.config/yarn/global/node_modules/.bin/claude", home),
                "yarn-global".to_string(),
            ),
        ]);
    }

    // Check each path
    for (path, source) in paths_to_check {
        let path_buf = PathBuf::from(&path);
        if path_buf.exists() && path_buf.is_file() {
            debug!("Found claude at standard path: {} ({})", path, source);

            // Get version
            let version = get_claude_version(&path).ok().flatten();

            installations.push(ClaudeInstallation {
                path,
                version,
                source,
                installation_type: InstallationType::System,
            });
        }
    }

    // Also check if claude is available in PATH (without full path)
    if let Ok(output) = Command::new("claude").arg("--version").output() {
        if output.status.success() {
            debug!("claude is available in PATH");
            let version = extract_version_from_output(&output.stdout);

            installations.push(ClaudeInstallation {
                path: "claude".to_string(),
                version,
                source: "PATH".to_string(),
                installation_type: InstallationType::System,
            });
        }
    }

    installations
}

/// Get Claude version by running --version command
fn get_claude_version(path: &str) -> Result<Option<String>, String> {
    match Command::new(path).arg("--version").output() {
        Ok(output) => {
            if output.status.success() {
                Ok(extract_version_from_output(&output.stdout))
            } else {
                Ok(None)
            }
        }
        Err(e) => {
            warn!("Failed to get version for {}: {}", path, e);
            Ok(None)
        }
    }
}

/// Extract version string from command output
fn extract_version_from_output(stdout: &[u8]) -> Option<String> {
    let output_str = String::from_utf8_lossy(stdout);
    
    // Debug log the raw output
    debug!("Raw version output: {:?}", output_str);
    
    // Use regex to directly extract version pattern (e.g., "1.0.41")
    // This pattern matches:
    // - One or more digits, followed by
    // - A dot, followed by
    // - One or more digits, followed by
    // - A dot, followed by
    // - One or more digits
    // - Optionally followed by pre-release/build metadata
    let version_regex = regex::Regex::new(r"(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?)").ok()?;
    
    if let Some(captures) = version_regex.captures(&output_str) {
        if let Some(version_match) = captures.get(1) {
            let version = version_match.as_str().to_string();
            debug!("Extracted version: {:?}", version);
            return Some(version);
        }
    }
    
    debug!("No version found in output");
    None
}

/// Select the best installation based on version
fn select_best_installation(installations: Vec<ClaudeInstallation>) -> Option<ClaudeInstallation> {
    // In production builds, version information may not be retrievable because
    // spawning external processes can be restricted. We therefore no longer
    // discard installations that lack a detected version – the mere presence
    // of a readable binary on disk is enough to consider it valid. We still
    // prefer binaries with version information when it is available so that
    // in development builds we keep the previous behaviour of picking the
    // most recent version.
    installations.into_iter().max_by(|a, b| {
        match (&a.version, &b.version) {
            // If both have versions, compare them semantically.
            (Some(v1), Some(v2)) => compare_versions(v1, v2),
            // Prefer the entry that actually has version information.
            (Some(_), None) => Ordering::Greater,
            (None, Some(_)) => Ordering::Less,
            // Neither have version info: prefer the one that is not just
            // the bare "claude" lookup from PATH, because that may fail
            // at runtime if PATH is modified.
            (None, None) => {
                if a.path == "claude" && b.path != "claude" {
                    Ordering::Less
                } else if a.path != "claude" && b.path == "claude" {
                    Ordering::Greater
                } else {
                    Ordering::Equal
                }
            }
        }
    })
}

/// Compare two version strings
fn compare_versions(a: &str, b: &str) -> Ordering {
    // Simple semantic version comparison
    let a_parts: Vec<u32> = a
        .split('.')
        .filter_map(|s| {
            // Handle versions like "1.0.17-beta" by taking only numeric part
            s.chars()
                .take_while(|c| c.is_numeric())
                .collect::<String>()
                .parse()
                .ok()
        })
        .collect();

    let b_parts: Vec<u32> = b
        .split('.')
        .filter_map(|s| {
            s.chars()
                .take_while(|c| c.is_numeric())
                .collect::<String>()
                .parse()
                .ok()
        })
        .collect();

    // Compare each part
    for i in 0..std::cmp::max(a_parts.len(), b_parts.len()) {
        let a_val = a_parts.get(i).unwrap_or(&0);
        let b_val = b_parts.get(i).unwrap_or(&0);
        match a_val.cmp(b_val) {
            Ordering::Equal => continue,
            other => return other,
        }
    }

    Ordering::Equal
}

/// Helper function to create a Command with proper environment variables
/// This ensures commands like Claude can find Node.js and other dependencies
pub fn create_command_with_env(program: &str) -> Command {
    let mut cmd = Command::new(program);
    
    info!("Creating command for: {}", program);

    // Inherit essential environment variables from parent process
    for (key, value) in std::env::vars() {
        // Pass through PATH and other essential environment variables
        if key == "PATH"
            || key == "HOME"
            || key == "USER"
            || key == "SHELL"
            || key == "LANG"
            || key == "LC_ALL"
            || key.starts_with("LC_")
            || key == "NODE_PATH"
            || key == "NVM_DIR"
            || key == "NVM_BIN"
            || key == "HOMEBREW_PREFIX"
            || key == "HOMEBREW_CELLAR"
            // Add proxy environment variables (only uppercase)
            || key == "HTTP_PROXY"
            || key == "HTTPS_PROXY"
            || key == "NO_PROXY"
            || key == "ALL_PROXY"
        {
            debug!("Inheriting env var: {}={}", key, value);
            cmd.env(&key, &value);
        }
    }
    
    // Log proxy-related environment variables for debugging
    info!("Command will use proxy settings:");
    if let Ok(http_proxy) = std::env::var("HTTP_PROXY") {
        info!("  HTTP_PROXY={}", http_proxy);
    }
    if let Ok(https_proxy) = std::env::var("HTTPS_PROXY") {
        info!("  HTTPS_PROXY={}", https_proxy);
    }

    // Enhance PATH with common Node.js installation directories
    let mut enhanced_path = std::env::var("PATH").unwrap_or_default();
    let mut paths_to_add = Vec::new();
    
    // Check common Node.js installation paths
    // IMPORTANT: /opt/homebrew/bin must be early in PATH for Node.js to be found
    let mut potential_node_paths = vec![
        "/opt/homebrew/bin".to_string(), // Homebrew on M1 Macs - MUST BE FIRST
        "/usr/local/bin".to_string(), // System local bin
        "/usr/bin".to_string(), // System bin
        "/bin".to_string(), // Root bin
    ];
    
    if let Ok(home) = std::env::var("HOME") {
        potential_node_paths.extend(vec![
            format!("{}/.nvm/versions/node/v20.11.0/bin", home), // Common NVM version
            format!("{}/.nvm/versions/node/v18.19.0/bin", home), // Another common version
            format!("{}/.nvm/current/bin", home), // NVM current symlink
            format!("{}/.npm-global/bin", home), // NPM global bin
            format!("{}/.yarn/bin", home), // Yarn global bin
            format!("{}/.bun/bin", home), // Bun bin
            format!("{}/.local/bin", home), // Local bin
            format!("{}/bin", home), // Home bin
        ]);
        
        // Also check for any NVM installation dynamically
        let nvm_dir = PathBuf::from(&home).join(".nvm").join("versions").join("node");
        if nvm_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&nvm_dir) {
                for entry in entries.flatten() {
                    if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                        let node_bin = entry.path().join("bin");
                        if node_bin.exists() {
                            paths_to_add.push(node_bin.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
        
        // Add paths that exist and aren't already in PATH
        for path in potential_node_paths {
            if PathBuf::from(&path).exists() && !enhanced_path.contains(&path) {
                paths_to_add.push(path);
            }
        }
    }
    
    // Add all found paths to PATH - IMPORTANT: Add them at the beginning
    if !paths_to_add.is_empty() {
        let additional_paths = paths_to_add.join(":");
        enhanced_path = format!("{}:{}", additional_paths, enhanced_path);
        info!("Enhanced PATH with Node.js directories: {:?}", paths_to_add);
    } else {
        // Even if no new paths were added, ensure /opt/homebrew/bin is in PATH
        if !enhanced_path.contains("/opt/homebrew/bin") {
            enhanced_path = format!("/opt/homebrew/bin:{}", enhanced_path);
            info!("Added /opt/homebrew/bin to PATH");
        }
    }
    
    // Always set the enhanced PATH
    cmd.env("PATH", enhanced_path);

    // Add NVM support if the program is in an NVM directory
    if program.contains("/.nvm/versions/node/") {
        if let Some(node_bin_dir) = std::path::Path::new(program).parent() {
            // Ensure the Node.js bin directory is in PATH
            let current_path = cmd.get_envs()
                .find(|(k, _)| k == &std::ffi::OsStr::new("PATH"))
                .and_then(|(_, v)| v)
                .and_then(|v| v.to_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| std::env::var("PATH").unwrap_or_default());
            
            let node_bin_str = node_bin_dir.to_string_lossy();
            if !current_path.contains(&node_bin_str.as_ref()) {
                let new_path = format!("{}:{}", node_bin_str, current_path);
                debug!("Adding specific NVM bin directory to PATH: {}", node_bin_str);
                cmd.env("PATH", new_path);
            }
        }
    }

    cmd
}

/// Ensure Node.js runtime is available - either system or bundled
pub fn ensure_node_runtime(app_handle: &tauri::AppHandle) -> Result<NodeRuntime, String> {
    info!("Ensuring Node.js runtime is available...");

    // First try to find system Node.js
    if let Ok(node_runtime) = find_system_node() {
        info!("Found system Node.js: {:?}", node_runtime);
        return Ok(node_runtime);
    }

    // If no system Node.js, try bundled version
    if let Ok(node_runtime) = find_bundled_node(app_handle) {
        info!("Found bundled Node.js: {:?}", node_runtime);
        return Ok(node_runtime);
    }

    // Finally, try to download Node.js (sync version)
    info!("No Node.js found, attempting to download...");
    match download_and_install_node_sync(app_handle) {
        Ok(node_runtime) => {
            info!("Successfully downloaded and installed Node.js: {:?}", node_runtime);
            Ok(node_runtime)
        }
        Err(e) => {
            error!("Failed to download Node.js: {}", e);
            Err(error_messages::format_error_with_suggestion(&format!("Failed to download Node.js: {}", e)))
        }
    }
}

/// Find system Node.js installation
pub fn find_system_node() -> Result<NodeRuntime, String> {
    debug!("Searching for system Node.js installation...");

    // Try 'which node' first
    if let Ok(output) = Command::new("which").arg("node").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() && PathBuf::from(&path).exists() {
                let version = get_node_version(&path);
                return Ok(NodeRuntime {
                    path,
                    version,
                    source: "system".to_string(),
                    is_bundled: false,
                });
            }
        }
    }

    // Check common system paths
    let common_paths = vec![
        "/usr/bin/node",
        "/usr/local/bin/node",
        "/opt/homebrew/bin/node",
        "/bin/node",
    ];

    for path in common_paths {
        if PathBuf::from(path).exists() {
            let version = get_node_version(path);
            return Ok(NodeRuntime {
                path: path.to_string(),
                version,
                source: "system".to_string(),
                is_bundled: false,
            });
        }
    }

    // Check NVM installations
    if let Ok(home) = std::env::var("HOME") {
        let nvm_dir = PathBuf::from(&home).join(".nvm").join("versions").join("node");
        
        if let Ok(entries) = std::fs::read_dir(&nvm_dir) {
            let mut versions: Vec<_> = entries.filter_map(|e| e.ok()).collect();
            
            // Sort by version (newest first)
            versions.sort_by(|a, b| {
                let version_a = a.file_name().to_string_lossy().to_string();
                let version_b = b.file_name().to_string_lossy().to_string();
                version_b.cmp(&version_a)
            });

            for entry in versions {
                if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                    let node_path = entry.path().join("bin").join("node");
                    if node_path.exists() {
                        let path_str = node_path.to_string_lossy().to_string();
                        let version = get_node_version(&path_str);
                        return Ok(NodeRuntime {
                            path: path_str,
                            version,
                            source: format!("nvm ({})", entry.file_name().to_string_lossy()),
                            is_bundled: false,
                        });
                    }
                }
            }
        }
    }

    Err(error_messages::get_chinese_error_message("No system Node.js installation found"))
}

/// Find bundled Node.js runtime
pub fn find_bundled_node(app_handle: &tauri::AppHandle) -> Result<NodeRuntime, String> {
    debug!("Searching for bundled Node.js runtime...");

    let app_data_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let bundled_node_dir = app_data_dir.join("bundled_runtime");
    let node_binary = if cfg!(target_os = "windows") {
        bundled_node_dir.join("node.exe")
    } else {
        bundled_node_dir.join("node")
    };

    if node_binary.exists() && node_binary.is_file() {
        let path_str = node_binary.to_string_lossy().to_string();
        let version = get_node_version(&path_str);
        
        Ok(NodeRuntime {
            path: path_str,
            version,
            source: "bundled".to_string(),
            is_bundled: true,
        })
    } else {
        Err("No bundled Node.js runtime found".to_string())
    }
}

/// Get Node.js version
fn get_node_version(path: &str) -> Option<String> {
    match Command::new(path).arg("--version").output() {
        Ok(output) if output.status.success() => {
            let version_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            // Remove 'v' prefix if present (e.g., "v20.11.0" -> "20.11.0")
            Some(version_str.strip_prefix('v').unwrap_or(&version_str).to_string())
        }
        _ => None,
    }
}

/// Download and install Node.js runtime (sync version)
pub fn download_and_install_node_sync(app_handle: &tauri::AppHandle) -> Result<NodeRuntime, String> {
    // Block on async version
    tokio::task::block_in_place(|| {
        tokio::runtime::Handle::current().block_on(async {
            download_and_install_node(app_handle).await
        })
    })
}

/// Download and install Node.js runtime
pub async fn download_and_install_node(app_handle: &tauri::AppHandle) -> Result<NodeRuntime, String> {
    info!("Downloading Node.js runtime...");

    let app_data_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let bundled_dir = app_data_dir.join("bundled_runtime");
    
    // Create directory if it doesn't exist
    fs::create_dir_all(&bundled_dir)
        .map_err(|e| format!("Failed to create bundled runtime directory: {}", e))?;

    // Determine download URL based on platform and architecture
    let (download_url, node_binary_name) = get_node_download_info()?;
    
    info!("Downloading Node.js from: {}", download_url);
    
    // Download the file
    let response = reqwest::get(&download_url).await
        .map_err(|e| format!("Failed to download Node.js: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to download Node.js: HTTP {}", response.status()));
    }

    let content = response.bytes().await
        .map_err(|e| format!("Failed to read Node.js download: {}", e))?;

    // Extract and install based on file type
    if download_url.ends_with(".tar.xz") || download_url.ends_with(".tar.gz") {
        extract_and_install_node_archive(&content, &bundled_dir, &node_binary_name)?;
    } else if download_url.ends_with(".zip") {
        extract_and_install_node_zip(&content, &bundled_dir, &node_binary_name)?;
    } else {
        return Err("Unsupported Node.js download format".to_string());
    }

    let node_path = bundled_dir.join(&node_binary_name);
    let path_str = node_path.to_string_lossy().to_string();
    let version = get_node_version(&path_str);

    info!("Successfully installed bundled Node.js at: {}", path_str);

    Ok(NodeRuntime {
        path: path_str,
        version,
        source: "downloaded".to_string(),
        is_bundled: true,
    })
}

/// Get Node.js download URL and binary name for current platform
fn get_node_download_info() -> Result<(String, String), String> {
    let version = "v20.11.0"; // LTS version
    let base_url = "https://nodejs.org/dist";
    
    #[cfg(target_os = "macos")]
    {
        #[cfg(target_arch = "x86_64")]
        {
            Ok((
                format!("{}/{}/node-{}-darwin-x64.tar.xz", base_url, version, version),
                "node".to_string()
            ))
        }
        #[cfg(target_arch = "aarch64")]
        {
            Ok((
                format!("{}/{}/node-{}-darwin-arm64.tar.xz", base_url, version, version),
                "node".to_string()
            ))
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        #[cfg(target_arch = "x86_64")]
        {
            Ok((
                format!("{}/{}/node-{}-linux-x64.tar.xz", base_url, version, version),
                "node".to_string()
            ))
        }
        #[cfg(target_arch = "aarch64")]
        {
            Ok((
                format!("{}/{}/node-{}-linux-arm64.tar.xz", base_url, version, version),
                "node".to_string()
            ))
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        #[cfg(target_arch = "x86_64")]
        {
            Ok((
                format!("{}/{}/node-{}-win-x64.zip", base_url, version, version),
                "node.exe".to_string()
            ))
        }
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        Err("Unsupported platform for Node.js download".to_string())
    }
}

/// Extract Node.js archive (tar.xz/tar.gz) and install binary
fn extract_and_install_node_archive(
    content: &[u8], 
    bundled_dir: &PathBuf, 
    node_binary_name: &str
) -> Result<(), String> {
    use std::io::Cursor;
    use xz2::read::XzDecoder;
    use flate2::read::GzDecoder;
    use tar::Archive;
    
    info!("Extracting Node.js archive...");
    
    // Create a temporary directory for extraction
    let temp_dir = std::env::temp_dir().join("node_extract");
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;

    // Determine compression type and create appropriate decoder
    let cursor = Cursor::new(content);
    
    // Try XZ decompression first (most common for Node.js)
    // XzDecoder::new doesn't return a Result, so we try to decompress directly
    let extract_result = {
        let decoder = XzDecoder::new(cursor.clone());
        let mut archive = Archive::new(decoder);
        match archive.unpack(&temp_dir) {
            Ok(_) => Ok(()),
            Err(_) => {
                // Fall back to GZ decompression
                let decoder = GzDecoder::new(cursor);
                let mut archive = Archive::new(decoder);
                archive.unpack(&temp_dir)
            }
        }
    };

    match extract_result {
        Ok(()) => {
            // Find the extracted node binary
            let extracted_dirs: Vec<_> = fs::read_dir(&temp_dir)
                .map_err(|e| format!("Failed to read temp directory: {}", e))?
                .filter_map(|entry| entry.ok())
                .filter(|entry| entry.file_type().map(|t| t.is_dir()).unwrap_or(false))
                .collect();

            for dir_entry in extracted_dirs {
                let node_bin_path = dir_entry.path().join("bin").join(node_binary_name);
                if node_bin_path.exists() {
                    let dest_path = bundled_dir.join(node_binary_name);
                    fs::copy(&node_bin_path, &dest_path)
                        .map_err(|e| format!("Failed to copy node binary: {}", e))?;
                    
                    // Make executable on Unix systems
                    #[cfg(unix)]
                    {
                        let metadata = fs::metadata(&dest_path)
                            .map_err(|e| format!("Failed to get file metadata: {}", e))?;
                        let mut perms = metadata.permissions();
                        perms.set_mode(0o755);
                        fs::set_permissions(&dest_path, perms)
                            .map_err(|e| format!("Failed to set executable permissions: {}", e))?;
                    }
                    
                    info!("Node.js binary installed successfully");
                    
                    // Clean up temp files
                    let _ = fs::remove_dir_all(&temp_dir);
                    return Ok(());
                }
            }
            
            Err("Node.js binary not found in extracted archive".to_string())
        }
        Err(e) => {
            // Clean up temp files
            let _ = fs::remove_dir_all(&temp_dir);
            Err(format!("Failed to extract Node.js archive: {}", e))
        }
    }
}

/// Extract Node.js zip archive (Windows) and install binary
fn extract_and_install_node_zip(
    content: &[u8], 
    bundled_dir: &PathBuf, 
    node_binary_name: &str
) -> Result<(), String> {
    use std::io::Cursor;
    use zip::read::ZipArchive;
    
    info!("Extracting Node.js zip archive...");
    
    let cursor = Cursor::new(content);
    let mut archive = ZipArchive::new(cursor)
        .map_err(|e| format!("Failed to read zip archive: {}", e))?;

    // Create a temporary directory for extraction
    let temp_dir = std::env::temp_dir().join("node_extract");
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;

    // Extract all files
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to access zip entry {}: {}", i, e))?;
        
        let file_path = temp_dir.join(file.name());
        
        if file.is_dir() {
            fs::create_dir_all(&file_path)
                .map_err(|e| format!("Failed to create directory {}: {}", file_path.display(), e))?;
        } else {
            if let Some(parent) = file_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory for {}: {}", file_path.display(), e))?;
            }
            
            let mut extracted_file = fs::File::create(&file_path)
                .map_err(|e| format!("Failed to create file {}: {}", file_path.display(), e))?;
            
            std::io::copy(&mut file, &mut extracted_file)
                .map_err(|e| format!("Failed to extract file {}: {}", file_path.display(), e))?;
        }
    }

    // Find the extracted node binary
    let extracted_dirs: Vec<_> = fs::read_dir(&temp_dir)
        .map_err(|e| format!("Failed to read temp directory: {}", e))?
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .collect();

    for dir_entry in extracted_dirs {
        let node_bin_path = dir_entry.path().join(node_binary_name);
        if node_bin_path.exists() {
            let dest_path = bundled_dir.join(node_binary_name);
            fs::copy(&node_bin_path, &dest_path)
                .map_err(|e| format!("Failed to copy node binary: {}", e))?;
            
            info!("Node.js binary installed successfully");
            
            // Clean up temp files
            let _ = fs::remove_dir_all(&temp_dir);
            return Ok(());
        }
    }
    
    // Clean up temp files
    let _ = fs::remove_dir_all(&temp_dir);
    Err("Node.js binary not found in extracted zip archive".to_string())
}

/// Try to find a global Claude installation and configure it to use bundled Node.js
pub fn find_global_claude_with_bundled_node(app_handle: &tauri::AppHandle) -> Result<String, String> {
    info!("Attempting to find global Claude installation to use with bundled Node.js...");
    
    // Try global npm installation paths
    if let Ok(home) = std::env::var("HOME") {
        let potential_paths = vec![
            format!("{}/.npm-global/bin/claude", home),
            format!("{}/.yarn/bin/claude", home),
            format!("{}/.local/bin/claude", home),
            "/usr/local/bin/claude".to_string(),
            "/opt/homebrew/bin/claude".to_string(),
        ];
        
        for path in potential_paths {
            if PathBuf::from(&path).exists() {
                info!("Found potential Claude installation at: {}", path);
                return Ok(path);
            }
        }
    }
    
    Err("No global Claude installation found to pair with bundled Node.js".to_string())
}

/// Enhanced command creation that prefers bundled Node.js runtime
pub fn create_command_with_bundled_env(program: &str, app_handle: &tauri::AppHandle) -> Command {
    let mut cmd = create_command_with_env(program);
    
    // Try to use bundled Node.js if available
    if let Ok(node_runtime) = ensure_node_runtime(app_handle) {
        if node_runtime.is_bundled {
            // Add bundled Node.js directory to PATH
            if let Some(node_dir) = std::path::Path::new(&node_runtime.path).parent() {
                let current_path = cmd.get_envs()
                    .find(|(k, _)| k == &std::ffi::OsStr::new("PATH"))
                    .and_then(|(_, v)| v)
                    .and_then(|v| v.to_str())
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| std::env::var("PATH").unwrap_or_default());
                
                let node_dir_str = node_dir.to_string_lossy();
                let new_path = format!("{}:{}", node_dir_str, current_path);
                cmd.env("PATH", new_path);
                
                info!("Using bundled Node.js runtime: {}", node_runtime.path);
            }
        }
    }
    
    cmd
}

/// Synchronous version of ensure_node_runtime for use in non-async contexts
pub fn ensure_node_runtime_sync(app_handle: &tauri::AppHandle) -> Result<NodeRuntime, String> {
    ensure_node_runtime(app_handle)
}
