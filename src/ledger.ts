import { Account, JournalEntry, JournalLine, PostTransactionInput } from './types';
import { STANDARD_TDHP_ACCOUNTS } from './chart-of-accounts';

export class UnbalancedTransactionError extends Error {
  constructor(public readonly debitSum: number, public readonly creditSum: number) {
    super(
      `Transaction is unbalanced: total debits (${debitSum}) must equal total credits (${creditSum}). Difference: ${Math.abs(debitSum - creditSum)}`
    );
    this.name = 'UnbalancedTransactionError';
  }
}

export class AccountNotFoundError extends Error {
  constructor(public readonly accountCode: string) {
    super(`Account code not found in ledger chart of accounts: ${accountCode}`);
    this.name = 'AccountNotFoundError';
  }
}

export class GeneralLedger {
  private accounts: Map<string, Account> = new Map();
  private entries: JournalEntry[] = [];
  private idempotencyStore: Map<string, JournalEntry> = new Map();

  constructor(initialAccounts: Account[] = STANDARD_TDHP_ACCOUNTS) {
    for (const acc of initialAccounts) {
      this.accounts.set(acc.code, acc);
    }
  }

  public registerAccount(account: Account): void {
    this.accounts.set(account.code, account);
  }

  public getAccount(code: string): Account | undefined {
    return this.accounts.get(code);
  }

  public getAllAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Posts a balanced journal entry with idempotency guarantee.
   */
  public post(input: PostTransactionInput): JournalEntry {
    const existing = this.idempotencyStore.get(input.idempotencyKey);
    if (existing) {
      return existing;
    }

    if (!input.lines || input.lines.length < 2) {
      throw new Error('A journal entry requires at least two lines.');
    }

    let debitSum = 0;
    let creditSum = 0;
    const validatedLines: JournalLine[] = [];

    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i]!;
      if (!this.accounts.has(line.accountCode)) {
        throw new AccountNotFoundError(line.accountCode);
      }

      const debit = line.debit ?? 0;
      const credit = line.credit ?? 0;

      if (!Number.isSafeInteger(debit) || debit < 0) {
        throw new RangeError(`Line ${i + 1}: debit must be non-negative integer minor units (kuruş)`);
      }
      if (!Number.isSafeInteger(credit) || credit < 0) {
        throw new RangeError(`Line ${i + 1}: credit must be non-negative integer minor units (kuruş)`);
      }
      if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
        throw new Error(`Line ${i + 1}: line must contain either a debit or a credit, not both or zero`);
      }

      debitSum += debit;
      creditSum += credit;

      validatedLines.push({
        accountCode: line.accountCode,
        debit,
        credit,
        description: line.description
      });
    }

    if (debitSum !== creditSum) {
      throw new UnbalancedTransactionError(debitSum, creditSum);
    }

    const entryId = `JE-${String(this.entries.length + 1).padStart(6, '0')}`;
    const entry: JournalEntry = {
      id: entryId,
      sequenceNumber: this.entries.length + 1,
      idempotencyKey: input.idempotencyKey,
      date: input.date,
      description: input.description,
      lines: validatedLines,
      totalAmount: debitSum,
      isReversed: false,
      createdAt: new Date().toISOString()
    };

    this.entries.push(entry);
    this.idempotencyStore.set(input.idempotencyKey, entry);
    return entry;
  }

  /**
   * Reverses an existing journal entry by creating an opposite offsetting entry (Ters Kayıt).
   */
  public reverse(entryId: string, reason: string): JournalEntry {
    const original = this.entries.find(e => e.id === entryId);
    if (!original) {
      throw new Error(`Journal entry ${entryId} not found.`);
    }
    if (original.isReversed) {
      throw new Error(`Journal entry ${entryId} is already reversed.`);
    }

    // Swap debits and credits
    const reversalLines: JournalLine[] = original.lines.map(l => ({
      accountCode: l.accountCode,
      debit: l.credit,
      credit: l.debit,
      description: `Reversal: ${l.description || original.description}`
    }));

    const reversalEntry = this.post({
      idempotencyKey: `rev-${original.idempotencyKey}`,
      date: new Date().toISOString().slice(0, 10),
      description: `Reversal of ${original.id}: ${reason}`,
      lines: reversalLines
    });

    // Mark link
    original.isReversed = true;
    original.reversedById = reversalEntry.id;
    reversalEntry.reversalOfId = original.id;

    return reversalEntry;
  }

  public getEntries(): JournalEntry[] {
    return [...this.entries];
  }

  public getAccountMovements(accountCode: string): { entry: JournalEntry; line: JournalLine }[] {
    const movements: { entry: JournalEntry; line: JournalLine }[] = [];
    for (const e of this.entries) {
      for (const l of e.lines) {
        if (l.accountCode === accountCode) {
          movements.push({ entry: e, line: l });
        }
      }
    }
    return movements;
  }
}
