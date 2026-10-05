import { Account } from './types';

/**
 * Standard Turkish Uniform Chart of Accounts (TDHP - Tekdüzen Hesap Planı)
 */
export const STANDARD_TDHP_ACCOUNTS: Account[] = [
  // 1xx Dönen Varlıklar (Current Assets)
  { code: '100', name: 'Kasa', type: 'ASSET', normalBalance: 'DEBIT' },
  { code: '102', name: 'Bankalar', type: 'ASSET', normalBalance: 'DEBIT' },
  { code: '120', name: 'Alıcılar (Müşteriler)', type: 'ASSET', normalBalance: 'DEBIT' },
  { code: '153', name: 'Ticari Mallar', type: 'ASSET', normalBalance: 'DEBIT' },
  { code: '191', name: 'İndirilecek KDV', type: 'ASSET', normalBalance: 'DEBIT' },

  // 3xx Kısa Vadeli Yabancı Kaynaklar (Short-Term Liabilities)
  { code: '320', name: 'Satıcılar', type: 'LIABILITY', normalBalance: 'CREDIT' },
  { code: '360', name: 'Ödenecek Vergi ve Fonlar', type: 'LIABILITY', normalBalance: 'CREDIT' },
  { code: '391', name: 'Hesaplanan KDV', type: 'LIABILITY', normalBalance: 'CREDIT' },

  // 5xx Özkaynaklar (Equity)
  { code: '500', name: 'Sermaye', type: 'EQUITY', normalBalance: 'CREDIT' },

  // 6xx Gelir Tablosu Hesapları (Revenue & Cost)
  { code: '600', name: 'Yurtiçi Satışlar', type: 'REVENUE', normalBalance: 'CREDIT' },
  { code: '621', name: 'Satılan Ticari Mallar Maliyeti', type: 'EXPENSE', normalBalance: 'DEBIT' },

  // 7xx Gider Hesapları (Operating Expenses)
  { code: '770', name: 'Genel Yönetim Giderleri', type: 'EXPENSE', normalBalance: 'DEBIT' },
];
