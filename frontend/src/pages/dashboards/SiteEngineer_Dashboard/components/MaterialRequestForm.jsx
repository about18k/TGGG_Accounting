import React from 'react';
import { Package, Send, Plus, Upload, X, RefreshCcw, Trash2 } from 'lucide-react';

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
  return (
    <form onSubmit={createAndSubmit} className={`${cardClass} p-6 space-y-6`}>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={currentMaterial.name}
              onChange={(event) => setCurrentMaterial((current) => ({ ...current, name: event.target.value }))}
              placeholder="Material Name"
              className="bg-[#001f35] border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
            />
            <select
              value={currentMaterial.category}
              onChange={(event) => setCurrentMaterial((current) => ({ ...current, category: event.target.value }))}
              className="bg-[#001f35] border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-[#FF7120]/50"
            >
              <option value="" className="bg-[#002a45] text-white/40">Select Category</option>
              <option value="cement" className="bg-[#002a45] text-white">Cement & Concrete</option>
              <option value="steel" className="bg-[#002a45] text-white">Steel & Rebar</option>
              <option value="lumber" className="bg-[#002a45] text-white">Lumber & Wood</option>
              <option value="electrical" className="bg-[#002a45] text-white">Electrical</option>
              <option value="plumbing" className="bg-[#002a45] text-white">Plumbing</option>
              <option value="tools" className="bg-[#002a45] text-white">Tools & Equipment</option>
              <option value="other" className="bg-[#002a45] text-white">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
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
              <option value="bags" className="bg-[#002a45] text-white">Bags</option>
              <option value="m3" className="bg-[#002a45] text-white">Cubic Meters</option>
              <option value="kg" className="bg-[#002a45] text-white">Kilograms</option>
              <option value="tons" className="bg-[#002a45] text-white">Tons</option>
              <option value="meters" className="bg-[#002a45] text-white">Meters</option>
              <option value="liters" className="bg-[#002a45] text-white">Liters</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={currentMaterial.price}
              onChange={(event) => setCurrentMaterial((current) => ({ ...current, price: event.target.value }))}
              placeholder="Price"
              className="bg-[#001f35] border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
            />
            <input
              type="text"
              value={currentMaterial.specifications}
              onChange={(event) => setCurrentMaterial((current) => ({ ...current, specifications: event.target.value }))}
              placeholder="Specifications"
              className="bg-[#001f35] border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
            />
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-white font-medium">{material.name}</h4>
                    {material.category && <span className="text-xs px-2 py-1 bg-[#FF7120]/20 text-[#FFBE9B] rounded">{material.category}</span>}
                  </div>
                  <p className="text-white/60 text-sm mt-1">
                    Quantity: {material.quantity} {material.unit} | Price: {material.price} | Total: {material.total}
                    {material.specifications ? ` - ${material.specifications}` : ''}
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
            <div className="relative group w-full max-w-[400px]">
              {!imagePreviewFailed ? (
                <img
                  src={imagePreview}
                  alt="Material Request"
                  className="w-full h-auto rounded-lg border border-white/10 shadow-lg"
                  onError={() => setImagePreviewFailed(true)}
                />
              ) : (
                <div className="w-full rounded-lg border border-amber-400/25 bg-amber-500/10 p-4 text-center">
                  <p className="text-sm text-amber-100 font-medium">Preview unavailable</p>
                  <p className="text-xs text-amber-200/80 mt-1">
                    Attachment exists but cannot be rendered inline.
                  </p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3 rounded-lg">
                <button
                  type="button"
                  onClick={removeImage}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                  title="Remove image"
                >
                  <X className="h-5 w-5" />
                </button>
                <label className="p-2 bg-[#FF7120] text-white rounded-full hover:brightness-95 transition cursor-pointer" title="Replace image">
                  <RefreshCcw className="h-5 w-5" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
              {imagePreview && (
                <a
                  href={imagePreview}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex mt-3 text-xs text-[#FFBE9B] hover:text-[#FFD7BF] underline"
                >
                  Open attached image
                </a>
              )}
              <p className="text-center text-white/40 text-xs mt-3">High-quality image uploaded. Verify contents are readable.</p>
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
  );
};

export default MaterialRequestForm;
