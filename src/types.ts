export type NormalBalance = 'DEBIT' | 'CREDIT';

export type AccountType =
  | 'ASSET'       // 1xx, 2xx (Aktif)
  | 'LIABILITY'   // 3xx, 4xx (Kısa ve Uzun Vadeli Yabancı Kaynaklar)
  | 'EQUITY'      // 5xx (Özkaynaklar)
  | 'REVENUE'     // 6xx (Gelir Tablosu Hesapları)
  | 'EXPENSE';    // 7xx (Maliyet / Gider Hesapları)

export interface Account {
  code: string;           // e.g. "102.01" or "600"
  name: string;           // e.g. "Bankalar - Garanti TL"
  type: AccountType;
  normalBalance: NormalBalance;
}

export interface JournalLineInput {
  accountCode: string;
  debit?: number;         // Integer minor units (kuruş)
  credit?: number;        // Integer minor units (kuruş)
  description?: string;
}

export interface JournalLine {
  accountCode: string;
  debit: number;          // Integer minor units (kuruş)
  credit: number;         // Integer minor units (kuruş)
  description?: string;
}

export interface PostTransactionInput {
  idempotencyKey: string;
  date: string;           // YYYY-MM-DD
  description: string;
  lines: JournalLineInput[];
}

export interface JournalEntry {
  id: string;
  sequenceNumber: number;
  idempotencyKey: string;
  date: string;
  description: string;
  lines: JournalLine[];
  totalAmount: number;    // Balanced debit/credit sum in kuruş
  isReversed: boolean;
  reversalOfId?: string;
  reversedById?: string;
  createdAt: string;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  debitTotal: number;
  creditTotal: number;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalance {
  asOfDate: string;
  rows: TrialBalanceRow[];
  totalDebitTurnover: number;
  totalCreditTurnover: number;
  totalDebitBalance: number;
  totalCreditBalance: number;
  isBalanced: boolean;
}
