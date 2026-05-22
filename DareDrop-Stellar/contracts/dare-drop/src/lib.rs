// #![no_std]
// use soroban_sdk::{contract, contractimpl, vec, Env, String, Vec};

// #[contract]
// pub struct Contract;

// // This is a sample contract. Replace this placeholder with your own contract logic.
// // A corresponding test example is available in `test.rs`.
// //
// // For comprehensive examples, visit <https://github.com/stellar/soroban-examples>.
// // The repository includes use cases for the Stellar ecosystem, such as data storage on
// // the blockchain, token swaps, liquidity pools, and more.
// //
// // Refer to the official documentation:
// // <https://developers.stellar.org/docs/build/smart-contracts/overview>.
// #[contractimpl]
// impl Contract {
//     pub fn hello(env: Env, to: String) -> Vec<String> {
//         vec![&env, String::from_str(&env, "HelloNgocKhoaDao"), to]
//     }
// }   

// mod test;

#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, symbol_short, Symbol};

// Define the state of the dare
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DareStatus {
    Active,
    Completed,
    ChickenOut, // Target refused
}

// Data structure to hold the dare details
#[contracttype]
#[derive(Clone, Debug)]
pub struct DareRecord {
    pub creator: Address,
    pub target: Address,
    pub task: String,
    pub bounty: u32,
    pub status: DareStatus,
}

// Storage key
const DARE_KEY: Symbol = symbol_short!("DARES");

#[contract]
pub struct DareDropContract;

#[contractimpl]
impl DareDropContract {
    /// Step 1: Issue a dare and lock the bounty
    pub fn create_dare(env: Env, creator: Address, target: Address, task: String, bounty: u32) {
        creator.require_auth(); // Creator must sign to lock funds

        let record = DareRecord {
            creator: creator.clone(),
            target: target.clone(),
            task,
            bounty,
            status: DareStatus::Active,
        };

        // Save to blockchain storage
        env.storage().instance().set(&DARE_KEY, &record);
    }

    /// Step 2: Target completes the dare and claims the bounty
    pub fn claim_bounty(env: Env, target: Address) {
        target.require_auth(); // Target must sign to claim

        let mut record: DareRecord = env.storage().instance().get(&DARE_KEY).unwrap();
        
        if target != record.target {
            panic!("Nice try, but you are not the target of this dare!");
        }
        if record.status != DareStatus::Active {
            panic!("This dare is no longer active!");
        }

        // Mark as completed (In a full app, tokens would transfer here)
        record.status = DareStatus::Completed;
        env.storage().instance().set(&DARE_KEY, &record);
    }

    /// Read-only function to check the current dare status
    pub fn get_dare(env: Env) -> DareRecord {
        env.storage().instance().get(&DARE_KEY).unwrap()
    }
}
