use std::env;
use std::path::Path;

fn main() {
    tauri_build::build();
    
    // Optional: Download and bundle Node.js during build if BUNDLE_NODEJS environment variable is set
    if env::var("BUNDLE_NODEJS").is_ok() {
        println!("cargo:rerun-if-env-changed=BUNDLE_NODEJS");
        
        if let Err(e) = bundle_nodejs() {
            println!("cargo:warning=Failed to bundle Node.js: {}", e);
        }
    }
}

fn bundle_nodejs() -> Result<(), Box<dyn std::error::Error>> {
    use std::fs;
    
    println!("cargo:warning=Bundling Node.js runtime...");
    
    // Create bundled runtime directory in target
    let target_dir = env::var("OUT_DIR")?;
    let bundle_dir = Path::new(&target_dir).join("bundled_runtime");
    
    if bundle_dir.exists() {
        println!("cargo:warning=Node.js runtime already bundled");
        return Ok(());
    }
    
    fs::create_dir_all(&bundle_dir)?;
    
    // Download Node.js for the target platform
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    let result = runtime.block_on(async {
        download_nodejs_for_build(&bundle_dir).await
    });
    
    match result {
        Ok(_) => {
            println!("cargo:warning=Successfully bundled Node.js runtime");
        }
        Err(e) => {
            println!("cargo:warning=Failed to download Node.js: {}", e);
            return Err(e.into());
        }
    }
    
    Ok(())
}

async fn download_nodejs_for_build(_bundle_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    // This would be similar to the runtime download logic
    // For build-time, we might want to use a simpler approach
    println!("cargo:warning=Node.js download during build is not yet implemented");
    println!("cargo:warning=Node.js will be downloaded at runtime if needed");
    Ok(())
}
