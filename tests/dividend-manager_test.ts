import {
    Clarinet,
    Tx,
    Chain,
    Account,
    types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Test share issuance and dividend distribution",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            // Issue shares to wallet1 and wallet2
            Tx.contractCall('dividend-manager', 'issue-shares', [
                types.uint(1000),
                types.principal(wallet1.address)
            ], deployer.address),
            Tx.contractCall('dividend-manager', 'issue-shares', [
                types.uint(2000),
                types.principal(wallet2.address)
            ], deployer.address)
        ]);
        
        block.receipts.forEach(receipt => {
            receipt.result.expectOk();
        });

        // Declare dividends for period 1
        let dividendBlock = chain.mineBlock([
            Tx.contractCall('dividend-manager', 'declare-dividends', [
                types.uint(3000), // 1 token per share
                types.uint(1)
            ], deployer.address)
        ]);
        
        dividendBlock.receipts[0].result.expectOk();
        
        // Test dividend claims
        let claimBlock = chain.mineBlock([
            Tx.contractCall('dividend-manager', 'claim-dividends', [
                types.uint(1)
            ], wallet1.address),
            Tx.contractCall('dividend-manager', 'claim-dividends', [
                types.uint(1)
            ], wallet2.address)
        ]);
        
        claimBlock.receipts.forEach(receipt => {
            receipt.result.expectOk();
        });
        
        // Verify claimed status
        let statusBlock = chain.mineBlock([
            Tx.contractCall('dividend-manager', 'is-dividend-claimed', [
                types.principal(wallet1.address),
                types.uint(1)
            ], deployer.address)
        ]);
        
        assertEquals(statusBlock.receipts[0].result.expectOk(), true);
    }
});

Clarinet.test({
    name: "Test vesting schedule creation and claim",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Create vesting schedule
        let vestingBlock = chain.mineBlock([
            Tx.contractCall('dividend-manager', 'create-vesting-schedule', [
                types.principal(wallet1.address),
                types.uint(1000), // total amount
                types.uint(10), // start block
                types.uint(100) // duration
            ], deployer.address)
        ]);
        
        vestingBlock.receipts[0].result.expectOk();

        // Advance chain and claim vested shares
        chain.mineEmptyBlockUntil(60); // 50% vesting point
        
        let claimBlock = chain.mineBlock([
            Tx.contractCall('dividend-manager', 'claim-vested-shares', 
                [], 
                wallet1.address
            )
        ]);
        
        claimBlock.receipts[0].result.expectOk();
        
        // Verify vesting schedule
        let scheduleBlock = chain.mineBlock([
            Tx.contractCall('dividend-manager', 'get-vesting-schedule', [
                types.principal(wallet1.address)
            ], deployer.address)
        ]);
        
        scheduleBlock.receipts[0].result.expectOk();
    }
});

Clarinet.test({
    name: "Test error conditions",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        
        // Test non-owner share issuance
        let block = chain.mineBlock([
            Tx.contractCall('dividend-manager', 'issue-shares', [
                types.uint(1000),
                types.principal(wallet1.address)
            ], wallet1.address)
        ]);
        
        block.receipts[0].result.expectErr(types.uint(100)); // err-owner-only
    }
});
