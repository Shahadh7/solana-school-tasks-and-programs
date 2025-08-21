use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("The unlock date must be in the future")]
    UnlockDateMustBeFuture,

    #[msg("The capsule is not yet ready to be unlocked")]
    CapsuleNotReadyToUnlock,

    #[msg("Cannot update capsule after it has been unlocked")]
    CapsuleAlreadyUnlocked,

    #[msg("Capsule title is too long (max 100 characters)")]
    TitleTooLong,

    #[msg("Capsule content is too long (max 2000 characters)")]
    ContentTooLong,

    #[msg("New unlock date must be later than current unlock date (extend only)")]
    InvalidUnlockDateExtension,

    #[msg("Cannot close capsule that hasn't been unlocked")]
    CannotCloseLockedCapsule,

    #[msg("Capsule already has a mint associated with it")]
    CapsuleAlreadyHasMint,

    #[msg("Invalid token account for this capsule")]
    InvalidTokenAccount,

    #[msg("Only the capsule creator can perform this action")]
    UnauthorizedAccess,
}