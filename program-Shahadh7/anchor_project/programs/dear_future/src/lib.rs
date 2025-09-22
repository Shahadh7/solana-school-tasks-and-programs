#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use crate::instructions::*;

pub mod instructions;
pub mod state;
pub mod errors;
pub mod events;

declare_id!("88fRjJ3XvAHH1N6468YQd6xuSiPXUX2kyTeD4d3Yz8ng");

#[program]
pub mod dear_future {
    use super::*;

    // Initialize the program configurations
    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        instructions::initialize_config::handler(ctx)    
    }

    // Create a new memory capsule
    pub fn create_capsule(
        ctx: Context<CreateCapsule>,
        title: String,
        content: String,
        unlock_date: i64,
        encrypted_url: Option<String>,
    ) -> Result<()> {
        instructions::create_capsule::handler(ctx, title, content, unlock_date, encrypted_url)
    }

    // Update a memory capsule
    pub fn update_capsule(
        ctx: Context<UpdateCapsule>,
        new_content: Option<String>,
        new_unlock_date: Option<i64>,
        new_encrypted_url: Option<String>,
        remove_encrypted_url: bool,
    ) -> Result<()> {
        instructions::update_capsule::handler(ctx, new_content, new_unlock_date, new_encrypted_url, remove_encrypted_url)
    }

    // Unlock a memory capsule
    pub fn unlock_capsule(
        ctx: Context<UnlockCapsule>,
    ) -> Result<()> {
        instructions::unlock_capsule::handler(ctx)
    }

    // Close a memory capsule
    pub fn close_capsule(
        ctx: Context<CloseCapsule>,
    ) -> Result<()> {
        instructions::close_capsule::handler(ctx)
    }

    // Transfer a memory capsule to a new owner
    pub fn transfer_capsule(
        ctx: Context<TransferCapsule>,
        mint_address: Option<Pubkey>,
    ) -> Result<()> {
        instructions::transfer_capsule::handler(ctx, mint_address)
    }
}
