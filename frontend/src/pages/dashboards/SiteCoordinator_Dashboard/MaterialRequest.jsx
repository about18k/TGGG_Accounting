import React, { useState } from "react";
import PublicNavigation from "../Public_Dashboard/PublicNavigation";
import { Package, Plus, Trash2 } from "lucide-react";

const MaterialRequest = ({ user, onNavigate }) => {
  const [formData, setFormData] = useState({
    projectName: "",
    requestDate: new Date().toISOString().split('T')[0],
    requiredDate: "",
    priority: "normal",
    deliveryLocation: "",
    notes: ""
  });

  const [materials, setMaterials] = useState([]);
  const [currentMaterial, setCurrentMaterial] = useState({
    name: "",
    category: "",
    quantity: "",
    unit: "",
    specifications: ""
  });

  const addMaterial = () => {
    if (currentMaterial.name && currentMaterial.quantity && currentMaterial.unit) {
      setMaterials([...materials, { ...currentMaterial, id: Date.now() }]);
      setCurrentMaterial({ name: "", category: "", quantity: "", unit: "", specifications: "" });
    }
  };

  const removeMaterial = (id) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ ...formData, materials });
    // API call here
  };

  const cardClass = "rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg";

  return (
    <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-[#FF7120]/20 blur-[80px]" />
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="coordinator-hub" user={user} />

      <div className="relative pt-28 px-6 pb-10">
        <div className="max-w-5xl mx-auto">
          <div className={cardClass}>
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-[#FF7120]" />
                <div>
                  <h1 className="text-2xl font-semibold text-white">Material Request Form</h1>
                  <p className="text-white/60 text-sm mt-1">Submit a request for construction materials</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Project Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Project Name</label>
                  <input
                    type="text"
                    required
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Request Date</label>
                  <input
                    type="date"
                    required
                    value={formData.requestDate}
                    onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                    className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#FF7120]/50"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Required By Date</label>
                  <input
                    type="date"
                    required
                    value={formData.requiredDate}
                    onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
                    className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#FF7120]/50"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#FF7120]/50"
                  >
                    <option value="low" className="bg-[#002a45] text-white">Low</option>
                    <option value="normal" className="bg-[#002a45] text-white">Normal</option>
                    <option value="high" className="bg-[#002a45] text-white">High</option>
                    <option value="urgent" className="bg-[#002a45] text-white">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Delivery Location</label>
                <input
                  type="text"
                  required
                  value={formData.deliveryLocation}
                  onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                  className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
                  placeholder="Site address or storage location"
                />
              </div>

              {/* Material Items */}
              <div>
                <h3 className="text-white font-medium mb-4">Material Items</h3>
                <div className="bg-[#001f35] rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={currentMaterial.name}
                      onChange={(e) => setCurrentMaterial({ ...currentMaterial, name: e.target.value })}
                      placeholder="Material Name"
                      className="bg-[#001f35] border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
                    />
                    <select
                      value={currentMaterial.category}
                      onChange={(e) => setCurrentMaterial({ ...currentMaterial, category: e.target.value })}
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="number"
                      value={currentMaterial.quantity}
                      onChange={(e) => setCurrentMaterial({ ...currentMaterial, quantity: e.target.value })}
                      placeholder="Quantity"
                      className="bg-[#001f35] border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
                    />
                    <select
                      value={currentMaterial.unit}
                      onChange={(e) => setCurrentMaterial({ ...currentMaterial, unit: e.target.value })}
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
                      type="text"
                      value={currentMaterial.specifications}
                      onChange={(e) => setCurrentMaterial({ ...currentMaterial, specifications: e.target.value })}
                      placeholder="Specifications"
                      className="bg-[#001f35] border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addMaterial}
                    className="flex items-center gap-2 px-4 py-2 bg-[#FF7120] text-white rounded-lg text-sm font-medium hover:brightness-95 transition"
                  >
                    <Plus className="h-4 w-4" />
                    Add Material
                  </button>
                </div>

                {/* Materials List */}
                {materials.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {materials.map((material) => (
                      <div key={material.id} className="bg-[#001f35] rounded-lg p-4 flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-white font-medium">{material.name}</h4>
                            <span className="text-xs px-2 py-1 bg-[#FF7120]/20 text-[#FF7120] rounded">{material.category}</span>
                          </div>
                          <p className="text-white/60 text-sm mt-1">
                            Quantity: {material.quantity} {material.unit}
                            {material.specifications && ` • ${material.specifications}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMaterial(material.id)}
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-white font-medium mb-2">Additional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50 resize-none"
                  placeholder="Any special instructions or requirements..."
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="px-6 py-3 border border-white/20 text-white rounded-lg font-medium hover:bg-[#001f35] transition"
                >
                  Save as Draft
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#FF7120] text-white rounded-lg font-medium hover:brightness-95 transition"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialRequest;
