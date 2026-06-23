import React, { useState, useEffect } from 'react';
import { Package, Send, Plus, Upload, X, RefreshCcw, Trash2, CheckCircle2, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

const TODAY_ISO = new Date().toISOString().split('T')[0];

const MaterialRequestForm = ({
  createAndSubmit,
  editingRequestId,
  editingRejectedRequest,
  selectedProjectForRequest,
  handleProjectSelectionForRequest,
  projects,
  formData,
  setFormData,
  currentMaterial,
  setCurrentMaterial,
  addMaterial,
  materials,
  removeMaterial,
  imagePreview,
  imagePreviewFailed,
  setImagePreviewFailed,
  handleImageChange,
  removeImage,
  resetForm,
  saveDraft,
  saving,
  cardClass
}) => {
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

  // Reset image manipulation state when the uploaded image preview changes
  useEffect(() => {
    setImgScale(1);
    setImgRotation(0);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, [imagePreview]);

  return (
    <div className={imagePreview ? "flex flex-col lg:flex-row gap-6 w-full lg:max-w-[80vw] mx-auto items-stretch justify-center" : "w-full mx-auto flex flex-col"}>
      <form onSubmit={createAndSubmit} className={`${cardClass} p-6 space-y-6 flex-1`}>
      {editingRequestId && (
        <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-4">
          <p className="text-sm font-semibold text-cyan-100">
            {editingRejectedRequest ? 'Revising Studio Head-rejected request' : 'Editing draft request'}
          </p>
          <p className="text-xs text-cyan-200/80 mt-1">
            Update the details, then save your changes or submit to Studio Head.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-white font-medium mb-2">Project</label>
          <select
            required
            value={selectedProjectForRequest?.id || ''}
            onChange={(event) => {
              const proj = projects.find((p) => p.id === Number(event.target.value));
              handleProjectSelectionForRequest(proj || null);
            }}
            className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#FF7120]/50"
          >
            <option value="" className="bg-[#002a45] text-white/40">Select a project...</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id} className="bg-[#002a45] text-white">{proj.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-white font-medium mb-2">Priority</label>
          <select
            value={formData.priority}
            onChange={(event) => setFormData((current) => ({ ...current, priority: event.target.value }))}
            className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#FF7120]/50"
          >
            <option value="low" className="bg-[#002a45] text-white">Low</option>
            <option value="normal" className="bg-[#002a45] text-white">Normal</option>
            <option value="high" className="bg-[#002a45] text-white">High</option>
            <option value="urgent" className="bg-[#002a45] text-white">Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-white font-medium mb-2">Request Date</label>
          <input
            type="date"
            required
            value={formData.requestDate}
            onChange={(event) => setFormData((current) => ({ ...current, requestDate: event.target.value }))}
            min={TODAY_ISO}
            max={TODAY_ISO}
            readOnly
            className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#FF7120]/50"
          />
        </div>

        <div>
          <label className="block text-white font-medium mb-2">Required Date</label>
          <input
            type="date"
            required
            value={formData.requiredDate}
            onChange={(event) => setFormData((current) => ({ ...current, requiredDate: event.target.value }))}
            className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#FF7120]/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-white font-medium mb-2">Delivery Location</label>
        <input
          type="text"
          required
          value={formData.deliveryLocation}
          onChange={(event) => setFormData((current) => ({ ...current, deliveryLocation: event.target.value }))}
          className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
          placeholder="Site address or storage location"
        />
      </div>

      <div>
        <h3 className="text-white font-medium mb-4">Material Items</h3>
        <div className="bg-[#001f35] rounded-lg p-4 space-y-3 border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={currentMaterial.name}
              onChange={(event) => setCurrentMaterial((current) => ({ ...current, name: event.target.value }))}
              placeholder="Material Name"
              className="md:col-span-1 bg-[#001f35] border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={currentMaterial.quantity}
              onChange={(event) => setCurrentMaterial((current) => ({ ...current, quantity: event.target.value }))}
              placeholder="Quantity"
              className="bg-[#001f35] border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
            />
            <select
              value={currentMaterial.unit}
              onChange={(event) => setCurrentMaterial((current) => ({ ...current, unit: event.target.value }))}
              className="bg-[#001f35] border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-[#FF7120]/50"
            >
              <option value="" className="bg-[#002a45] text-white/40">Unit</option>
              <option value="pcs" className="bg-[#002a45] text-white">Pieces</option>
              <option value="set" className="bg-[#002a45] text-white">Set</option>
              <option value="sheets" className="bg-[#002a45] text-white">Sheets</option>
              <option value="bags" className="bg-[#002a45] text-white">Bags</option>
              <option value="m3" className="bg-[#002a45] text-white">Cubic Meters</option>
              <option value="kg" className="bg-[#002a45] text-white">Kilograms</option>
              <option value="tons" className="bg-[#002a45] text-white">Tons</option>
              <option value="meters" className="bg-[#002a45] text-white">Meters</option>
              <option value="liters" className="bg-[#002a45] text-white">Liters</option>
            </select>
          </div>

          <button
            type="button"
            onClick={addMaterial}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF7120] text-white rounded-lg text-sm font-medium hover:brightness-95 transition"
          >
            <Plus className="h-4 w-4" />
            Add Material
          </button>
        </div>

        {materials.length > 0 && (
          <div className="mt-4 space-y-2">
            {materials.map((material) => (
              <div key={material.id} className="bg-[#001f35] rounded-lg p-4 border border-white/10 flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium">{material.name}</h4>
                  <p className="text-white/60 text-sm mt-1">
                    Quantity: {material.quantity} {material.unit}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeMaterial(material.id)}
                  className="text-red-300 hover:text-red-200 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-white font-medium mb-2">Request Image (Optional if items are listed)</label>
        <div className="bg-[#001f35] border border-white/10 rounded-lg p-6 flex flex-col items-center">
          {!imagePreview ? (
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-[#FF7120]" />
              </div>
              <p className="text-white font-medium">Upload high-quality photo of materials</p>
              <p className="text-white/40 text-xs mt-1 mb-4 text-center">
                Ensure the handwritten list or material items are clearly readable.<br />
                Min size: 200KB. Max size: 5MB.
              </p>
              <label className="cursor-pointer bg-[#FF7120] hover:brightness-95 text-white px-6 py-2 rounded-lg font-medium transition active:scale-95">
                Browse Files
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="text-white font-semibold text-sm">Image Uploaded Successfully</p>
              <p className="text-white/50 text-xs mt-1">You can review and manipulate the uploaded sheet on the right panel.</p>
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={removeImage}
                  className="px-4 py-2 border border-red-500/30 text-red-200 rounded-lg text-xs font-semibold hover:bg-red-500/15 transition flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
                <label className="px-4 py-2 bg-[#FF7120] text-white rounded-lg text-xs font-semibold hover:brightness-95 transition cursor-pointer flex items-center gap-1.5">
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Replace
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-white font-medium mb-2">Additional Notes</label>
        <textarea
          value={formData.notes}
          onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
          rows={4}
          className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50 resize-none"
          placeholder="Any special instructions or requirements..."
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        {editingRequestId && (
          <button
            type="button"
            onClick={resetForm}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white rounded-lg font-medium hover:bg-[#001f35] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel Editing
          </button>
        )}
        <button
          type="button"
          onClick={saveDraft}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white rounded-lg font-medium hover:bg-[#001f35] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Package className="h-4 w-4" />
          {editingRequestId ? 'Save Changes' : 'Save as Draft'}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF7120] text-white rounded-lg font-medium hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
          {saving
            ? (editingRejectedRequest ? 'Resubmitting...' : 'Submitting...')
            : (editingRequestId
              ? (editingRejectedRequest ? 'Save and Resubmit to Studio Head' : 'Save and Submit to Studio Head')
              : 'Save and Submit to Studio Head')}
        </button>
      </div>
      </form>

      {/* Reference Image Card */}
      {imagePreview && (
        <div 
          className="w-full lg:flex-1 rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h3 className="text-sm font-bold text-white tracking-wide">MR Reference Image</h3>
            <div className="flex items-center gap-1 bg-[#001f35] px-2 py-1 rounded-lg border border-white/10">
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
                <RefreshCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center items-center overflow-hidden bg-[#011423] relative min-h-[350px]">
            <div 
              className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img 
                src={imagePreview} 
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
              href={imagePreview} 
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
  );
};

export default MaterialRequestForm;
