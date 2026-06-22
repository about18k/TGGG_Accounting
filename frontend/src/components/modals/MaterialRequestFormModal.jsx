import React from 'react';
import { X, Printer } from 'lucide-react';

/**
 * Renders the Material Requisition form for printing/preview.
 *
 * Print layout (mirrors PO mechanism):
 *   One A4 portrait page split into two equal halves (dashed divider).
 *   Top half = original copy, bottom half = duplicate copy.
 *   Preview on screen exactly matches the printed output.
 */
const MaterialRequestFormModal = ({ isOpen, onClose, request, userRole, inline = false }) => {
  if (!isOpen || !request) return null;

  const handlePrint = () => {
    document.body.classList.add('print-mr-active');
    window.print();
    document.body.classList.remove('print-mr-active');
  };

  React.useEffect(() => {
    if (isOpen && !inline) {
      const handleBeforePrint = () => {
        document.body.classList.add('print-mr-active');
      };
      const handleAfterPrint = () => {
        document.body.classList.remove('print-mr-active');
      };
      window.addEventListener('beforeprint', handleBeforePrint);
      window.addEventListener('afterprint', handleAfterPrint);
      return () => {
        window.removeEventListener('beforeprint', handleBeforePrint);
        window.removeEventListener('afterprint', handleAfterPrint);
        document.body.classList.remove('print-mr-active');
      };
    }
  }, [isOpen, inline]);

  const overallTotal = (request.items || []).reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);

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

  const blankItems = Array.from({ length: 13 }, (_, i) => ({
    id: `blank-${i}`,
    name: '',
    quantity: '',
    unit: '',
    price: '',
    discount: '',
    total: ''
  }));

  // ── Single MR block (used as a half-page portion) ─────────────────────────
  const renderMRBlock = (itemsToUse, startIndex = 0, isBlank = false) => {
    const totalToUse = isBlank ? 0 : overallTotal;

    const projectName = isBlank ? '' : request.project_name;
    const requestDate = isBlank ? '' : (request.request_date ? new Date(request.request_date).toLocaleDateString() : '');
    const mrNo = isBlank ? '' : request.id;
    const deliveryLocation = isBlank ? '' : request.delivery_location;

    const preparedBySig = isBlank ? null : request.created_by_signature;
    const preparedByName = isBlank ? '____________________' : (request.created_by_name || request.created_by_email || '____________________');

    const checkedBySig = isBlank ? null : request.reviewed_by_studio_head_signature;
    const checkedByName = isBlank ? '____________________' : (request.reviewed_by_studio_head_name || '____________________');

    const approvedBySig = isBlank ? null : request.reviewed_by_ceo_signature;
    const approvedByName = isBlank ? '____________________' : (request.reviewed_by_ceo_name || '____________________');

    return (
      <div className="flex-1 flex flex-col px-8 pb-3 pt-3 min-h-0 overflow-hidden">

        {/* Logo + title */}
        <div className="flex flex-col items-center justify-center mb-0">
          <img src="/formlogo.webp" alt="Triple G Logo" className="h-14 w-auto object-contain print:h-14" />
          <h2 className="text-xl font-black text-center border-b-2 border-black pb-0.5 tracking-[0.25em] uppercase">
            MATERIAL REQUISITION FORM
          </h2>
        </div>

        {/* Header fields — 2-column layout */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[10px] font-bold mt-1 mb-1">
          {/* Row 1 */}
          <div className="flex items-baseline gap-1">
            <span className="whitespace-nowrap shrink-0">Project :</span>
            <div className="flex-1 border-b border-black h-4 uppercase px-1 truncate">{projectName}</div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="whitespace-nowrap shrink-0">Date :</span>
            <div className="flex-1 border-b border-black h-4 px-1 truncate">{requestDate}</div>
          </div>
          
          {/* Row 2 */}
          <div className="flex items-baseline gap-1">
            <span className="whitespace-nowrap shrink-0">Project Address :</span>
            <div className="flex-1 border-b border-black h-4 uppercase px-1 truncate">{deliveryLocation}</div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="whitespace-nowrap shrink-0">M.R. No. :</span>
            <div className="flex-1 border-b border-black h-4 px-1 truncate">{mrNo}</div>
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
              <td className="text-center text-xs">{totalToUse > 0 ? formatCurrency(totalToUse) : ''}</td>
            </tr>
          </tbody>
        </table>

        {/* Signatures */}
        <div className="mt-auto pt-2 flex justify-between items-start text-xs shrink-0">
          {/* Prepared by */}
          <div className="w-1/2 flex flex-col items-start gap-0.5">
            <span className="font-bold text-[10px]">Prepared by:</span>
            <div className="pl-6 flex flex-col items-center w-56">
              {preparedBySig ? (
                <div className="h-8 flex items-end mb-[-2px]">
                  <img src={preparedBySig} alt="Prepared by Signature" className="max-h-12 w-auto object-contain" />
                </div>
              ) : <div className="h-8" />}
              <div className="border-b border-black w-full text-center py-0.5 font-bold uppercase text-[9px]">
                {preparedByName}
              </div>
            </div>
          </div>

          {/* Checked by + Approved by */}
          <div className="flex flex-col items-start gap-2">
            <div className="w-full flex flex-col items-start gap-0.5">
              <span className="font-bold text-[10px]">Checked by:</span>
              <div className="pl-6 flex flex-col items-center w-56">
                {checkedBySig ? (
                  <div className="h-8 flex items-end mb-[-2px]">
                    <img src={checkedBySig} alt="Checked by Signature" className="max-h-12 w-auto object-contain" />
                  </div>
                ) : <div className="h-8" />}
                <div className="border-b border-black w-full text-center py-0.5 font-bold uppercase text-[9px]">
                  {checkedByName}
                </div>
              </div>
            </div>

            <div className="w-full flex flex-col items-start gap-0.5">
              <span className="font-bold text-[10px]">Approved by:</span>
              <div className="pl-6 flex flex-col items-center w-56">
                {approvedBySig ? (
                  <div className="h-8 flex items-end mb-[-2px]">
                    <img src={approvedBySig} alt="Approved by Signature" className="max-h-12 w-auto object-contain" />
                  </div>
                ) : <div className="h-8" />}
                <div className="border-b border-black w-full text-center py-0.5 font-bold uppercase text-[9px]">
                  {approvedByName}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // ── Print styles — identical approach to PO form ──────────────────────────
  const printStyles = (
    <style dangerouslySetInnerHTML={{ __html: `
      @media print {
        @page { size: portrait; margin: 0 !important; }
        body.print-mr-active, body.print-mr-active *:not(.mr-print-root):not(.mr-print-root *) {
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
        body.print-mr-active .mr-print-root {
          visibility: visible !important;
          position: absolute !important;
          top: 0 !important; left: 0 !important;
          width: 100% !important;
          margin: 0 !important; padding: 0 !important;
        }
        body.print-mr-active .mr-print-root * { visibility: visible !important; }
        /* Each sheet = one printed A4 page */
        body.print-mr-active .mr-print-sheet {
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
        body.print-mr-active .mr-print-sheet:last-child { page-break-after: auto !important; }
        body.print-mr-active .mr-print-hidden { display: none !important; }
      }
    `}} />
  );

  // ── Sheet content: 2 copies of the form per A4 page ───────────────────────
  const rawItems = request.items || [];
  const itemChunks = [];
  if (rawItems.length === 0) {
    itemChunks.push([]);
  } else {
    for (let i = 0; i < rawItems.length; i += 13) {
      itemChunks.push(rawItems.slice(i, i + 13));
    }
  }

  // Group itemChunks into sheets of 2 chunks each
  const mrSheets = [];
  for (let i = 0; i < itemChunks.length; i += 2) {
    mrSheets.push(itemChunks.slice(i, Math.min(i + 2, itemChunks.length)));
  }

  const sheetContent = (
    <div className="mr-print-root">
      {mrSheets.map((sheetChunks, sheetIdx) => {
        const hasSecond = sheetChunks.length > 1;

        // Pad Top chunk to 13 rows
        const topChunk = sheetChunks[0];
        const topDisplayItems = [...topChunk];
        while (topDisplayItems.length < 13) {
          topDisplayItems.push({ id: `empty-top-${topDisplayItems.length}`, name: '', quantity: '', unit: '', price: '', discount: '', total: '' });
        }

        // Prepare Bottom chunk (either actual second chunk or blank template)
        let bottomDisplayItems;
        let bottomStartIndex = 0;
        let bottomIsBlank = false;

        if (hasSecond) {
          bottomDisplayItems = [...sheetChunks[1]];
          while (bottomDisplayItems.length < 13) {
            bottomDisplayItems.push({ id: `empty-bottom-${bottomDisplayItems.length}`, name: '', quantity: '', unit: '', price: '', discount: '', total: '' });
          }
          bottomStartIndex = (sheetIdx * 2 + 1) * 13;
          bottomIsBlank = false;
        } else {
          bottomDisplayItems = blankItems;
          bottomStartIndex = 0;
          bottomIsBlank = true;
        }

        return (
          <div
            key={sheetIdx}
            className={`mr-print-sheet bg-white text-black shadow-2xl print:shadow-none flex flex-col ${
              inline ? 'w-full' : 'max-w-[794px] mx-auto'
            } ${sheetIdx > 0 ? 'mt-8 print:mt-0' : ''}`}
            style={{ minHeight: '1123px' }}
          >
            {/* Top half — original copy (first chunk of the sheet) */}
            {renderMRBlock(topDisplayItems, (sheetIdx * 2) * 13, false)}

            {/* Dashed divider — matches PO form divider */}
            <div className="w-[95%] mx-auto border-t-[3px] border-dashed border-gray-400 shrink-0 print:border-black" />

            {/* Bottom half — either second chunk of the sheet or blank template */}
            {renderMRBlock(bottomDisplayItems, bottomStartIndex, bottomIsBlank)}
          </div>
        );
      })}
    </div>
  );

  const content = (
    <div className="w-full min-h-full flex flex-col">
      {/* Screen header — hidden in print */}
      <div className="mr-print-hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <Printer className="h-5 w-5 text-gray-500" />
          <h2 className="text-base font-bold text-gray-800">Requisition Form Preview</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF7120] text-white rounded-lg font-semibold hover:brightness-95 transition"
          >
            <Printer className="h-4 w-4" />
            Print Form
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

      {/* Sheet preview */}
      <div className="flex-1 py-8 bg-gray-100 print:bg-white print:p-0">
        {sheetContent}
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

export default MaterialRequestFormModal;
