"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, Receipt, DollarSign, CheckCircle, Clock, Check, X } from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/utils/formatters';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_FILTER_OPTIONS = [
  { key: 'all', label: 'All Invoices' },
  { key: 'paid', label: 'Paid' },
  { key: 'outstanding', label: 'Outstanding' },
];

/**
 * Parse a date value into a Date object.
 * Handles multiple formats:
 *  - "2/3"           → M/D (needs year fallback)
 *  - "1/6/2026"      → M/D/YYYY
 *  - Verbose Date.toString() from Google Sheets, e.g.
 *    "Wed Feb 05 2025 00:00:00 GMT-0800 (Pacific Standard Time)"
 *  - Firestore Timestamps with { seconds, nanoseconds }
 */
function parseDateSent(dateSent, year) {
  if (!dateSent) return null;

  // Firestore Timestamp object
  if (typeof dateSent === 'object' && dateSent.seconds) {
    return new Date(dateSent.seconds * 1000);
  }

  const str = String(dateSent).trim();

  // Try M/D or M/D/YYYY format
  const parts = str.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  }
  if (parts.length === 2 && year) {
    return new Date(year, parseInt(parts[0]) - 1, parseInt(parts[1]));
  }

  // Fallback: try native Date parsing (handles verbose toString() output)
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  return null;
}

/** Format a transaction date (ISO 8601) to a short display string. */
function formatTxnDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const AdminInvoices = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [aliases, setAliases] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'dateSent', direction: 'desc' });
  const [matchSelections, setMatchSelections] = useState({});
  const [savingAlias, setSavingAlias] = useState(null);
  const [confirmedMatches, setConfirmedMatches] = useState({});

  const fetchData = useCallback(async () => {
    try {
      // Fetch all three data sources in parallel
      const [invoicesSnap, txnSnap, aliasesSnap] = await Promise.all([
        getDoc(doc(db, 'invoices', 'all')),
        getDocs(collection(db, 'transactions')),
        getDoc(doc(db, 'clientAliases', 'all')),
      ]);

      // Invoices
      if (invoicesSnap.exists()) {
        setInvoices(invoicesSnap.data().entries || []);
      } else {
        setInvoices([]);
      }

      // Transactions — only positive amounts (incoming payments)
      const txnDocs = txnSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((t) => t.amount > 0);
      setTransactions(txnDocs);

      // Client aliases
      if (aliasesSnap.exists()) {
        setAliases(aliasesSnap.data().aliases || {});
      } else {
        setAliases({});
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Restore confirmed matches from persisted matchedTransactionId on invoice entries
  useEffect(() => {
    if (invoices.length === 0 || transactions.length === 0) return;
    const txnMap = new Map(transactions.map((t) => [t.id, t]));
    const restored = {};
    for (const inv of invoices) {
      if (inv.matchedTransactionId) {
        const txn = txnMap.get(inv.matchedTransactionId);
        if (txn) {
          restored[inv.sheetRowNumber] = { txn, matchType: 'alias' };
        }
      }
    }
    if (Object.keys(restored).length > 0) {
      setConfirmedMatches(restored);
    }
  }, [invoices, transactions]);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Derive available month/year options from the data
  const monthOptions = useMemo(() => {
    const seen = new Map();
    for (const inv of invoices) {
      const parsed = parseDateSent(inv.dateSent, inv.year);
      if (parsed) {
        const key = `${parsed.getFullYear()}-${parsed.getMonth()}`;
        if (!seen.has(key)) {
          seen.set(key, { year: parsed.getFullYear(), month: parsed.getMonth() });
        }
      }
    }
    const options = Array.from(seen.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    return options;
  }, [invoices]);

  // Set default month filter to current month once data loads
  useEffect(() => {
    if (monthOptions.length > 0 && monthFilter === 'all') {
      const now = new Date();
      const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
      const match = monthOptions.find(
        (o) => `${o.year}-${o.month}` === currentKey
      );
      if (match) {
        setMonthFilter(currentKey);
      } else {
        const first = monthOptions[0];
        setMonthFilter(`${first.year}-${first.month}`);
      }
    }
  }, [monthOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredAndSorted = useMemo(() => {
    let items = invoices;

    // Month filter
    if (monthFilter !== 'all') {
      const [filterYear, filterMonth] = monthFilter.split('-').map(Number);
      items = items.filter((inv) => {
        const parsed = parseDateSent(inv.dateSent, inv.year);
        if (!parsed) return false;
        return parsed.getFullYear() === filterYear && parsed.getMonth() === filterMonth;
      });
    }

    // Status filter
    if (statusFilter === 'paid') {
      items = items.filter((inv) => inv.status === 'Paid');
    } else if (statusFilter === 'outstanding') {
      items = items.filter((inv) => inv.status !== 'Paid');
    }

    // Sort
    items = [...items].sort((a, b) => {
      const { key, direction } = sortConfig;
      let aVal, bVal;

      if (key === 'dateSent') {
        aVal = parseDateSent(a.dateSent, a.year)?.getTime() ?? 0;
        bVal = parseDateSent(b.dateSent, b.year)?.getTime() ?? 0;
      } else if (key === 'amount' || key === 'year') {
        aVal = a[key] ?? 0;
        bVal = b[key] ?? 0;
      } else {
        aVal = (a[key] ?? '').toString().toLowerCase();
        bVal = (b[key] ?? '').toString().toLowerCase();
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [invoices, monthFilter, statusFilter, sortConfig]);

  const summaryStats = useMemo(() => {
    const paid = filteredAndSorted.filter((inv) => inv.status === 'Paid');
    const outstanding = filteredAndSorted.filter((inv) => inv.status !== 'Paid');
    return {
      totalCount: filteredAndSorted.length,
      totalAmount: filteredAndSorted.reduce((sum, inv) => sum + (inv.amount || 0), 0),
      paidCount: paid.length,
      paidAmount: paid.reduce((sum, inv) => sum + (inv.amount || 0), 0),
      outstandingCount: outstanding.length,
      outstandingAmount: outstanding.reduce((sum, inv) => sum + (inv.amount || 0), 0),
    };
  }, [filteredAndSorted]);

  // -------------------------------------------------------
  // Matching logic: for each invoice, find candidate
  // transactions ranked by alias > name > amount
  // -------------------------------------------------------
  const matchCandidates = useMemo(() => {
    const candidateMap = {};

    for (const inv of filteredAndSorted) {
      const clientLower = (inv.client || '').toLowerCase();
      const candidates = [];
      const seenTxnIds = new Set();

      for (const txn of transactions) {
        const cpName = txn.counterpartyName || '';
        const cpLower = cpName.toLowerCase();
        const matchTypes = [];

        // 1. Alias match
        const aliasClients = aliases[cpLower];
        if (aliasClients && aliasClients.includes(inv.client)) {
          matchTypes.push('alias');
        }

        // 2. Name match (case-insensitive includes in either direction)
        if (cpLower && clientLower) {
          if (cpLower.includes(clientLower) || clientLower.includes(cpLower)) {
            matchTypes.push('name');
          }
        }

        // 3. Amount match
        if (txn.amount === inv.amount) {
          matchTypes.push('amount');
        }

        if (matchTypes.length > 0 && !seenTxnIds.has(txn.id)) {
          seenTxnIds.add(txn.id);
          // Use the highest priority match type
          const bestType = matchTypes[0];
          candidates.push({ txn, matchType: bestType });
        }
      }

      // Sort: alias first, then name, then amount
      const typeOrder = { alias: 0, name: 1, amount: 2 };
      candidates.sort((a, b) => typeOrder[a.matchType] - typeOrder[b.matchType]);

      candidateMap[inv.sheetRowNumber] = candidates;
    }

    return candidateMap;
  }, [filteredAndSorted, transactions, aliases]);

  // Confirm a match: save alias + persist match on the invoice + mark as Paid
  const handleConfirmMatch = async (invoice, transactionId) => {
    const txn = transactions.find((t) => t.id === transactionId);
    if (!txn) return;

    const cpLower = (txn.counterpartyName || '').toLowerCase();
    if (!cpLower) return;

    setSavingAlias(invoice.sheetRowNumber);

    try {
      // Build updated aliases (add client to array if not already present)
      const updatedAliases = { ...aliases };
      const existing = updatedAliases[cpLower] || [];
      if (!existing.includes(invoice.client)) {
        updatedAliases[cpLower] = [...existing, invoice.client];
      }

      // Update the invoice entry with matched transaction ID and set status to Paid
      const updatedInvoices = invoices.map((inv) => {
        if (inv.sheetRowNumber === invoice.sheetRowNumber) {
          return {
            ...inv,
            matchedTransactionId: transactionId,
            status: 'Paid',
            dateReceived: txn.postedAt || txn.createdAt || inv.dateReceived,
          };
        }
        return inv;
      });

      // Write both updates to Firestore in parallel
      await Promise.all([
        setDoc(doc(db, 'clientAliases', 'all'), { aliases: updatedAliases }),
        setDoc(doc(db, 'invoices', 'all'), { entries: updatedInvoices }, { merge: true }),
      ]);

      // Update local state
      setAliases(updatedAliases);
      setInvoices(updatedInvoices);
      setConfirmedMatches((prev) => ({
        ...prev,
        [invoice.sheetRowNumber]: { txn, matchType: 'alias' },
      }));
      setMatchSelections((prev) => {
        const next = { ...prev };
        delete next[invoice.sheetRowNumber];
        return next;
      });
    } catch (err) {
      console.error('Error saving match:', err);
    } finally {
      setSavingAlias(null);
    }
  };

  // Dismiss a confirmed match: clear persisted match and revert status
  const handleDismissMatch = async (sheetRowNumber) => {
    try {
      const updatedInvoices = invoices.map((inv) => {
        if (inv.sheetRowNumber === sheetRowNumber) {
          const { matchedTransactionId, ...rest } = inv;
          return { ...rest, status: '', dateReceived: '' };
        }
        return inv;
      });

      await setDoc(doc(db, 'invoices', 'all'), { entries: updatedInvoices }, { merge: true });
      setInvoices(updatedInvoices);
    } catch (err) {
      console.error('Error removing match:', err);
    }

    setConfirmedMatches((prev) => {
      const next = { ...prev };
      delete next[sheetRowNumber];
      return next;
    });
  };

  const formatDateDisplay = (dateStr, year) => {
    if (!dateStr) return '—';
    const parsed = parseDateSent(dateStr, year);
    if (!parsed) return dateStr;
    return parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    if (status === 'Paid') return 'bg-green-100 text-green-700';
    if (status === 'Payment Initiated') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getMatchTypeBadge = (type) => {
    if (type === 'alias') return 'bg-purple-100 text-purple-700';
    if (type === 'name') return 'bg-blue-100 text-blue-700';
    return 'bg-orange-100 text-orange-700';
  };

  // Render the match cell for a given invoice row
  const renderMatchCell = (inv) => {
    const rowKey = inv.sheetRowNumber;

    // Show confirmed match
    if (confirmedMatches[rowKey]) {
      const { txn } = confirmedMatches[rowKey];
      return (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-xs text-green-700 truncate max-w-[180px]">
            {txn.counterpartyName} — {formatCurrency(txn.amount)} — {formatTxnDate(txn.postedAt || txn.createdAt)}
          </span>
          <button
            onClick={() => handleDismissMatch(rowKey)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      );
    }

    const candidates = matchCandidates[rowKey] || [];
    if (candidates.length === 0) {
      return <span className="text-gray-400 text-xs">No matches</span>;
    }

    const selectedTxnId = matchSelections[rowKey];

    return (
      <div className="flex items-center gap-1">
        <select
          value={selectedTxnId || ''}
          onChange={(e) =>
            setMatchSelections((prev) => ({
              ...prev,
              [rowKey]: e.target.value || undefined,
            }))
          }
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white max-w-[240px] focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          <option value="">
            Select match... ({candidates.length})
          </option>
          {candidates.map((c) => (
            <option key={c.txn.id} value={c.txn.id}>
              {c.txn.counterpartyName || 'Unknown'} — {formatCurrency(c.txn.amount)} — {formatTxnDate(c.txn.postedAt || c.txn.createdAt)} ({c.matchType})
            </option>
          ))}
        </select>
        {selectedTxnId && (
          <button
            onClick={() => handleConfirmMatch(inv, selectedTxnId)}
            disabled={savingAlias === rowKey}
            className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 transition-colors flex-shrink-0"
            title="Confirm match and save alias"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Admin</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Receipt className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                  <p className="text-sm text-gray-600">Invoice payment status</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3">
                  {user.photoURL && (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{user.displayName}</div>
                    <div className="text-gray-500">{user.email}</div>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-500 text-sm">Loading invoices...</div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Invoiced ({summaryStats.totalCount})</div>
                    <div className="text-xl font-semibold text-gray-900">{formatCurrency(summaryStats.totalAmount)}</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Paid ({summaryStats.paidCount})</div>
                    <div className="text-xl font-semibold text-green-600">{formatCurrency(summaryStats.paidAmount)}</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <Clock className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Outstanding ({summaryStats.outstandingCount})</div>
                    <div className="text-xl font-semibold text-red-600">{formatCurrency(summaryStats.outstandingAmount)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              {/* Month Dropdown */}
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <option value="all">All Time</option>
                {monthOptions.map((opt) => (
                  <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                    {MONTH_NAMES[opt.month]} {opt.year}
                  </option>
                ))}
              </select>

              {/* Status Filter Tabs */}
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setStatusFilter(opt.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === opt.key
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}

              <span className="ml-auto text-sm text-gray-500">
                Showing {filteredAndSorted.length} invoice{filteredAndSorted.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        onClick={() => handleSort('client')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                      >
                        Client{getSortIndicator('client')}
                      </th>
                      <th
                        onClick={() => handleSort('amount')}
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                      >
                        Amount{getSortIndicator('amount')}
                      </th>
                      <th
                        onClick={() => handleSort('dateSent')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                      >
                        Date Sent{getSortIndicator('dateSent')}
                      </th>
                      <th
                        onClick={() => handleSort('status')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                      >
                        Status{getSortIndicator('status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Matched Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Date Received
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSorted.map((inv, idx) => (
                      <tr key={`${inv.client}-${inv.sheetRowNumber}-${idx}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[250px] truncate">
                          {inv.client}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                          inv.status === 'Paid' ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {formatCurrency(inv.amount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDateDisplay(inv.dateSent, inv.year)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(inv.status)}`}
                          >
                            {inv.status || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {renderMatchCell(inv)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateDisplay(inv.dateReceived, inv.year)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                          {inv.notes || '—'}
                        </td>
                      </tr>
                    ))}
                    {filteredAndSorted.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                          No invoices found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminInvoices;
