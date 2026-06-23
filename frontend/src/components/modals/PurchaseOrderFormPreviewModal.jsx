import React from 'react';
import { X, Printer } from 'lucide-react';

/**
 * Renders one or more Purchase Order forms for printing/preview.
 *
 * Props:
 *   po    – (legacy) single PO object; still accepted for backward compat
 *   pos   – array of PO objects (preferred for multi-supplier batches)
 *   isOpen, onClose, inline
 *
 * Print layout rules (FR3):
 *   1 PO  → full A4 portrait page
 *   2 POs → one A4 page split into two equal halves (dashed divider)
 *   3+ POs → pairs per printed sheet; last sheet is full-page when count is odd
 */
const PurchaseOrderFormPreviewModal = ({ isOpen, onClose, po, pos: posProp, request, userRole, inline = false }) => {
  if (!isOpen) return null;

  const allPosRaw = posProp || (po ? [po] : []);
  if (allPosRaw.length === 0) return null;

  const allPos = [];
  allPosRaw.forEach((poItem) => {
    const rawItems = poItem.items || [];
    if (rawItems.length <= 13) {
      allPos.push({
        ...poItem,
        items: rawItems,
        originalTotal: rawItems.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0),
        startIndex: 0
      });
    } else {
      const overallTotal = rawItems.reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);
      for (let i = 0; i < rawItems.length; i += 13) {
        allPos.push({
          ...poItem,
          items: rawItems.slice(i, i + 13),
          originalTotal: overallTotal,
          startIndex: i
        });
      }
    }
  });

  const handlePrint = () => {
    document.body.classList.add('print-po-active');
    window.print();
    document.body.classList.remove('print-po-active');
  };

  React.useEffect(() => {
    if (isOpen && !inline) {
      const handleBeforePrint = () => {
        document.body.classList.add('print-po-active');
      };
      const handleAfterPrint = () => {
        document.body.classList.remove('print-po-active');
      };
      window.addEventListener('beforeprint', handleBeforePrint);
      window.addEventListener('afterprint', handleAfterPrint);
      return () => {
        window.removeEventListener('beforeprint', handleBeforePrint);
        window.removeEventListener('afterprint', handleAfterPrint);
        document.body.classList.remove('print-po-active');
      };
    }
  }, [isOpen, inline]);

  const formatQuantity = (val) => {
    if (val == null || val === '') return '';
    const num = Number(val);
    return isNaN(num) ? val : num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const formatCurrency = (val) => {
    if (val == null || val === '') return '';
    const num = Number(val);
    return isNaN(num) ? val : `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const blankPOItems = Array.from({ length: 13 }, (_, i) => ({
    id: `blank-po-${i}`,
    name: '',
    quantity: '',
    unit: '',
    price: '',
    discount: '',
    total: ''
  }));

  // ── Single PO block (used as full-page or half-page half) ─────────────────
  const renderPOBlock = (poData, isBlank = false) => {
    const displayItems = isBlank ? blankPOItems : [...((poData && poData.items) || [])];
    const itemsToUse = [...displayItems];
    while (itemsToUse.length < 13) {
      itemsToUse.push({ id: `empty-${itemsToUse.length}`, name: '', quantity: '', unit: '', price: '', discount: '', total: '' });
    }
    const overallTotal = isBlank ? 0 : (poData?.originalTotal !== undefined ? poData.originalTotal : ((poData && poData.items) || []).reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0));

    const projectName = isBlank ? '' : (poData?.project_name || '-');
    const dateStr = isBlank ? '' : (poData?.date || new Date().toLocaleDateString());
    const poNumber = isBlank ? '' : (poData?.po_number || '-');
    const paymentTerms = isBlank ? '' : (poData?.payment_terms || '-');
    const acctName = isBlank ? '' : (poData?.account_name || '-');
    const mrNo = isBlank ? '' : `MR-${poData?.mr_id || poData?.mr_no || '-'}`;
    const billTo = isBlank ? '' : (poData?.bill_to || '-');
    const acctNo = isBlank ? '' : (poData?.account_number || '-');
    const rfpNo = isBlank ? '' : (poData?.rfp_number || '-');

    const preparedSig = isBlank ? null : (request?.created_by_signature || poData?.signatures?.prepared_by_signature);
    const preparedName = isBlank ? '____________________' : (request?.created_by_name || request?.created_by_email || poData?.signatures?.prepared_by || '____________________');

    const checkedSig = isBlank ? null : (request?.reviewed_by_studio_head_signature || poData?.signatures?.checked_by_signature);
    const checkedName = isBlank ? '____________________' : (request?.reviewed_by_studio_head_name || poData?.signatures?.checked_by || '____________________');

    const approvedSig = isBlank ? null : (request?.reviewed_by_ceo_signature || poData?.signatures?.approved_by_signature);
    const approvedName = isBlank ? '____________________' : (request?.reviewed_by_ceo_name || poData?.signatures?.approved_by || '____________________');

    return (
      <div className="flex-1 flex flex-col px-8 pb-3 pt-3 min-h-0 overflow-hidden">

        {/* Logo + title */}
        <div className="flex flex-col items-center justify-center mb-0">
          <img src="/formlogo.webp" alt="Triple G Logo" className="h-14 w-auto object-contain print:h-14" />
          <h2 className="text-xl font-black text-center border-b-2 border-black pb-0.5 tracking-[0.25em] uppercase">
            PURCHASE ORDER FORM
          </h2>
        </div>

        {/* Header — 3-column grid */}
        <div className="grid grid-cols-[3fr_2fr_3fr] gap-x-3 gap-y-0.5 text-[10px] font-bold mt-1 mb-1">
          {/* Row 1 */}
          <div className="flex items-baseline gap-1">
            <span className="whitespace-nowrap shrink-0">Project :</span>
            <div className="flex-1 border-b border-black h-4 uppercase px-1 truncate">{projectName}</div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="whitespace-nowrap shrink-0">Date :</span>
            <div className="flex-1 border-b border-black h-4 px-1 truncate">{dateStr}</div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="whitespace-nowrap shrink-0">P.O. No. :</span>
            <div className="flex-1 border-b border-black h-4 px-1 truncate">{poNumber}</div>
          </div>

          {/* Row 2 */}
          <div className="flex items-baseline gap-1">
            <span className="whitespace-nowrap shrink-0">Payment Terms :</span>
            <div className="flex-1 border-b border-black h-4 px-1 truncate">{paymentTerms}</div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="whitespace-nowrap shrink-0">Acct Name :</span>
            <div className="flex-1 border-b border-black h-4 px-1 truncate">{acctName}</div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="whitespace-nowrap shrink-0">M.R. No. :</span>
            <div className="flex-1 border-b border-black h-4 px-1 truncate">{mrNo}</div>
          </div>

          {/* Row 3 */}
          <div className="flex items-baseline gap-1">
            <span className="whitespace-nowrap shrink-0">Bill to :</span>
            <div className="flex-1 border-b border-black h-4 px-1 truncate">{billTo}</div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="whitespace-nowrap shrink-0">Acct No. :</span>
            <div className="flex-1 border-b border-black h-4 px-1 truncate">{acctNo}</div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="whitespace-nowrap shrink-0">R.F.P. No. :</span>
            <div className="flex-1 border-b border-black h-4 px-1 truncate">{rfpNo}</div>
          </div>
        </div>

        {/* Item table */}
        <table className="w-full border-collapse border-2 border-black text-xs">
          <thead>
            <tr className="border-b-2 border-black bg-gray-50 print:bg-white">
              <th className="border-r-2 border-black px-1 py-0.5 text-center w-8 font-bold">No.</th>
              <th className="border-r-2 border-black px-2 py-0.5 text-left font-bold">Item Description</th>
              <th className="border-r-2 border-black px-1 py-0.5 text-center w-16 font-bold">Qty</th>
              <th className="border-r-2 border-black px-1 py-0.5 text-center w-20 font-bold">Price</th>
              <th className="border-r-2 border-black px-1 py-0.5 text-center w-20 font-bold">Discount</th>
              <th className="px-1 py-0.5 text-center w-24 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {itemsToUse.map((item, index) => (
              <tr key={item.id || index} className="border-b border-black leading-tight" style={{ height: '1.1rem' }}>
                <td className="border-r-2 border-black text-center text-[10px]"></td>
                <td className="border-r-2 border-black px-2 font-bold uppercase text-[10px]">{item.name}</td>
                <td className="border-r-2 border-black text-center text-[10px] font-bold">
                  {item.name ? `${formatQuantity(item.quantity)} ${item.unit}` : ''}
                </td>
                <td className="border-r-2 border-black text-center text-[10px]">
                  {item.name ? formatCurrency(item.price) : ''}
                </td>
                <td className="border-r-2 border-black text-center text-[10px]">
                  {item.name ? formatCurrency(item.discount) : ''}
                </td>
                <td className="text-center text-[10px]">{item.name ? formatCurrency(item.total) : ''}</td>
              </tr>
            ))}
            <tr className="font-bold border-t-2 border-black" style={{ height: '1.6rem' }}>
              <td colSpan={5} className="border-r-2 border-black px-3 text-right align-middle text-xs font-bold">
                TOTAL :
              </td>
              <td className="text-center text-xs">{overallTotal > 0 ? formatCurrency(overallTotal) : ''}</td>
            </tr>
          </tbody>
        </table>

        {/* Signatures */}
        <div className="mt-auto pt-2 flex justify-between items-start text-xs shrink-0">
          {/* Prepared by */}
          <div className="w-1/2 flex flex-col items-start gap-0.5">
            <span className="font-bold text-[10px]">Prepared by:</span>
            <div className="pl-6 flex flex-col items-center w-56">
              {preparedSig ? (
                <div className="h-8 flex items-end mb-[-2px]">
                  <img src={preparedSig} alt="Prepared by Signature" className="max-h-12 w-auto object-contain" />
                </div>
              ) : <div className="h-8" />}
              <div className="border-b border-black w-full text-center py-0.5 font-bold uppercase text-[9px]">
                {preparedName}
              </div>
            </div>
          </div>

          {/* Checked by + Approved by */}
          <div className="flex flex-col items-start gap-2">
            <div className="w-full flex flex-col items-start gap-0.5">
              <span className="font-bold text-[10px]">Checked by:</span>
              <div className="pl-6 flex flex-col items-center w-56">
                {checkedSig ? (
                  <div className="h-8 flex items-end mb-[-2px]">
                    <img src={checkedSig} alt="Checked by Signature" className="max-h-12 w-auto object-contain" />
                  </div>
                ) : <div className="h-8" />}
                <div className="border-b border-black w-full text-center py-0.5 font-bold uppercase text-[9px]">
                  {checkedName}
                </div>
              </div>
            </div>

            <div className="w-full flex flex-col items-start gap-0.5">
              <span className="font-bold text-[10px]">Approved by:</span>
              <div className="pl-6 flex flex-col items-center w-56">
                {approvedSig ? (
                  <div className="h-8 flex items-end mb-[-2px]">
                    <img src={approvedSig} alt="Approved by Signature" className="max-h-12 w-auto object-contain" />
                  </div>
                ) : <div className="h-8" />}
                <div className="border-b border-black w-full text-center py-0.5 font-bold uppercase text-[9px]">
                  {approvedName}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // ── Group POs into sheets: 2 per sheet, last sheet single if odd ──────────
  const sheets = [];
  for (let i = 0; i < allPos.length; i += 2) {
    sheets.push(allPos.slice(i, Math.min(i + 2, allPos.length)));
  }

  const screenLabel = allPosRaw.length === 1
    ? `Purchase Order Preview — ${allPosRaw[0].po_number}`
    : `Purchase Orders Preview — ${allPosRaw.length} POs on ${sheets.length} sheet${sheets.length !== 1 ? 's' : ''}`;

  const printStyles = (
    <style dangerouslySetInnerHTML={{ __html: `
      @media print {
        @page { size: portrait; margin: 0 !important; }
        body.print-po-active, body.print-po-active *:not(.po-print-root):not(.po-print-root *) {
          visibility: hidden !important;
          background: white !important;
          position: static !important;
          overflow: visible !important;
          transform: none !important;
          filter: none !important;
          backdrop-filter: none !important;
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0 !important;
          min-height: 0 !important;
          max-height: none !important;
          width: auto !important;
          height: auto !important;
        }
        body.print-po-active .po-print-root {
          visibility: visible !important;
          position: absolute !important;
          top: 0 !important; left: 0 !important;
          width: 100% !important;
          margin: 0 !important; padding: 0 !important;
        }
        body.print-po-active .po-print-root * { visibility: visible !important; }
        /* Each sheet = one printed A4 page */
        body.print-po-active .print-sheet {
          page-break-after: always !important;
          height: 100vh !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0.25cm 0.8cm !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          min-height: unset !important;
          display: flex !important;
          flex-direction: column !important;
          background: white !important;
          box-shadow: none !important;
        }
        body.print-po-active .print-sheet:last-child { page-break-after: auto !important; }
        body.print-po-active .print-hidden { display: none !important; }
      }
    `}} />
  );

  const sheetsContent = (
    <div className="po-print-root">
      {sheets.map((sheetPos, sheetIdx) => {
        const hasSecond = sheetPos.length > 1;
        return (
          <div
            key={sheetIdx}
            className={`print-sheet bg-white text-black shadow-2xl print:shadow-none flex flex-col ${
              inline ? 'w-full' : 'max-w-[794px] mx-auto'
            } ${sheetIdx > 0 ? 'mt-8 print:mt-0' : ''}`}
            style={{ minHeight: '1123px' }}
          >
            {/* Top/First PO Block */}
            {renderPOBlock(sheetPos[0], false)}

            {/* Dashed divider */}
            <div className="w-[95%] mx-auto border-t-[3px] border-dashed border-gray-400 shrink-0 print:border-black" />

            {/* Bottom/Second PO Block — either actual second PO or blank template */}
            {hasSecond ? renderPOBlock(sheetPos[1], false) : renderPOBlock(null, true)}
          </div>
        );
      })}
    </div>
  );


  const content = (
    <div className="w-full min-h-full flex flex-col">
      {/* Screen header — hidden in print */}
      <div className="print-hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <Printer className="h-5 w-5 text-gray-500" />
          <h2 className="text-base font-bold text-gray-800">{screenLabel}</h2>
        </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF7120] text-white rounded-lg font-semibold hover:brightness-95 transition"
            >
              <Printer className="h-4 w-4" />
              Print {allPos.length > 1 ? `${allPos.length} POs` : 'Form'}
            </button>
          {!inline && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      {/* Sheet previews */}
      <div className="flex-1 py-8 bg-gray-100 print:bg-white print:p-0">
        {sheetsContent}
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="w-full relative">
        {content}
        {printStyles}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm overflow-y-auto scroll-smooth print:p-0 print:bg-white print:backdrop-blur-none print:block print:static">
      <div className="flex flex-col items-center min-h-full print:block">
        {content}
      </div>
      {printStyles}
    </div>
  );
};

export default PurchaseOrderFormPreviewModal;
