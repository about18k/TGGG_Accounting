import React, { useState, useEffect } from 'react';
import { X, DollarSign, CheckCircle2, FileText, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import materialRequestService from '../../services/materialRequestService';

export default function BudgetAllocationModal({ isOpen, onClose, request, onSuccess }) {
  const [budgetAllocated, setBudgetAllocated] = useState('');
  const [accountingNotes, setAccountingNotes] = useState('');
  const [editableItems, setEditableItems] = useState([]);
  const [receiptFile, setReceiptFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (receiptFile) {
      const objectUrl = URL.createObjectURL(receiptFile);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setPreviewUrl(null);
  }, [receiptFile]);

  useEffect(() => {
    if (isOpen && request) {
      const requestItems = Array.isArray(request.items) ? request.items : [];
      setEditableItems(requestItems.map((item) => ({
        id: item.id,
        name: item.name || '',
        quantity: Number(item.quantity) || 0,
        unit: item.unit || '',
        price: Number(item.price) || 0,
        discount: Number(item.discount) || 0,
      })));
      if (request.budget_allocated) {
        setBudgetAllocated(request.budget_allocated);
      } else {
        const total = requestItems.reduce((sum, item) => {
          const quantity = Number(item.quantity) || 0;
          const price = Number(item.price) || 0;
          const discount = Number(item.discount) || 0;
          return sum + Math.max(0, (quantity * price) - discount);
        }, 0);
        setBudgetAllocated(total ? total.toString() : '');
      }
      setAccountingNotes(request.accounting_notes || '');
    }
  }, [isOpen, request]);

  if (!isOpen || !request) return null;

  const normalizeMoney = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  };

  const computedItems = editableItems.map((item) => {
    const quantity = normalizeMoney(item.quantity);
    const price = normalizeMoney(item.price);
    const gross = quantity * price;
    const discount = Math.min(normalizeMoney(item.discount), gross);
    const total = gross - discount;
    return { ...item, quantity, price, gross, discount, total };
  });

  const grossTotal = computedItems.reduce((sum, item) => sum + item.gross, 0);
  const totalDiscount = computedItems.reduce((sum, item) => sum + item.discount, 0);
  const totalRequested = computedItems.reduce((sum, item) => sum + item.total, 0);

  const updateItemDiscount = (itemId, value) => {
    setEditableItems((current) => current.map((item) => {
      if (item.id !== itemId) return item;
      return { ...item, discount: value };
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!budgetAllocated || isNaN(Number(budgetAllocated))) {
      toast.error('Please enter a valid budget amount.');
      return;
    }

    for (const item of computedItems) {
      if (item.discount > item.gross) {
        toast.error(`Discount for "${item.name || 'item'}" cannot exceed gross amount.`);
        return;
      }
    }

    setIsSubmitting(true);
    let payload;
    const discountsPayload = computedItems.map((item) => ({
      id: item.id,
      discount: item.discount.toFixed(2),
    }));
    
    if (receiptFile) {
      payload = new FormData();
      payload.append('budget_allocated', budgetAllocated);
      payload.append('accounting_notes', accountingNotes);
      payload.append('item_discounts', JSON.stringify(discountsPayload));
      payload.append('accounting_receipt', receiptFile);
    } else {
      payload = {
        budget_allocated: budgetAllocated,
        accounting_notes: accountingNotes,
        item_discounts: discountsPayload,
      };
    }

    const result = await materialRequestService.allocateFunds(request.id, payload);

    setIsSubmitting(false);

    if (result.success) {
      toast.success('Funds successfully allocated and released.');
      if (onSuccess) onSuccess(result.data);
      onClose();
    } else {
      toast.error(result.error || 'Failed to allocate funds.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-4xl rounded-[1.25rem] border border-[#10344d] bg-[#041e30] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#10344d] px-6 py-5">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#FF7120]" strokeWidth={2.5} />
            <h2 className="text-[17px] font-bold text-white tracking-wide">Allocate Funds</h2>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="rounded-xl border border-[#10344d] bg-[#011423] p-4 text-sm shadow-inner">
            <p className="text-[#547C97] text-[10px] uppercase font-bold tracking-widest mb-1">Project</p>
            <p className="text-white font-medium mb-3">{request.project_name || 'N/A'}</p>
            
            <p className="text-[#547C97] text-[10px] uppercase font-bold tracking-widest mb-1">Net Requested Amount</p>
            <p className="text-xl font-bold text-[#FF7120]">
              ₱{totalRequested.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <div className="mt-2 text-xs text-white/70 space-y-1">
              <p>Gross: ₱{grossTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              <p>Total Discounts: ₱{totalDiscount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <form id="allocation-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/80 mb-2">
                Item Discounts (Accounting)
              </label>
              <div className="rounded-xl border border-[#10344d] bg-[#011423] overflow-x-auto">
                <table className="w-full min-w-[740px] text-sm">
                  <thead className="bg-[#08263c] text-[#9ec3da] text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-3 py-2">Item</th>
                      <th className="text-right px-3 py-2">Qty</th>
                      <th className="text-right px-3 py-2">Price</th>
                      <th className="text-right px-3 py-2">Gross</th>
                      <th className="text-right px-3 py-2">Discount</th>
                      <th className="text-right px-3 py-2">Net Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedItems.map((item) => (
                      <tr key={item.id} className="border-t border-[#10344d]">
                        <td className="px-3 py-2 text-white">{item.name || '-'}</td>
                        <td className="px-3 py-2 text-right text-white/80">
                          {item.quantity.toLocaleString('en-PH', { minimumFractionDigits: 2 })} {item.unit}
                        </td>
                        <td className="px-3 py-2 text-right text-white/80">
                          ₱{item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right text-white/80">
                          ₱{item.gross.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discount}
                            onChange={(e) => updateItemDiscount(item.id, e.target.value)}
                            className="w-32 ml-auto rounded-lg border border-[#10344d] bg-[#041e30] px-3 py-1.5 text-white text-right outline-none focus:border-[#FF7120]/60"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-[#FFBE9B]">
                          ₱{item.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    {computedItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-white/55">
                          No itemized materials found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/80 mb-2">
                Allocated Budget (₱) <span className="text-[#FF7120]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#547C97]">₱</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={budgetAllocated}
                  onChange={(e) => setBudgetAllocated(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[#10344d] bg-[#011423] pl-10 pr-4 py-3 text-white placeholder:text-[#3b5e77] outline-none focus:border-[#FF7120]/60 focus:bg-[#021b2e] transition shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/80 mb-2">
                Accounting / Release Notes
              </label>
              <textarea
                value={accountingNotes}
                onChange={(e) => setAccountingNotes(e.target.value)}
                placeholder="Optional notes"
                rows={3}
                className="w-full rounded-xl border border-[#10344d] bg-[#011423] px-4 py-3 text-sm text-white placeholder:text-[#3b5e77] outline-none resize-none focus:border-[#FF7120]/60 focus:bg-[#021b2e] transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/80 mb-2">
                Proof of Transfer (Optional)
              </label>

              <div className="rounded-xl border border-[#10344d] bg-[#011423] p-2 transition hover:bg-[#021b2e] shadow-inner group">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files[0])}
                  className="w-full text-sm text-[#547C97] file:mr-4 file:cursor-pointer file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#10344d] file:text-white hover:file:bg-[#164463] transition cursor-pointer group-hover:bg-transparent"
                />
              </div>

              {previewUrl && receiptFile?.type?.startsWith('image/') && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-2 shadow-inner overflow-hidden flex justify-center animate-in fade-in zoom-in-95 duration-200">
                  <img src={previewUrl} alt="Receipt Preview" className="max-h-56 w-auto rounded-lg border border-white/10 shadow-xl object-contain" />
                </div>
              )}

              {receiptFile?.type === 'application/pdf' && (
                <div className="mt-4 rounded-xl border border-[#FF7120]/20 bg-[#FF7120]/5 p-5 shadow-inner flex items-center justify-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                  <FileText className="h-7 w-7 text-[#FF7120]" />
                  <p className="text-sm font-medium text-white">{receiptFile.name || 'PDF Document Attached'}</p>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="border-t border-[#10344d] bg-[#021b2e]/50 px-6 py-4 flex items-center justify-end gap-3 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#10344d] bg-[#041e30] px-5 py-2.5 text-xs font-bold tracking-wide text-white/70 hover:bg-[#10344d] hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="allocation-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF7120] px-6 py-2.5 text-xs font-bold tracking-wide text-white shadow-lg shadow-[#FF7120]/20 hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? 'Processing...' : 'Release Funds'}
          </button>
        </div>
      </div>
    </div>
  );
}
