use anchor_lang::prelude::*;
use crate::{state::*, errors::ErrorCode, events::CapsuleTransferred};

#[derive(Accounts)]
pub struct TransferCapsule<'info> {
    #[account(
        mut,
        seeds = [Capsule::SEED, capsule.creator.as_ref(), &capsule.id.to_le_bytes()],
        bump = capsule.bump,
        constraint = capsule.can_be_transferred(&current_owner.key()) @ ErrorCode::NotOwner
    )]
    pub capsule: Account<'info, Capsule>,
    
    #[account(mut)]
    pub current_owner: Signer<'info>,
    
    /// CHECK: New owner can be any valid public key
    pub new_owner: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<TransferCapsule>,
    mint_address: Option<Pubkey>,
) -> Result<()> {
    let clock = Clock::get()?;
    let capsule = &mut ctx.accounts.capsule;
    let new_owner_key = ctx.accounts.new_owner.key();
    let current_owner_key = ctx.accounts.current_owner.key();
    
    // Verify that the current owner is actually the owner
    require!(
        capsule.is_owned_by(&current_owner_key),
        ErrorCode::NotOwner
    );
    
    // Cannot transfer to the same owner
    require!(
        new_owner_key != current_owner_key,
        ErrorCode::CannotTransferToSelf
    );
    
    // If mint address is provided, store it along with the creator's pubkey
    if let Some(mint) = mint_address {
        capsule.set_mint_info(mint, current_owner_key, clock.unix_timestamp);
    }
    
    // Transfer the capsule
    capsule.transfer_to(new_owner_key, clock.unix_timestamp);
    
    emit!(CapsuleTransferred {
        capsule: capsule.key(),
        from: current_owner_key,
        to: new_owner_key,
        mint: mint_address,
        timestamp: clock.unix_timestamp,
    });
    
    msg!("Capsule transferred from {} to {}", current_owner_key, new_owner_key);
    if let Some(mint) = mint_address {
        msg!("Mint address set to: {}", mint);
    }
    
    Ok(())
}
