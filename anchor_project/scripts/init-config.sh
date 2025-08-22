#!/bin/bash

# Dear Future - Initialize Config Script
# This script initializes the program configuration on devnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "Starting config initialization on Solana devnet..."

# Check if we're in the right directory
if [ ! -f "Anchor.toml" ]; then
    print_error "Anchor.toml not found. Please run this script from the anchor_project directory."
    exit 1
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    print_error "Anchor CLI is not installed. Please install it first:"
    print_error "cargo install --git https://github.com/coral-xyz/anchor avm --locked --force"
    exit 1
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    print_error "Solana CLI is not installed. Please install it first:"
    print_error "sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

# Set Solana network to devnet
print_status "Setting Solana network to devnet..."
solana config set --url devnet

# Check wallet connection
print_status "Checking wallet connection..."
if ! solana address &> /dev/null; then
    print_error "No wallet connected. Please connect a wallet first:"
    print_error "solana config set --keypair <PATH_TO_KEYPAIR>"
    exit 1
fi

WALLET_ADDRESS=$(solana address)
print_success "Connected wallet: $WALLET_ADDRESS"

# Check wallet balance
print_status "Checking wallet balance..."
BALANCE=$(solana balance)
print_status "Wallet balance: $BALANCE"

# Build the program first
print_status "Building the program..."
anchor build

if [ $? -ne 0 ]; then
    print_error "Build failed. Please fix the errors and try again."
    exit 1
fi

print_success "Build completed successfully!"

# Run the initialization using the existing script
print_status "Running config initialization script..."
npx ts-node scripts/initialize-config.ts

if [ $? -eq 0 ]; then
    print_success "Config initialization completed successfully!"
else
    print_error "Config initialization failed!"
    print_status "Trying alternative approach with anchor CLI..."
    
    # Alternative: Use anchor test with a simple test
    print_status "Creating minimal test for initialization..."
    
    # Update the temp config file that already exists
    if [ -f "temp_init_config.ts" ]; then
        print_status "Using existing temp_init_config.ts file..."
        anchor test temp_init_config.ts --skip-local-validator --provider.cluster devnet
        
        if [ $? -eq 0 ]; then
            print_success "Config initialization completed successfully!"
        else
            print_error "Config initialization failed!"
            exit 1
        fi
    else
        print_error "No initialization method available!"
        exit 1
    fi
fi

print_success "Config initialization script completed!"
print_status "Your program configuration is now initialized on devnet!"
