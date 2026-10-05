import { describe, expect, it } from 'vitest';
import {
  GeneralLedger,
  UnbalancedTransactionError,
  AccountNotFoundError,
  generateTrialBalance,
} from '../src';

describe('GeneralLedger - Double-Entry Engine', () => {
  it('posts a balanced sales invoice entry with VAT and customers', () => {
    const ledger = new GeneralLedger();

    // Satış Faturası Yevmiye Kaydı:
    // Borç: 120 Alıcılar (12.000 TL = 1.200.000 kuruş)
    // Alacak: 600 Yurtiçi Satışlar (10.000 TL = 1.000.000 kuruş)
    // Alacak: 391 Hesaplanan KDV (2.000 TL = 200.000 kuruş)
    const entry = ledger.post({
      idempotencyKey: 'tx-invoice-001',
      date: '2026-10-05',
      description: 'E-Fatura EDM2026000000042 Satış ve KDV Tahakkuku',
      lines: [
        { accountCode: '120', debit: 1_200_000, credit: 0, description: 'Müşteri Borcu' },
        { accountCode: '600', debit: 0, credit: 1_000_000, description: 'Yurtiçi Satış Geliri' },
        { accountCode: '391', debit: 0, credit: 200_000, description: 'KDV %20' },
      ],
    });

    expect(entry.id).toBe('JE-000001');
    expect(entry.totalAmount).toBe(1_200_000);
    expect(entry.lines.length).toBe(3);
    expect(ledger.getEntries().length).toBe(1);
  });

  it('rejects unbalanced transactions with UnbalancedTransactionError', () => {
    const ledger = new GeneralLedger();

    expect(() =>
      ledger.post({
        idempotencyKey: 'tx-err-unbalanced',
        date: '2026-10-05',
        description: 'Dengesiz Kayıt',
        lines: [
          { accountCode: '120', debit: 1_000_000, credit: 0 },
          { accountCode: '600', debit: 0, credit: 900_000 },
        ],
      })
    ).toThrow(UnbalancedTransactionError);
  });

  it('rejects unknown accounts with AccountNotFoundError', () => {
    const ledger = new GeneralLedger();

    expect(() =>
      ledger.post({
        idempotencyKey: 'tx-err-account',
        date: '2026-10-05',
        description: 'Bilinmeyen Hesap',
        lines: [
          { accountCode: '999.NONEXISTENT', debit: 100_000, credit: 0 },
          { accountCode: '100', debit: 0, credit: 100_000 },
        ],
      })
    ).toThrow(AccountNotFoundError);
  });

  it('enforces idempotency and returns existing entry without duplicate posting', () => {
    const ledger = new GeneralLedger();

    const e1 = ledger.post({
      idempotencyKey: 'idempotent-key-42',
      date: '2026-10-05',
      description: 'İlk Deneme',
      lines: [
        { accountCode: '100', debit: 50_000, credit: 0 },
        { accountCode: '600', debit: 0, credit: 50_000 },
      ],
    });

    const e2 = ledger.post({
      idempotencyKey: 'idempotent-key-42',
      date: '2026-10-05',
      description: 'Tekrar Deneme (Ağ Yeniden Gönderimi)',
      lines: [
        { accountCode: '100', debit: 50_000, credit: 0 },
        { accountCode: '600', debit: 0, credit: 50_000 },
      ],
    });

    expect(e1.id).toBe(e2.id);
    expect(ledger.getEntries().length).toBe(1);
  });

  it('creates reversal entry (ters kayıt) and marks original entry reversed', () => {
    const ledger = new GeneralLedger();

    const original = ledger.post({
      idempotencyKey: 'tx-to-reverse',
      date: '2026-10-05',
      description: 'Hatalı Satış',
      lines: [
        { accountCode: '120', debit: 100_000, credit: 0 },
        { accountCode: '600', debit: 0, credit: 100_000 },
      ],
    });

    const reversal = ledger.reverse(original.id, 'Fatura iptali');

    expect(original.isReversed).toBe(true);
    expect(original.reversedById).toBe(reversal.id);
    expect(reversal.reversalOfId).toBe(original.id);

    // In reversal, 120 is credit 100,000 and 600 is debit 100,000
    const line120 = reversal.lines.find(l => l.accountCode === '120');
    expect(line120?.credit).toBe(100_000);
    expect(line120?.debit).toBe(0);
  });

  it('generates a balanced Trial Balance (Mizan)', () => {
    const ledger = new GeneralLedger();

    // 1. Satış: 120 Borç 1.200.000 / 600 Alacak 1.000.000 / 391 Alacak 200.000
    ledger.post({
      idempotencyKey: 'sale-1',
      date: '2026-10-01',
      description: 'Satış 1',
      lines: [
        { accountCode: '120', debit: 1_200_000, credit: 0 },
        { accountCode: '600', debit: 0, credit: 1_000_000 },
        { accountCode: '391', debit: 0, credit: 200_000 },
      ],
    });

    // 2. Tahsilat: 102 Banka Borç 1.200.000 / 120 Alıcılar Alacak 1.200.000
    ledger.post({
      idempotencyKey: 'collection-1',
      date: '2026-10-02',
      description: 'Banka Tahsilatı',
      lines: [
        { accountCode: '102', debit: 1_200_000, credit: 0 },
        { accountCode: '120', debit: 0, credit: 1_200_000 },
      ],
    });

    const mizan = generateTrialBalance(ledger, '2026-10-05');

    expect(mizan.isBalanced).toBe(true);
    expect(mizan.totalDebitTurnover).toBe(2_400_000);
    expect(mizan.totalCreditTurnover).toBe(2_400_000);
    // 120 should have 0 balance (fully collected)
    const row120 = mizan.rows.find(r => r.accountCode === '120');
    expect(row120?.debitBalance).toBe(0);
    expect(row120?.creditBalance).toBe(0);
  });
});
