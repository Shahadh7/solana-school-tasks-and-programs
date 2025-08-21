#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use crate::instructions::*;

pub mod instructions;
pub mod state;
pub mod errors;
pub mod events;

declare_id!("5BY4zzPL5qWSwDeArRD82YpSY1utsJGBsgNisTPpuHTm");

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
    ) -> Result<()> {
        instructions::create_capsule::handler(ctx, title, content, unlock_date)
    }

    // Unlock a memory capsule
    pub fn update_capsule(
        ctx: Context<UpdateCapsule>,
        new_content: Option<String>,
        new_unlock_date: Option<i64>,
    ) -> Result<()> {
        instructions::update_capsule::handler(ctx, new_content, new_unlock_date)
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

}
