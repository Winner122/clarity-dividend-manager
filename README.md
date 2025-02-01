# Dividend Manager Smart Contract

A blockchain-based solution for managing automated dividend payments to shareholders. This contract provides functionality for:

- Issuing shares to shareholders
- Declaring dividend periods with specified amounts
- Automated dividend distribution based on shareholding
- Tracking of dividend claims and preventing double claims
- Transparent view of share ownership and dividend history
- Share vesting schedules with linear vesting

## Features

- Share token management
- Dividend token management
- Automated dividend calculations
- Claim tracking system
- Owner-controlled share issuance
- Period-based dividend declarations
- Linear vesting schedules for share distribution

## Security Features

- Owner-only administrative functions
- Double-claim prevention
- Balance verification
- Zero-amount protection
- Vesting schedule enforcement

## Vesting Schedule System

The contract now supports linear vesting schedules for share distribution:

- Create vesting schedules with customizable parameters:
  - Total amount of shares
  - Vesting start block
  - Vesting duration
- Linear vesting calculation based on block height
- Claim mechanism for vested shares
- Vesting schedule querying
- Protection against early claims
