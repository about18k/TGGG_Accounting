import React from 'react';
import { X, Printer } from 'lucide-react';

const MaterialRequestFormModal = ({ isOpen, onClose, request, userRole, inline = false }) => {
  if (!isOpen || !request) return null;

  const handlePrint = () => {
    window.print();
  };

  const isAccounting = userRole === 'accounting';

  // Fill up to 10 rows with empty items if less than 10 exist
  const displayItems = [...(request.items || [])];
  while (displayItems.length < 10) {
    displayItems.push({ id: `empty-${displayItems.length}`, name: '', quantity: '', unit: '', price: '', discount: '', total: '' });
  }

  const overallTotal = (request.items || []).reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);

  const content = (
        <div className={`bg-white text-black w-full ${inline ? 'rounded-xl overflow-hidden' : 'max-w-[1150px] min-h-[800px] my-8 shadow-2xl rounded-xl'} flex flex-col print:my-0 print:shadow-none print:rounded-none print:max-w-none print:w-full print:min-h-0 print:text-black print-container`}>
        
        {/* Header - Not printed */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-bold text-gray-800">Requisition Form Preview</h2>
          </div>
          <div className="flex items-center gap-3">
            {isAccounting && (
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF7120] text-white rounded-lg font-semibold hover:brightness-95 transition"
              >
                <Printer className="h-4 w-4" />
                Print Form
              </button>
            )}
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

        {/* Form Content - This is what gets printed */}
        <div className="px-10 pb-10 pt-0 flex-1 flex flex-col print:px-8 print:pb-8 print:pt-0">
          
          {/* Company Logo Section */}
          <div className="flex flex-col items-center justify-center mb-0">
            <img src="/formlogo.png" alt="Triple G Logo" className="h-24 w-auto object-contain mb-0 print:h-20" />
            <h2 className="text-2xl font-black text-center border-b-2 border-black pb-0.5 tracking-[0.25em] uppercase">MATERIAL REQUISITION FORM</h2>
          </div>

          <div className="space-y-1 mb-4 text-sm font-bold mt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-2 flex-1">
                <span className="whitespace-nowrap shrink-0 w-32">Project :</span>
                <div className="flex-1 border-b border-black h-5 uppercase px-2">{request.project_name}</div>
              </div>
              <div className="flex items-baseline gap-2 w-1/4">
                <span className="whitespace-nowrap shrink-0">M.R No. :</span>
                <div className="flex-1 border-b border-black h-5 px-2">{request.id}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-2 flex-1">
                <span className="whitespace-nowrap shrink-0 w-32">Project Address :</span>
                <div className="flex-1 border-b border-black h-5 uppercase px-2">{request.delivery_location}</div>
              </div>
              <div className="flex items-baseline gap-2 w-1/4">
                <span className="whitespace-nowrap shrink-0">Date :</span>
                <div className="flex-1 border-b border-black h-5 px-2">{new Date(request.request_date).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border-2 border-black text-sm">
            <thead>
              <tr className="border-b-2 border-black bg-gray-50 print:bg-white">
                <th className="border-r-2 border-black px-1 py-1 text-center w-10">No.</th>
                <th className="border-r-2 border-black px-3 py-1 text-left font-bold">Item Description</th>
                <th className="border-r-2 border-black px-1 py-1 text-center w-20 font-bold">Qty</th>
                <th className="border-r-2 border-black px-1 py-1 text-center w-24 font-bold">Price</th>
                <th className="border-r-2 border-black px-1 py-1 text-center w-24 font-bold">Discount</th>
                <th className="px-1 py-1 text-center w-28 font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, index) => (
                <tr key={item.id} className="border-b border-black h-6 leading-tight">
                  <td className="border-r-2 border-black text-center text-xs">{item.name ? index + 1 : ''}</td>
                  <td className="border-r-2 border-black px-3 font-bold uppercase text-[11px]">{item.name}</td>
                  <td className="border-r-2 border-black text-center text-xs font-bold">{item.name ? `${item.quantity} ${item.unit}` : ''}</td>
                  <td className="border-r-2 border-black text-center text-xs">{item.name ? item.price : ''}</td>
                  <td className="border-r-2 border-black text-center text-xs">{item.name ? item.discount : ''}</td>
                  <td className="text-center text-xs">{item.name ? item.total : ''}</td>
                </tr>
              ))}
              <tr className="h-10 font-bold border-t-2 border-black">
                <td colSpan={5} className="border-r-2 border-black px-4 text-right align-middle text-xs font-bold">TOTAL :</td>
                <td className="text-center text-xs">{overallTotal > 0 ? overallTotal.toFixed(2) : ''}</td>
              </tr>
            </tbody>
          </table>

          {/* Footer */}
          <div className="mt-auto pt-4 flex justify-between items-start text-sm">
            {/* Left Section: Prepared by */}
            <div className="w-1/2 flex flex-col items-start gap-1">
              <span className="font-bold">Prepared by:</span>
              <div className="pl-12 flex flex-col items-center w-80">
                {request.created_by_signature ? (
                  <div className="h-10 flex items-end mb-[-4px]">
                    <img src={request.created_by_signature} alt="Prepared by Signature" className="max-h-16 w-auto object-contain" />
                  </div>
                ) : <div className="h-10" />}
                <div className="border-b border-black w-full text-center py-0.5 font-bold">
                  {request.created_by_name || request.created_by_email || '____________________'}
                </div>
              </div>
            </div>

            {/* Right Section: Checked and Approved by */}
            <div className="flex flex-col items-start gap-8">
              {/* Checked by */}
              <div className="w-full flex flex-col items-start gap-1">
                <span className="font-bold">Checked by:</span>
                <div className="pl-12 flex flex-col items-center w-80">
                  {request.reviewed_by_studio_head_signature ? (
                    <div className="h-10 flex items-end mb-[-4px]">
                      <img src={request.reviewed_by_studio_head_signature} alt="Checked by Signature" className="max-h-16 w-auto object-contain" />
                    </div>
                  ) : <div className="h-10" />}
                  <div className="border-b border-black w-full text-center py-0.5 font-bold">
                    {request.reviewed_by_studio_head_name || '____________________'}
                  </div>
                </div>
              </div>

              {/* Approved by */}
              <div className="w-full flex flex-col items-start gap-1">
                <span className="font-bold">Approved by:</span>
                <div className="pl-12 flex flex-col items-center w-80">
                  {request.reviewed_by_ceo_signature ? (
                    <div className="h-10 flex items-end mb-[-4px]">
                      <img src={request.reviewed_by_ceo_signature} alt="Approved by Signature" className="max-h-16 w-auto object-contain" />
                    </div>
                  ) : <div className="h-10" />}
                  <div className="border-b border-black w-full text-center py-0.5 font-bold">
                    {request.reviewed_by_ceo_name || '____________________'}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
  );

  const printStyles = (
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: landscape;
            margin: 0 !important;
          }
          body, body *:not(.print-container):not(.print-container *) {
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
          .print-container {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0.75cm 1.5cm 1.5cm 1.5cm !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .print-container * {
            visibility: visible !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}} />
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
      <div className="flex items-start justify-center p-4 min-h-full print:p-0 print:block">
        {content}
      </div>
      {printStyles}
    </div>
  );
};

export default MaterialRequestFormModal;
