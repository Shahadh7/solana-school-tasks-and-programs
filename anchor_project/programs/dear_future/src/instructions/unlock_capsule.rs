use anchor_lang::prelude::*;
use crate::{state::Capsule, errors::ErrorCode, events::CapsuleUnlocked};

#[derive(Accounts)]
pub struct UnlockCapsule<'info> {
    #[account(
        mut,
        seeds = [Capsule::SEED, capsule.creator.as_ref(), &capsule.id.to_le_bytes()],
        bump = capsule.bump,
        constraint = capsule.owner == owner.key() @ ErrorCode::NotOwner,
    )]
    pub capsule: Account<'info, Capsule>,
    
    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<UnlockCapsule>) -> Result<()> {
    let capsule = &mut ctx.accounts.capsule;
    let clock = Clock::get()?;
    
    require!(
        capsule.is_ready_to_unlock(clock.unix_timestamp),
        ErrorCode::CapsuleNotReadyToUnlock
    );
    
    capsule.is_unlocked = true;
    capsule.updated_at = clock.unix_timestamp;
    
    emit!(CapsuleUnlocked {
        capsule: capsule.key(),
        unlocker: ctx.accounts.owner.key(),
        timestamp: clock.unix_timestamp,
    });
    
    msg!("Capsule unlocked: {}", capsule.key());
    
    Ok(())
}