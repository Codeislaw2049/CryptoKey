#!/bin/bash
set -e

echo ">>> Setting up Rust environment in WSL..."

# 1. Install Rust if missing
if [ ! -f "$HOME/.cargo/bin/cargo" ]; then
    echo "Rust not found. Installing..."
    
    # Download rustup-init directly using wget
    wget https://static.rust-lang.org/rustup/dist/x86_64-unknown-linux-gnu/rustup-init -O /tmp/rustup-init
    chmod +x /tmp/rustup-init
    /tmp/rustup-init -y
    
    if [ ! -f "$HOME/.cargo/bin/cargo" ]; then
        echo "Failed to install Rust."
        exit 1
    fi
else
    echo "Rust is already installed."
fi

# Source the environment
export PATH="$HOME/.cargo/bin:$PATH"

# 2. Add Wasm Target
echo ">>> Adding wasm32-unknown-unknown target..."
# Sometimes rustup needs to download the target, so we hope this works via internal downloaders
# If it fails, we might need to configure rustup to use wget or similar, but rustup binary is usually robust
rustup target add wasm32-unknown-unknown

# 3. Install wasm-pack
if ! command -v wasm-pack &> /dev/null; then
    echo ">>> Installing wasm-pack..."
    # Download binary directly to avoid script issues
    wget https://github.com/rustwasm/wasm-pack/releases/download/v0.12.1/wasm-pack-v0.12.1-x86_64-unknown-linux-musl.tar.gz -O /tmp/wasm-pack.tar.gz
    tar -xzf /tmp/wasm-pack.tar.gz -C /tmp
    # Create bin dir if not exists (though cargo install should have made it)
    mkdir -p $HOME/.cargo/bin
    mv /tmp/wasm-pack-v0.12.1-x86_64-unknown-linux-musl/wasm-pack $HOME/.cargo/bin/
    chmod +x $HOME/.cargo/bin/wasm-pack
else
    echo "wasm-pack is already installed."
fi

# 4. Build the Project
echo ">>> Building Wasm Project..."
cd /mnt/d/TEST/app/app18/wasm-pro

# Ensure Clean Build
rm -rf ../src/wasm/pkg

# Build
wasm-pack build --target web --out-dir ../src/wasm/pkg

echo ">>> SUCCESS: Wasm module compiled!"
ls -l ../src/wasm/pkg
