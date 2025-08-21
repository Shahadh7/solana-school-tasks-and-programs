use anchor_lang::prelude::*;
use crate::{state::Capsule, errors::ErrorCode, events::CapsuleUnlocked};

#[derive(Accounts)]
pub struct UnlockCapsule<'info> {
    #[account(
        mut,
        seeds = [Capsule::SEED, capsule.creator.key().as_ref(), &capsule.id.to_le_bytes()],
        bump = capsule.bump,
    )]
    pub capsule: Account<'info, Capsule>,
    
    /// The user unlocking the capsule (can be anyone, not just creator)
    pub unlocker: Signer<'info>,
}

pub fn handler(ctx: Context<UnlockCapsule>) -> Result<()> {
    let capsule = &mut ctx.accounts.capsule;
    let clock = Clock::get()?;
    
    // Validate capsule is ready to unlock
    require!(
        capsule.is_ready_to_unlock(clock.unix_timestamp),
        ErrorCode::CapsuleNotReadyToUnlock
    );
    
    // Mark as unlocked
    capsule.is_unlocked = true;
    capsule.updated_at = clock.unix_timestamp;
    
    // Emit event
    emit!(CapsuleUnlocked {
        capsule: capsule.key(),
        unlocker: ctx.accounts.unlocker.key(),
        timestamp: clock.unix_timestamp,
    });
    
    msg!("Capsule unlocked: {}", capsule.key());
    
    Ok(())
}