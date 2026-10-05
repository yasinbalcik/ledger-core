import { GeneralLedger } from './ledger';
import { TrialBalance, TrialBalanceRow } from './types';

/**
 * Generates an accounting Trial Balance (Mizan) from the ledger state.
 */
export function generateTrialBalance(ledger: GeneralLedger, asOfDate: string): TrialBalance {
  const accounts = ledger.getAllAccounts();
  const entries = ledger.getEntries().filter(e => e.date <= asOfDate);

  const debitTotals = new Map<string, number>();
  const creditTotals = new Map<string, number>();

  for (const acc of accounts) {
    debitTotals.set(acc.code, 0);
    creditTotals.set(acc.code, 0);
  }

  for (const entry of entries) {
    for (const line of entry.lines) {
      debitTotals.set(line.accountCode, (debitTotals.get(line.accountCode) || 0) + line.debit);
      creditTotals.set(line.accountCode, (creditTotals.get(line.accountCode) || 0) + line.credit);
    }
  }

  const rows: TrialBalanceRow[] = [];
  let totalDebitTurnover = 0;
  let totalCreditTurnover = 0;
  let totalDebitBalance = 0;
  let totalCreditBalance = 0;

  for (const acc of accounts) {
    const d = debitTotals.get(acc.code) || 0;
    const c = creditTotals.get(acc.code) || 0;

    // Skip accounts with zero activity
    if (d === 0 && c === 0) continue;

    totalDebitTurnover += d;
    totalCreditTurnover += c;

    let dBal = 0;
    let cBal = 0;

    if (d >= c) {
      dBal = d - c;
    } else {
      cBal = c - d;
    }

    totalDebitBalance += dBal;
    totalCreditBalance += cBal;

    rows.push({
      accountCode: acc.code,
      accountName: acc.name,
      debitTotal: d,
      creditTotal: c,
      debitBalance: dBal,
      creditBalance: cBal
    });
  }

  rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const isBalanced =
    totalDebitTurnover === totalCreditTurnover &&
    totalDebitBalance === totalCreditBalance;

  return {
    asOfDate,
    rows,
    totalDebitTurnover,
    totalCreditTurnover,
    totalDebitBalance,
    totalCreditBalance,
    isBalanced
  };
}
