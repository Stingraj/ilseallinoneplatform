import React, { useState, useMemo } from 'react';
import { Search, Trash2, UserMinus, AlertTriangle, CheckCircle, XCircle, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

export function ContactTable({
  contacts,
  onRemoveContact,
  onRemoveAllInvalid,
  onClearList,
  onAddMore
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const validCount = useMemo(() => contacts.filter(c => c.isValid).length, [contacts]);
  const invalidCount = contacts.length - validCount;

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(c => c.email.includes(q));
  }, [contacts, searchQuery]);

  // Paginated contacts
  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      
      {/* Top Header & Stats */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2.5">
            <h3 className="text-xl font-semibold text-slate-900">
              {contacts.length.toLocaleString()} contacts
            </h3>
            <span className="text-xs text-slate-400">imported</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span className="inline-flex items-center text-emerald-600 font-medium">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              {validCount.toLocaleString()} valid
            </span>
            <span className="text-slate-300">•</span>
            <span className={`inline-flex items-center font-medium ${invalidCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              <XCircle className="w-3.5 h-3.5 mr-1" />
              {invalidCount.toLocaleString()} invalid
            </span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {invalidCount > 0 && (
            <button
              onClick={onRemoveAllInvalid}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>Remove {invalidCount} invalid</span>
            </button>
          )}

          <button
            onClick={onAddMore}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add more</span>
          </button>

          <button
            onClick={onClearList}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear list</span>
          </button>
        </div>
      </div>

      {/* Warning banner if invalid contacts remain */}
      {invalidCount > 0 && (
        <div className="bg-amber-50/80 border-b border-amber-100 px-5 py-2.5 text-xs text-amber-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{invalidCount} invalid email {invalidCount === 1 ? 'address' : 'addresses'}</strong> will not be sent.
            </span>
          </div>
          <button
            onClick={onRemoveAllInvalid}
            className="text-amber-900 underline font-medium hover:text-amber-950 text-[11px]"
          >
            Remove now
          </button>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="p-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search contacts by email..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
          />
        </div>
        <span className="text-[11px] text-slate-400 px-2">
          Showing {filteredContacts.length.toLocaleString()}
        </span>
      </div>

      {/* Contact Table */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-medium">
              <th className="py-2.5 px-4 w-12 text-slate-400">#</th>
              <th className="py-2.5 px-4 font-semibold text-slate-700">Email</th>
              <th className="py-2.5 px-4 w-32 font-semibold text-slate-700">Status</th>
              <th className="py-2.5 px-4 w-16 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedContacts.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  {searchQuery ? 'No contacts match your search.' : 'No contacts imported yet.'}
                </td>
              </tr>
            ) : (
              paginatedContacts.map((contact, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr key={contact.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                      {globalIndex}
                    </td>
                    <td className="py-2.5 px-4 text-slate-900 font-medium select-all">
                      {contact.email}
                    </td>
                    <td className="py-2.5 px-4">
                      {contact.isValid ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                          Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-100" title={contact.error || 'Invalid email format'}>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
                          {contact.error || 'Invalid'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => onRemoveContact(contact.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-opacity rounded"
                        title="Remove contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded bg-white border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded bg-white border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
