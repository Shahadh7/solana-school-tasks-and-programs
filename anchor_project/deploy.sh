#!/bin/bash

# Dear Future - Anchor Program Deployment Script
# This script helps deploy the program to different Solana networks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
NETWORK="devnet"
PROGRAM_ID="5BY4zzPL5qWSwDeArRD82YpSY1utsJGBsgNisTPpuHTm"

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

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -n, --network NETWORK    Solana network (devnet, testnet, mainnet-beta) [default: devnet]"
    echo "  -p, --program-id ID      Program ID to deploy to [default: from Anchor.toml]"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                        # Deploy to devnet"
    echo "  $0 -n testnet            # Deploy to testnet"
    echo "  $0 -n mainnet-beta       # Deploy to mainnet-beta"
    echo "  $0 -p <PROGRAM_ID>       # Deploy to specific program ID"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--network)
            NETWORK="$2"
            shift 2
            ;;
        -p|--program-id)
            PROGRAM_ID="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate network
case $NETWORK in
    devnet|testnet|mainnet-beta)
        ;;
    *)
        print_error "Invalid network: $NETWORK"
        print_error "Valid networks: devnet, testnet, mainnet-beta"
        exit 1
        ;;
esac

print_status "Starting deployment to Solana $NETWORK..."

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

# Check if we're in the right directory
if [ ! -f "Anchor.toml" ]; then
    print_error "Anchor.toml not found. Please run this script from the anchor_project directory."
    exit 1
fi

# Set Solana network
print_status "Setting Solana network to $NETWORK..."
solana config set --url $NETWORK

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

# Build the program
print_status "Building the program..."
anchor build

# Check if build was successful
if [ $? -ne 0 ]; then
    print_error "Build failed. Please fix the errors and try again."
    exit 1
fi

print_success "Build completed successfully!"

# Deploy the program
print_status "Deploying program to $NETWORK..."
anchor deploy --provider.cluster $NETWORK

# Check if deployment was successful
if [ $? -ne 0 ]; then
    print_error "Deployment failed. Please check the errors and try again."
    exit 1
fi

print_success "Program deployed successfully!"

# Get the deployed program ID
DEPLOYED_PROGRAM_ID=$(solana address -k target/deploy/dear_future-keypair.json)
print_success "Deployed program ID: $DEPLOYED_PROGRAM_ID"

# Update Anchor.toml with new program ID if different
if [ "$DEPLOYED_PROGRAM_ID" != "$PROGRAM_ID" ]; then
    print_warning "Deployed program ID differs from expected program ID"
    print_status "Updating Anchor.toml..."
    
    # Update the program ID in Anchor.toml
    sed -i "s/5BY4zzPL5qWSwDeArRD82YpSY1utsJGBsgNisTPpuHTm/$DEPLOYED_PROGRAM_ID/g" Anchor.toml
    
    print_success "Anchor.toml updated with new program ID"
fi

# Initialize the program config
print_status "Initializing program configuration..."
anchor run initialize-config --provider.cluster $NETWORK

if [ $? -eq 0 ]; then
    print_success "Program configuration initialized successfully!"
else
    print_warning "Program configuration initialization failed or already initialized"
fi

print_success "Deployment completed successfully!"
echo ""
print_status "Next steps:"
echo "1. Update your frontend environment variables with the new program ID: $DEPLOYED_PROGRAM_ID"
echo "2. Test the program functionality"
echo "3. Deploy your frontend application"
echo ""
print_status "Program is now live on Solana $NETWORK!"
