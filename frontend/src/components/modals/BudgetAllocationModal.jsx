import React, { useState, useEffect } from 'react';
import { X, DollarSign, CheckCircle2, FileText, ShoppingCart, Landmark, ZoomIn, ZoomOut, RotateCw, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import purchaseOrderService from '../../services/purchaseOrderService';

// Helper to retrieve already funded item quantities from localStorage batches
const getFundedQuantities = (mrId) => {
  const batchesRaw = localStorage.getItem('po_batches_' + mrId);
  if (!batchesRaw) return {};
  try {
    const batches = JSON.parse(batchesRaw);
    const funded = {};
    batches.forEach(batch => {
      if (batch.purchase_orders) {
        batch.purchase_orders.forEach(po => {
          if (po.items) {
            po.items.forEach(item => {
              const key = String(item.id || item.name);
              if (!funded[key]) funded[key] = 0;
              funded[key] += Number(item.quantity) || 0;
            });
          }
        });
      }
    });
    return funded;
  } catch (e) {
    console.error("Failed to parse local storage PO batches", e);
    return {};
  }
};

export default function BudgetAllocationModal({ isOpen, onClose, request, onSuccess }) {
  const [budgetAllocated, setBudgetAllocated] = useState('');
  const [accountingNotes, setAccountingNotes] = useState('');
  const [editableItems, setEditableItems] = useState([]);
  const [receiptFile, setReceiptFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Supplier details state: maps supplier name to billing details
  const [supplierDetails, setSupplierDetails] = useState({});
  const [pastSuppliers, setPastSuppliers] = useState(['Gaza Hardware', 'Electrical Wholesaler', 'Shell Station']);

  // Image manipulation states
  const [imgScale, setImgScale] = useState(1);
  const [imgRotation, setImgRotation] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const fetchPastSuppliers = async () => {
      try {
        const apiBillTo = [];
        const res = await purchaseOrderService.getPurchaseOrders();
        if (res.success && Array.isArray(res.data)) {
          res.data.forEach(po => {
            if (po.bill_to && po.bill_to.trim() !== '') {
              apiBillTo.push(po.bill_to.trim());
            }
          });
        }

        // Extract from local storage po_batches_ and po_draft_mr_
        const localStorageBillTo = [];
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('po_batches_')) {
              const raw = localStorage.getItem(key);
              if (raw) {
                const batches = JSON.parse(raw);
                if (Array.isArray(batches)) {
                  batches.forEach(batch => {
                    if (batch.purchase_orders && Array.isArray(batch.purchase_orders)) {
                      batch.purchase_orders.forEach(po => {
                        if (po.bill_to && po.bill_to.trim() !== '') {
                          localStorageBillTo.push(po.bill_to.trim());
                        }
                      });
                    }
                  });
                }
              }
            }
            if (key && key.startsWith('po_draft_mr_')) {
              const raw = localStorage.getItem(key);
              if (raw) {
                const draft = JSON.parse(raw);
                if (draft.supplierDetails) {
                  Object.values(draft.supplierDetails).forEach(details => {
                    if (details.bill_to && details.bill_to.trim() !== '') {
                      localStorageBillTo.push(details.bill_to.trim());
                    }
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error("Local storage lookup error:", err);
        }

        const defaultSuppliers = ['Gaza Hardware', 'Electrical Wholesaler', 'Shell Station'];
        const uniqueSuppliers = Array.from(new Set([
          ...defaultSuppliers,
          ...apiBillTo,
          ...localStorageBillTo
        ]));
        setPastSuppliers(uniqueSuppliers);
      } catch (e) {
        console.error("Failed to fetch past suppliers/vendors:", e);
      }
    };
    if (isOpen) {
      fetchPastSuppliers();
    }
  }, [isOpen]);

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
      setImgScale(1);
      setImgRotation(0);
      setPanOffset({ x: 0, y: 0 });
      setIsDragging(false);
      const requestItems = Array.isArray(request.items) ? request.items : [];
      const fundedQtyMap = getFundedQuantities(request.id);

      // Pre-fill editable items, setting remaining quantities
      const itemsList = requestItems.map((item) => {
        const key = String(item.id || item.name);
        const fundedQty = Number(fundedQtyMap[key]) || 0;
        const totalQty = Number(item.quantity) || 0;
        const remainingQty = Math.max(0, totalQty - fundedQty);
        
        // Pick a default supplier if none assigned
        let defaultSupplier = item.supplier || '';
        if (!defaultSupplier) {
          if (item.name?.toLowerCase().includes('wire') || item.name?.toLowerCase().includes('elec') || item.name?.toLowerCase().includes('tape')) {
            defaultSupplier = 'Electrical Wholesaler';
          } else if (item.name?.toLowerCase().includes('cement') || item.name?.toLowerCase().includes('pipe') || item.name?.toLowerCase().includes('clamp')) {
            defaultSupplier = 'Gaza Hardware';
          } else if (item.name?.toLowerCase().includes('van') || item.name?.toLowerCase().includes('fuel') || item.name?.toLowerCase().includes('gas')) {
            defaultSupplier = 'Shell Station';
          } else {
            defaultSupplier = 'Gaza Hardware';
          }
        }

        return {
          id: item.id,
          name: item.name || '',
          quantity: totalQty,
          remainingQuantity: remainingQty,
          qtyToFund: remainingQty,
          unit: item.unit || '',
          price: Number(item.price) || 0,
          discount: Number(item.discount) || 0,
          supplier: defaultSupplier,
          checked: remainingQty > 0, // checked by default if there's anything left to fund
        };
      });

      setEditableItems(itemsList);
      setAccountingNotes(request.accounting_notes || '');

      // Initialize default billing details for standard suppliers
      setSupplierDetails({
        'Gaza Hardware': {
          bill_to: 'Gaza Hardware',
          payment_terms: '',
          account_name: '',
          account_number: '',
          rfp_number: ''
        },
        'Electrical Wholesaler': {
          bill_to: 'Electrical Wholesaler',
          payment_terms: '',
          account_name: '',
          account_number: '',
          rfp_number: ''
        },
        'Shell Station': {
          bill_to: 'Shell Station',
          payment_terms: '',
          account_name: '',
          account_number: '',
          rfp_number: ''
        }
      });
    }
  }, [isOpen, request]);

  const normalizeMoney = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  };

  // Compute live values for selected/checked items
  const computedItems = editableItems.map((item) => {
    const qtyToFund = normalizeMoney(item.qtyToFund);
    const price = normalizeMoney(item.price);
    const gross = qtyToFund * price;
    const discount = Math.min(normalizeMoney(item.discount), gross);
    const total = gross - discount;
    return { ...item, qtyToFund, price, gross, discount, total };
  });

  // Unique suppliers among CHECKED items
  const activeSuppliers = Array.from(new Set(
    computedItems.filter(item => item.checked && item.supplier.trim() !== '').map(item => item.supplier.trim())
  ));

  const selectedGrossTotal = computedItems.reduce((sum, item) => sum + (item.checked ? item.gross : 0), 0);
  const selectedTotalDiscount = computedItems.reduce((sum, item) => sum + (item.checked ? item.discount : 0), 0);
  const selectedTotalNet = computedItems.reduce((sum, item) => sum + (item.checked ? item.total : 0), 0);

  // Sync selected sum with allocated budget input
  useEffect(() => {
    setBudgetAllocated(selectedTotalNet > 0 ? selectedTotalNet.toFixed(2) : '');
  }, [selectedTotalNet]);

  const updateItemField = (itemId, field, value) => {
    setEditableItems((current) => current.map((item) => {
      if (item.id !== itemId) return item;
      
      let val = value;
      if (field === 'checked') val = !!value;
      if (field === 'qtyToFund') {
        const num = Number(value);
        val = isNaN(num) ? 0 : Math.min(item.remainingQuantity, Math.max(0, num));
      }
      return { ...item, [field]: val };
    }));
  };

  const handleSupplierDetailChange = (supplierName, field, value) => {
    setSupplierDetails(prev => ({
      ...prev,
      [supplierName]: {
        ...(prev[supplierName] || { bill_to: '', payment_terms: '', account_name: '', account_number: '', rfp_number: '' }),
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const checkedItems = computedItems.filter(item => item.checked);
    if (checkedItems.length === 0) {
      toast.error('Please select at least one item to fund.');
      return;
    }

    if (!budgetAllocated || isNaN(Number(budgetAllocated)) || Number(budgetAllocated) <= 0) {
      toast.error('Please enter a valid budget allocation amount.');
      return;
    }

    for (const item of checkedItems) {
      if (item.qtyToFund <= 0) {
        toast.error(`Please select a valid quantity to fund for "${item.name}".`);
        return;
      }
      if (item.discount > item.gross) {
        toast.error(`Discount for "${item.name}" cannot exceed gross total.`);
        return;
      }
      if (!item.supplier.trim()) {
        toast.error(`Please assign a supplier for "${item.name}".`);
        return;
      }
    }

    setIsSubmitting(true);

    // Simulate backend response & store in localStorage
    setTimeout(() => {
      try {
        const existingBatchesRaw = localStorage.getItem('po_batches_' + request.id);
        const batches = existingBatchesRaw ? JSON.parse(existingBatchesRaw) : [];

        // Group selections by supplier
        const itemsBySupplier = {};
        checkedItems.forEach(item => {
          if (!itemsBySupplier[item.supplier]) {
            itemsBySupplier[item.supplier] = [];
          }
          itemsBySupplier[item.supplier].push(item);
        });

        const newBatchId = `batch-${Date.now()}`;
        const generatedPOs = [];

        // Create POs for each supplier
        Object.keys(itemsBySupplier).forEach(supplier => {
          const supplierItems = itemsBySupplier[supplier];
          const details = supplierDetails[supplier] || {
            bill_to: supplier,
            payment_terms: '',
            account_name: '',
            account_number: '',
            rfp_number: ''
          };

          const po = {
            id: `po-${Date.now()}-${supplier.replace(/\s+/g, '')}`,
            po_number: `PO-${new Date().getFullYear()}-${request.id}-${supplier.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toLocaleDateString(),
            payment_terms: details.payment_terms,
            bill_to: details.bill_to,
            account_name: details.account_name,
            account_number: details.account_number,
            rfp_number: details.rfp_number,
            project_name: request.project_name,
            mr_id: request.id,
            supplier: supplier,
            items: supplierItems.map(i => ({
              id: i.id,
              name: i.name,
              quantity: i.qtyToFund,
              unit: i.unit,
              price: i.price,
              discount: i.discount,
              total: i.total
            })),
            signatures: {
              prepared_by: request.created_by_name || 'Site Engineer',
              prepared_by_signature: request.created_by_signature,
              checked_by: 'Federico B. Rubin',
              checked_by_signature: '/formlogo.webp', // logo fallback
              approved_by: request.reviewed_by_ceo_name || 'Griff\'n G. Reyes',
              approved_by_signature: request.reviewed_by_ceo_signature
            }
          };

          generatedPOs.push(po);
        });

        const newBatch = {
          id: newBatchId,
          released_at: new Date().toISOString(),
          amount: Number(budgetAllocated),
          receipt_image: previewUrl || '/formlogo.webp',
          notes: accountingNotes,
          purchase_orders: generatedPOs
        };

        batches.push(newBatch);
        localStorage.setItem('po_batches_' + request.id, JSON.stringify(batches));

        // Compute updated funding totals to report back to parent
        const totalFundedMap = getFundedQuantities(request.id);
        const allItems = Array.isArray(request.items) ? request.items : [];
        let allFullyFunded = true;
        let anyFunded = false;

        allItems.forEach(i => {
          const key = String(i.id || i.name);
          const totalFunded = totalFundedMap[key] || 0;
          if (totalFunded < Number(i.quantity)) {
            allFullyFunded = false;
          }
          if (totalFunded > 0) {
            anyFunded = true;
          }
        });

        // Mock a backend response matching the new schema
        const updatedRequest = {
          ...request,
          accounting_status: allFullyFunded ? 'funds_released' : (anyFunded ? 'partially_funded' : 'pending_funds'),
          budget_allocated: Number(request.budget_allocated || 0) + Number(budgetAllocated),
          accounting_notes: accountingNotes,
          accounting_receipt: previewUrl || '/formlogo.webp',
        };

        toast.success(`Funds successfully released! Generated ${generatedPOs.length} Purchase Order(s).`);
        
        setIsSubmitting(false);
        if (onSuccess) onSuccess(updatedRequest);
        onClose();
      } catch (err) {
        console.error(err);
        toast.error('Simulation error: ' + err.message);
        setIsSubmitting(false);
      }
    }, 1200);
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className={request.request_image ? "flex flex-col lg:flex-row gap-6 w-full lg:max-w-[80vw] my-8 max-h-[90vh] items-stretch justify-center" : "w-full max-w-5xl my-8 max-h-[90vh] flex flex-col"}>
        {/* PO Builder Card */}
        <div 
          className="w-full flex-1 rounded-[1.25rem] border border-[#10344d] bg-[#041e30] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#10344d] px-6 py-5">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#FF7120]" strokeWidth={2.5} />
            <h2 className="text-[17px] font-bold text-white tracking-wide">Multi-Supplier Fund Release & PO Generator</h2>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Quick Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#10344d] bg-[#011423] p-4 shadow-inner">
              <p className="text-[#547C97] text-[10px] uppercase font-bold tracking-widest mb-1">Project Name</p>
              <p className="text-white font-bold text-sm truncate uppercase">{request.project_name || 'N/A'}</p>
            </div>
            <div className="rounded-xl border border-[#10344d] bg-[#011423] p-4 shadow-inner">
              <p className="text-[#547C97] text-[10px] uppercase font-bold tracking-widest mb-1">Project Site / Address</p>
              <p className="text-white/80 text-xs truncate uppercase">{request.delivery_location || '-'}</p>
            </div>
            <div className="rounded-xl border border-[#10344d] bg-[#011423] p-4 shadow-inner">
              <p className="text-[#547C97] text-[10px] uppercase font-bold tracking-widest mb-1">Batch Funding Release (Net)</p>
              <p className="text-xl font-extrabold text-[#FF7120]">
                ₱{selectedTotalNet.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
              <form id="allocation-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Checklist Table */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/80 mb-2.5">
                1. Select Items to Fund & Assign Suppliers
              </label>
              
              <div className="rounded-xl border border-[#10344d] bg-[#011423] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: '950px' }}>
                    <thead className="bg-[#08263c] text-[#9ec3da] text-[10px] uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-4 py-3 text-center w-12">Fund?</th>
                        <th className="text-left px-4 py-3">Material Description</th>
                        <th className="text-left px-4 py-3 w-44">Supplier/Vendor</th>
                        <th className="text-right px-4 py-3 w-28">Remaining Qty</th>
                        <th className="text-center px-4 py-3 w-20">Unit</th>
                        <th className="text-right px-4 py-3 w-24">Fund Qty</th>
                        <th className="text-right px-4 py-3 w-28">Price (₱)</th>
                        <th className="text-right px-4 py-3 w-28">Discount (₱)</th>
                        <th className="text-right px-4 py-3 w-32">Net Total (₱)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#10344d]/50">
                      {computedItems.map((item) => {
                        const isLocked = item.remainingQuantity <= 0;
                        return (
                          <tr key={item.id} className={`hover:bg-[#021829]/30 transition ${item.checked ? 'bg-[#FF7120]/5' : ''} ${isLocked ? 'opacity-40 bg-black/10' : ''}`}>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                disabled={isLocked}
                                checked={item.checked && !isLocked}
                                onChange={(e) => updateItemField(item.id, 'checked', e.target.checked)}
                                className="h-4 w-4 rounded border-[#10344d] bg-[#041e30] text-[#FF7120] focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="px-4 py-3 font-semibold text-white" style={{ minWidth: '180px' }}>
                              {item.name || '-'}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                list="suppliers-list"
                                disabled={isLocked || !item.checked}
                                value={item.supplier}
                                onChange={(e) => updateItemField(item.id, 'supplier', e.target.value)}
                                placeholder="Enter supplier"
                                style={{ minWidth: '150px' }}
                                className="w-full text-xs rounded-lg border border-[#10344d] bg-[#041e30] px-2 py-1.5 text-white outline-none focus:border-[#FF7120]/60 disabled:opacity-50"
                              />
                            </td>
                            <td className="px-4 py-3 text-right text-white/55 font-medium" style={{ minWidth: '110px' }}>
                              {isLocked ? 'Fully Funded' : item.remainingQuantity.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center text-white/55 font-medium" style={{ minWidth: '70px' }}>
                              {item.unit || '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                min="0.01"
                                max={item.remainingQuantity}
                                step="0.01"
                                disabled={isLocked || !item.checked}
                                value={item.qtyToFund}
                                onChange={(e) => updateItemField(item.id, 'qtyToFund', e.target.value)}
                                style={{ minWidth: '85px' }}
                                className="w-full text-xs rounded-lg border border-[#10344d] bg-[#041e30] px-2 py-1.5 text-white text-right outline-none focus:border-[#FF7120]/60 disabled:opacity-50"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={isLocked || !item.checked}
                                value={item.price}
                                onChange={(e) => updateItemField(item.id, 'price', e.target.value)}
                                style={{ minWidth: '95px' }}
                                className="w-24 text-xs rounded-lg border border-[#10344d] bg-[#041e30] px-2 py-1.5 text-white text-right outline-none focus:border-[#FF7120]/60 disabled:opacity-50"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={isLocked || !item.checked}
                                value={item.discount}
                                onChange={(e) => updateItemField(item.id, 'discount', e.target.value)}
                                style={{ minWidth: '95px' }}
                                className="w-24 text-xs rounded-lg border border-[#10344d] bg-[#041e30] px-2 py-1.5 text-white text-right outline-none focus:border-[#FF7120]/60 disabled:opacity-50"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-[#FFBE9B]" style={{ minWidth: '110px' }}>
                              ₱{item.checked ? item.total.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                            </td>
                          </tr>
                        );
                      })}
                      {computedItems.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center text-white/55">
                            No materials found in this request.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Supplier Details inputs */}
            {activeSuppliers.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/80 mb-3">
                  2. Input Supplier Commercial Terms (Generates {activeSuppliers.length} PO{activeSuppliers.length > 1 ? 's' : ''})
                </label>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {activeSuppliers.map((supplier) => {
                    const details = supplierDetails[supplier] || { bill_to: supplier, payment_terms: '', account_name: '', account_number: '', rfp_number: '' };
                    return (
                      <div key={supplier} className="rounded-xl border border-[#10344d] bg-[#011423] p-5 space-y-4">
                        <div className="flex items-center gap-2 border-b border-[#10344d] pb-2">
                          <Landmark className="h-4 w-4 text-[#FF7120]" />
                          <h4 className="text-xs font-extrabold text-white tracking-wide uppercase">PO Sourcing: {supplier}</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-white/60 mb-1">Bill To</label>
                            <input
                              type="text"
                              value={details.bill_to}
                              onChange={(e) => handleSupplierDetailChange(supplier, 'bill_to', e.target.value)}
                              placeholder="Bill recipient name"
                              className="w-full rounded-lg border border-[#10344d] bg-[#041e30] px-3 py-2 text-white outline-none focus:border-[#FF7120]/60"
                            />
                          </div>
                          <div>
                            <label className="block text-white/60 mb-1">Payment Terms</label>
                            <input
                              type="text"
                              value={details.payment_terms}
                              onChange={(e) => handleSupplierDetailChange(supplier, 'payment_terms', e.target.value)}
                              placeholder="e.g. PDC - 15 Days"
                              className="w-full rounded-lg border border-[#10344d] bg-[#041e30] px-3 py-2 text-white outline-none focus:border-[#FF7120]/60"
                            />
                          </div>
                          <div>
                            <label className="block text-white/60 mb-1">Supplier Bank Account Name</label>
                            <input
                              type="text"
                              value={details.account_name}
                              onChange={(e) => handleSupplierDetailChange(supplier, 'account_name', e.target.value)}
                              placeholder="Vendor Account Name"
                              className="w-full rounded-lg border border-[#10344d] bg-[#041e30] px-3 py-2 text-white outline-none focus:border-[#FF7120]/60"
                            />
                          </div>
                          <div>
                            <label className="block text-white/60 mb-1">Supplier Bank Account Number</label>
                            <input
                              type="text"
                              value={details.account_number}
                              onChange={(e) => handleSupplierDetailChange(supplier, 'account_number', e.target.value)}
                              placeholder="Account Number"
                              className="w-full rounded-lg border border-[#10344d] bg-[#041e30] px-3 py-2 text-white outline-none focus:border-[#FF7120]/60"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-white/60 mb-1">R.F.P Number (Request for Payment)</label>
                            <input
                              type="text"
                              value={details.rfp_number}
                              onChange={(e) => handleSupplierDetailChange(supplier, 'rfp_number', e.target.value)}
                              placeholder="Auto-generated if blank"
                              className="w-full rounded-lg border border-[#10344d] bg-[#041e30] px-3 py-2 text-white outline-none focus:border-[#FF7120]/60"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Receipt and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Left Side: Upload receipt */}
              <div className="space-y-4">
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/80">
                  3. Upload Proof of Transfer / Receipt (Slip)
                </label>
                
                <div className="rounded-xl border border-dashed border-[#10344d] bg-[#011423] p-6 text-center hover:bg-[#021b2e] transition cursor-pointer flex flex-col items-center justify-center relative min-h-[160px] group">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <ShoppingCart className="h-8 w-8 text-[#547C97] group-hover:text-[#FF7120] transition mb-3" />
                  <p className="text-xs text-white font-semibold mb-1">Drag and drop banking receipt image here</p>
                  <p className="text-[10px] text-white/40">PDF or Images accepted</p>
                  {receiptFile && <p className="mt-2 text-xs text-emerald-400 font-bold">Selected: {receiptFile.name}</p>}
                </div>

                {previewUrl && receiptFile?.type?.startsWith('image/') && (
                  <div className="rounded-xl border border-white/10 bg-black/30 p-2 shadow-inner overflow-hidden flex justify-center animate-in fade-in zoom-in-95 duration-200">
                    <img src={previewUrl} alt="Receipt Preview" className="max-h-48 w-auto rounded-lg border border-white/10 shadow-xl object-contain" />
                  </div>
                )}
              </div>

              {/* Right Side: Notes */}
              <div className="space-y-4">
                <label className="block text-[10px] font-bold tracking-widest uppercase text-white/80">
                  4. Accounting / Release Notes
                </label>
                <textarea
                  value={accountingNotes}
                  onChange={(e) => setAccountingNotes(e.target.value)}
                  placeholder="Provide transaction comments, bank receipt description, or release schedule details..."
                  rows={6}
                  className="w-full rounded-xl border border-[#10344d] bg-[#011423] px-4 py-3 text-sm text-white placeholder:text-[#3b5e77] outline-none resize-none focus:border-[#FF7120]/60 focus:bg-[#021b2e] transition shadow-inner"
                />
              </div>
            </div>
            {/* Hidden Input for allocated budget to keep form submission happy */}
            <input type="hidden" name="budget_allocated" value={budgetAllocated} />
            <datalist id="suppliers-list">
              {pastSuppliers.map((sup, idx) => (
                <option key={idx} value={sup} />
              ))}
            </datalist>
          </form>
        </div>

        {/* Modal Footer */}
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
            disabled={isSubmitting || activeSuppliers.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF7120] px-6 py-2.5 text-xs font-bold tracking-wide text-white shadow-lg shadow-[#FF7120]/20 hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? 'Generating POs...' : `Release & Generate ${activeSuppliers.length} PO${activeSuppliers.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Reference Image Card */}
      {request.request_image && (
        <div 
          className="w-full lg:flex-1 rounded-[1.25rem] border border-[#10344d] bg-[#041e30] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[#10344d] px-6 py-4">
            <h3 className="text-sm font-bold text-white tracking-wide">MR Reference Image</h3>
            <div className="flex items-center gap-1 bg-[#011423] px-2 py-1 rounded-lg border border-[#10344d]">
              <button 
                type="button"
                onClick={() => setImgScale(prev => Math.min(prev + 0.25, 3))} 
                className="p-1 text-white/60 hover:text-white transition hover:bg-white/5 rounded"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button 
                type="button"
                onClick={() => setImgScale(prev => Math.max(prev - 0.25, 0.5))} 
                className="p-1 text-white/60 hover:text-white transition hover:bg-white/5 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button 
                type="button"
                onClick={() => setImgRotation(prev => (prev + 90) % 360)} 
                className="p-1 text-white/60 hover:text-white transition hover:bg-white/5 rounded"
                title="Rotate Clockwise"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button 
                type="button"
                onClick={() => { setImgScale(1); setImgRotation(0); setPanOffset({ x: 0, y: 0 }); }} 
                className="p-1 text-white/60 hover:text-white transition hover:bg-white/5 rounded"
                title="Reset View"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center items-center overflow-hidden bg-[#011423] relative min-h-[300px]">
            <div 
              className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img 
                src={request.request_image} 
                alt="Material Request Reference" 
                draggable={false}
                style={{ 
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${imgScale}) rotate(${imgRotation}deg)`,
                  maxHeight: imgRotation % 180 !== 0 ? '420px' : '60vh',
                  maxWidth: imgRotation % 180 !== 0 ? '420px' : '100%',
                  transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.2s, max-width 0.2s' 
                }}
                className="w-full object-contain rounded-lg shadow-lg pointer-events-none" 
              />
            </div>
            <a 
              href={request.request_image} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 px-2.5 py-1 rounded text-[10px] text-white/70 hover:text-white transition font-medium"
            >
              Open Original
            </a>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
