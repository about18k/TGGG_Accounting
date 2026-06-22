import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, CheckCircle2, ShoppingCart, Landmark, AlertCircle, Trash2, Plus, ZoomIn, ZoomOut, RotateCw, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import purchaseOrderService from '../../services/purchaseOrderService';

// Helper to retrieve already funded item quantities from local batches (fallback simulation)
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
              const key = String(item.material_request_item || item.id || item.name);
              if (!funded[key]) funded[key] = 0;
              funded[key] += Number(item.quantity) || 0;
            });
          }
        });
      }
    });
    return funded;
  } catch (e) {
    return {};
  }
};

export default function StudioHeadPoCreationModal({ isOpen, onClose, request, onSuccess, onApproveAndForward }) {
  const [editableItems, setEditableItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierDetails, setSupplierDetails] = useState({});
  const [hasDraft, setHasDraft] = useState(false);
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
  // Tracks whether the user has made any edit since the modal opened (guards auto-save from firing on initial load)
  const hasUserEdited = useRef(false);

  // ── Initialization helper (also used by Discard Draft) ──────────────────────
  const initializeItems = (req) => {
    const requestItems = Array.isArray(req.items) ? req.items : [];
    const fundedQtyMap = getFundedQuantities(req.id);

    const itemsList = requestItems.map((item) => {
      const key = String(item.id || item.name);
      const fundedQty = Number(item.quantity_funded) || Number(fundedQtyMap[key]) || 0;
      const totalQty = Number(item.quantity) || 0;
      const remainingQty = Math.max(0, totalQty - fundedQty);

      let defaultSupplier = 'Gaza Hardware';
      if (item.name?.toLowerCase().includes('wire') || item.name?.toLowerCase().includes('elec') || item.name?.toLowerCase().includes('tape')) {
        defaultSupplier = 'Electrical Wholesaler';
      } else if (item.name?.toLowerCase().includes('van') || item.name?.toLowerCase().includes('fuel') || item.name?.toLowerCase().includes('gas')) {
        defaultSupplier = 'Shell Station';
      }

      return {
        id: item.id,
        name: item.name || '',
        quantity: totalQty,
        // remainingQuantity kept for display; qty entry is uncapped to allow supplemental POs
        remainingQuantity: remainingQty,
        qtyToFund: remainingQty,      // 0 for fully-funded items — user can override
        unit: item.unit || '',
        price: Number(item.price) || 0,
        discount: Number(item.discount) || 0,
        supplier: defaultSupplier,
        checked: remainingQty > 0,    // unchecked if fully-funded; still visible
        isManual: false,
      };
    });

    setEditableItems(itemsList);
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
  };

  // ── Open: load draft or initialize fresh ─────────────────────────────────────
  useEffect(() => {
    if (isOpen && request) {
      setImgScale(1);
      setImgRotation(0);
      setPanOffset({ x: 0, y: 0 });
      setIsDragging(false);
      hasUserEdited.current = false;

      const draftKey = `po_draft_mr_${request.id}`;
      const draftRaw = localStorage.getItem(draftKey);
      if (draftRaw) {
        try {
          const draft = JSON.parse(draftRaw);
          if (draft.editableItems?.length > 0) {
            setEditableItems(draft.editableItems);
            setSupplierDetails(draft.supplierDetails || {});
            setHasDraft(true);
            return; // skip fresh initialization
          }
        } catch (e) { /* corrupt draft – fall through to fresh init */ }
      }

      setHasDraft(false);
      initializeItems(request);
    }
  }, [isOpen, request]);

  // ── Auto-save draft whenever user makes edits ─────────────────────────────────
  useEffect(() => {
    if (!isOpen || !request || !hasUserEdited.current || editableItems.length === 0) return;
    const draftKey = `po_draft_mr_${request.id}`;
    localStorage.setItem(draftKey, JSON.stringify({
      editableItems,
      supplierDetails,
      savedAt: new Date().toISOString(),
    }));
  }, [editableItems, supplierDetails, isOpen, request]);

  // Discard saved draft and start fresh
  const handleDiscardDraft = () => {
    localStorage.removeItem(`po_draft_mr_${request.id}`);
    setHasDraft(false);
    hasUserEdited.current = false;
    initializeItems(request);
  };

  if (!isOpen || !request) return null;

  const normalizeMoney = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  };

  const computedItems = editableItems.map((item) => {
    const qtyToFund = normalizeMoney(item.qtyToFund);
    const price = normalizeMoney(item.price);
    const gross = qtyToFund * price;
    const discount = Math.min(normalizeMoney(item.discount), gross);
    const total = gross - discount;
    return { ...item, qtyToFund, price, gross, discount, total };
  });

  const activeSuppliers = Array.from(new Set(
    computedItems.filter(item => item.checked && item.supplier.trim() !== '').map(item => item.supplier.trim())
  ));

  const selectedTotalNet = computedItems.reduce((sum, item) => sum + (item.checked ? item.total : 0), 0);

  const updateItemField = (itemId, field, value) => {
    hasUserEdited.current = true;
    setEditableItems((current) => current.map((item) => {
      if (item.id !== itemId) return item;
      let val = value;
      if (field === 'checked') val = !!value;
      return { ...item, [field]: val };
    }));
  };

  const formatQuantity = (val) => {
    if (val == null || val === '') return '';
    const num = Number(val);
    return isNaN(num) ? val : num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const handleSupplierDetailChange = (supplierName, field, value) => {
    hasUserEdited.current = true;
    setSupplierDetails(prev => ({
      ...prev,
      [supplierName]: {
        ...(prev[supplierName] || { bill_to: '', payment_terms: '', account_name: '', account_number: '', rfp_number: '' }),
        [field]: value
      }
    }));
  };

  const addItem = () => {
    hasUserEdited.current = true;
    setEditableItems(prev => [...prev, {
      id: `manual-${Date.now()}`,
      name: '',
      quantity: 0,
      remainingQuantity: Infinity, // no upper cap for manually added rows
      qtyToFund: 1,
      unit: 'pcs',
      price: 0,
      discount: 0,
      supplier: '',
      checked: true,
      isManual: true,
    }]);
  };

  // FR2 — Remove a row
  const deleteItem = (itemId) => {
    hasUserEdited.current = true;
    setEditableItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const checkedItems = computedItems.filter(item => item.checked);
    if (checkedItems.length === 0) {
      toast.error('Please select at least one item to include in the PO.');
      return;
    }

    for (const item of checkedItems) {
      if (!item.name || !item.name.trim()) {
        toast.error('All selected items must have a name/description.');
        return;
      }
      if (item.qtyToFund <= 0) {
        toast.error(`Please select a valid quantity for "${item.name}".`);
        return;
      }
      if (item.price <= 0) {
        toast.error(`Please enter a purchase price for "${item.name}".`);
        return;
      }
      if (!item.supplier.trim()) {
        toast.error(`Please assign a supplier for "${item.name}".`);
        return;
      }
    }

    setIsSubmitting(true);

    // Group items by supplier
    const itemsBySupplier = {};
    checkedItems.forEach(item => {
      if (!itemsBySupplier[item.supplier]) {
        itemsBySupplier[item.supplier] = [];
      }
      itemsBySupplier[item.supplier].push(item);
    });

    try {
      const createdPOIds = [];
      
      // Create PO and items for each supplier group
      for (const supplier of Object.keys(itemsBySupplier)) {
        const supplierItems = itemsBySupplier[supplier];
        const details = supplierDetails[supplier] || {};
        
        const payload = {
          material_request: request.id,
          supplier: supplier,
          payment_terms: details.payment_terms || '',
          bill_to: details.bill_to || supplier,
          account_name: details.account_name || '',
          account_number: details.account_number || '',
          rfp_number: details.rfp_number || '',
          items: supplierItems.map(i => ({
            material_request_item: i.isManual ? null : i.id,
            name: i.name,
            quantity: i.qtyToFund,
            unit: i.unit,
            price: i.price,
            discount: i.discount,
            total: i.total
          }))
        };

        const res = await purchaseOrderService.createPurchaseOrder(payload);
        if (res.success) {
          createdPOIds.push(res.data.id);
        } else {
          throw new Error(res.error || `Failed to create PO for ${supplier}`);
        }
      }

      // Submit POs to CEO for review
      for (const poId of createdPOIds) {
        await purchaseOrderService.submitPurchaseOrder(poId);
      }

      localStorage.removeItem(`po_draft_mr_${request.id}`);
      toast.success(`Generated and submitted ${createdPOIds.length} Purchase Order(s) to the CEO.`);
      setIsSubmitting(false);
      if (onApproveAndForward) onApproveAndForward();
      if (onSuccess) onSuccess();
      onClose();

    } catch (err) {
      console.warn("API failed, falling back to local storage simulation", err);
      
      // Graceful local storage simulation fallback
      const existingBatchesRaw = localStorage.getItem('po_batches_' + request.id);
      const batches = existingBatchesRaw ? JSON.parse(existingBatchesRaw) : [];

      const generatedPOs = [];
      Object.keys(itemsBySupplier).forEach(supplier => {
        const supplierItems = itemsBySupplier[supplier];
        const details = supplierDetails[supplier] || {};

        const po = {
          id: `po-${Date.now()}-${supplier.replace(/\s+/g, '')}`,
          po_number: `PO-${new Date().getFullYear()}-${request.id}-${supplier.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toLocaleDateString(),
          payment_terms: details.payment_terms || '',
          bill_to: details.bill_to || supplier,
          account_name: details.account_name || '',
          account_number: details.account_number || '',
          rfp_number: details.rfp_number || '',
          project_name: request.project_name,
          mr_id: request.id,
          supplier: supplier,
          status: 'pending_approval', // Sent to CEO
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
            prepared_by: request.created_by_name || request.created_by_email || '',
            prepared_by_signature: request.created_by_signature,
            checked_by: request.reviewed_by_studio_head_name || '',
            checked_by_signature: request.reviewed_by_studio_head_signature,
            approved_by: request.reviewed_by_ceo_name || '',
            approved_by_signature: request.reviewed_by_ceo_signature
          }
        };
        generatedPOs.push(po);
      });

      const newBatch = {
        id: `batch-${Date.now()}`,
        released_at: new Date().toISOString(),
        amount: Number(selectedTotalNet),
        purchase_orders: generatedPOs
      };

      batches.push(newBatch);
      localStorage.setItem('po_batches_' + request.id, JSON.stringify(batches));

      localStorage.removeItem(`po_draft_mr_${request.id}`);
      toast.success(`[Simulated] Generated ${generatedPOs.length} Purchase Order(s) and sent to CEO.`);
      setIsSubmitting(false);
      if (onApproveAndForward) onApproveAndForward();
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className={request.request_image ? "flex flex-col lg:flex-row gap-6 w-full lg:max-w-[80vw] my-8 max-h-[90vh] items-stretch justify-center" : "w-full max-w-5xl my-8 max-h-[90vh] flex flex-col"}>
        {/* PO Builder Card */}
        <div 
          className="w-full flex-1 rounded-[1.25rem] border border-[#10344d] bg-[#041e30] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
        <div className="flex items-center justify-between border-b border-[#10344d] px-6 py-5">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[#FF7120]" />
            <h2 className="text-[17px] font-bold text-white tracking-wide">Purchase Order Form Builder</h2>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#10344d] bg-[#011423] p-4 shadow-inner">
              <p className="text-[#547C97] text-[10px] uppercase font-bold tracking-widest mb-1">Project Name</p>
              <p className="text-white font-bold text-sm truncate uppercase">{request.project_name || 'N/A'}</p>
            </div>
            <div className="rounded-xl border border-[#10344d] bg-[#011423] p-4 shadow-inner">
              <p className="text-[#547C97] text-[10px] uppercase font-bold tracking-widest mb-1">Address / Site Location</p>
              <p className="text-white/80 text-xs truncate uppercase">{request.delivery_location || '-'}</p>
            </div>
            <div className="rounded-xl border border-[#10344d] bg-[#011423] p-4 shadow-inner">
              <p className="text-[#547C97] text-[10px] uppercase font-bold tracking-widest mb-1">Total PO Net Amount</p>
              <p className="text-xl font-extrabold text-[#FF7120]">
                ₱{selectedTotalNet.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Draft restored banner */}
          {hasDraft && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-300">Draft restored</p>
                <p className="text-[11px] text-amber-400/70 mt-0.5">Your previous work for this request has been loaded. Continue editing or discard to start fresh.</p>
              </div>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/25 text-amber-400 text-[11px] font-semibold hover:bg-amber-500/10 transition"
              >
                <Trash2 className="h-3 w-3" />
                Discard
              </button>
            </div>
          )}

          {/* Workflow step hint */}
          {onApproveAndForward && !hasDraft && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#FF7120]/20 bg-[#FF7120]/[0.05] px-4 py-3">
              <AlertCircle className="h-4 w-4 text-[#FF7120]/70 shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/55 leading-relaxed">
                <span className="font-semibold text-[#FF7120]/90">Step 2 of 2:</span> Fill out and submit the PO details below. Clicking <span className="font-semibold text-white/80">"Submit PO(s) to CEO"</span> will create the purchase orders <em>and</em> forward the original request to the CEO for final approval.
              </p>
            </div>
          )}

          <form id="po-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-white/80 mb-2.5">
                1. Select Items to PO, Group by Supplier & Input Purchase Prices
              </label>
              
              <div className="rounded-xl border border-[#10344d] bg-[#011423] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: '920px' }}>
                    <thead className="bg-[#08263c] text-[#9ec3da] text-[10px] uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-4 py-3 text-center w-12">PO?</th>
                        <th className="text-left px-4 py-3">Material Description</th>
                        <th className="text-left px-4 py-3 w-44">Supplier/Vendor</th>
                        <th className="text-right px-4 py-3 w-24">Quantity</th>
                        <th className="text-center px-4 py-3 w-20">Unit</th>
                        <th className="text-right px-4 py-3 w-28">Price (₱)</th>
                        <th className="text-right px-4 py-3 w-28">Discount (₱)</th>
                        <th className="text-right px-4 py-3 w-32">Total (₱)</th>
                        <th className="px-2 py-3 text-center w-10" title="Remove row"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#10344d]/50">
                      {computedItems.map((item) => (
                        <tr key={item.id} className={`hover:bg-[#021829]/30 transition ${item.checked ? 'bg-[#FF7120]/5' : ''}`}>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={(e) => updateItemField(item.id, 'checked', e.target.checked)}
                              className="h-4 w-4 rounded border-[#10344d] bg-[#041e30] text-[#FF7120] focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              disabled={!item.checked}
                              value={item.name}
                              onChange={(e) => updateItemField(item.id, 'name', e.target.value)}
                              placeholder="Material description"
                              style={{ minWidth: '180px' }}
                              className="w-full text-xs rounded-lg border border-[#10344d] bg-[#041e30] px-2 py-1.5 text-white font-semibold outline-none focus:border-[#FF7120]/60 disabled:opacity-50"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              list="suppliers-list"
                              disabled={!item.checked}
                              value={item.supplier}
                              onChange={(e) => updateItemField(item.id, 'supplier', e.target.value)}
                              placeholder="Supplier Name"
                              style={{ minWidth: '150px' }}
                              className="w-full text-xs rounded-lg border border-[#10344d] bg-[#041e30] px-2 py-1.5 text-white outline-none focus:border-[#FF7120]/60 disabled:opacity-50"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              disabled={!item.checked}
                              value={item.qtyToFund}
                              onChange={(e) => updateItemField(item.id, 'qtyToFund', e.target.value)}
                              style={{ minWidth: '85px' }}
                              className="w-full text-xs rounded-lg border border-[#10344d] bg-[#041e30] px-2 py-1.5 text-white text-right outline-none focus:border-[#FF7120]/60 disabled:opacity-50"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="text"
                              disabled={!item.checked}
                              value={item.unit}
                              onChange={(e) => updateItemField(item.id, 'unit', e.target.value)}
                              style={{ minWidth: '70px' }}
                              className="w-full text-xs rounded-lg border border-[#10344d] bg-[#041e30] px-2 py-1.5 text-white text-center outline-none focus:border-[#FF7120]/60 disabled:opacity-50"
                              placeholder="Unit"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              disabled={!item.checked}
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
                              disabled={!item.checked}
                              value={item.discount}
                              onChange={(e) => updateItemField(item.id, 'discount', e.target.value)}
                              style={{ minWidth: '95px' }}
                              className="w-24 text-xs rounded-lg border border-[#10344d] bg-[#041e30] px-2 py-1.5 text-white text-right outline-none focus:border-[#FF7120]/60 disabled:opacity-50"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#FFBE9B]" style={{ minWidth: '110px' }}>
                            ₱{item.checked ? item.total.toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}
                          </td>
                          {/* FR2 — Delete row */}
                          <td className="px-2 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => deleteItem(item.id)}
                              title="Remove this row"
                              className="text-white/20 hover:text-red-400 transition rounded p-1 hover:bg-red-400/10"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* FR2 — Add item row button */}
                <button
                  type="button"
                  onClick={addItem}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-semibold text-[#FF7120]/60 hover:text-[#FF7120] border-t border-dashed border-[#10344d] hover:bg-[#FF7120]/5 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item Row
                </button>
              </div>
            </div>

            {/* Supplier Form parameter fields */}
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
                          <h4 className="text-xs font-extrabold text-white tracking-wide uppercase">Sourcing Details: {supplier}</h4>
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
                            <label className="block text-white/60 mb-1">Account Name</label>
                            <input
                              type="text"
                              value={details.account_name}
                              onChange={(e) => handleSupplierDetailChange(supplier, 'account_name', e.target.value)}
                              placeholder="Supplier bank name"
                              className="w-full rounded-lg border border-[#10344d] bg-[#041e30] px-3 py-2 text-white outline-none focus:border-[#FF7120]/60"
                            />
                          </div>
                          <div>
                            <label className="block text-white/60 mb-1">Account Number</label>
                            <input
                              type="text"
                              value={details.account_number}
                              onChange={(e) => handleSupplierDetailChange(supplier, 'account_number', e.target.value)}
                              placeholder="Bank Account Number"
                              className="w-full rounded-lg border border-[#10344d] bg-[#041e30] px-3 py-2 text-white outline-none focus:border-[#FF7120]/60"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-white/60 mb-1">R.F.P Number (Request for Payment)</label>
                            <input
                              type="text"
                              value={details.rfp_number}
                              onChange={(e) => handleSupplierDetailChange(supplier, 'rfp_number', e.target.value)}
                              placeholder="R.F.P Number"
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
            form="po-form"
            disabled={isSubmitting || activeSuppliers.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF7120] px-6 py-2.5 text-xs font-bold tracking-wide text-white shadow-lg shadow-[#FF7120]/20 hover:brightness-110 transition disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? 'Creating POs...' : `Submit PO(s) to CEO`}
          </button>
        </div>
      </div>

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
