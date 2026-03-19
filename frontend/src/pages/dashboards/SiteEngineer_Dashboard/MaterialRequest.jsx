import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Package,
  Plus,
  RefreshCcw,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import materialRequestService from '../../../services/materialRequestService';
import MaterialRequestCommentThread from '../../../components/MaterialRequestCommentThread';

const DEFAULT_FORM = {
  projectName: '',
  requestDate: new Date().toISOString().split('T')[0],
  requiredDate: '',
  priority: 'normal',
  deliveryLocation: '',
  notes: '',
};

const DEFAULT_MATERIAL = {
  name: '',
  category: '',
  quantity: '',
  unit: '',
  specifications: '',
};

const STATUS_META = {
  draft: {
    label: 'Draft',
    className: 'bg-white/5 text-white/70 border-white/10',
  },
  pending_studio_head: {
    label: 'Pending Studio Head Review',
    className: 'bg-blue-500/10 text-blue-200 border-blue-500/20',
  },
  pending_ceo: {
    label: 'Forwarded to CEO',
    className: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/20',
  },
  approved: {
    label: 'Approved by CEO',
    className: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-500/10 text-red-200 border-red-500/20',
  },
};

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

const getRequestStage = (request) => {
  if (!request) return 'draft';

  if (request.status === 'approved') return 'approved';
  if (request.status === 'rejected') return 'rejected';
  if (request.status === 'pending_review' && request.reviewed_by_studio_head) return 'pending_ceo';
  if (request.status === 'pending_review') return 'pending_studio_head';
  return 'draft';
};

const isStudioHeadRejected = (request) => {
  return (
    request?.status === 'rejected'
    && Boolean(request?.reviewed_by_studio_head)
    && !request?.reviewed_by_ceo
  );
};

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const MaterialRequest = ({ user }) => {
  const [activeTab, setActiveTab] = useState('create');
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [materials, setMaterials] = useState([]);
  const [currentMaterial, setCurrentMaterial] = useState(DEFAULT_MATERIAL);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionRequestId, setActionRequestId] = useState(null);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [editingRejectedRequest, setEditingRejectedRequest] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const counts = useMemo(() => {
    return requests.reduce((acc, request) => {
      const stage = getRequestStage(request);
      acc.total += 1;

      if (stage === 'pending_studio_head') {
        acc.pendingStudioHead += 1;
      }

      if (stage === 'pending_ceo') {
        acc.pendingCeo += 1;
      }

      if (stage === 'approved') {
        acc.approved += 1;
      }

      if (stage === 'rejected') {
        acc.rejected += 1;
      }

      return acc;
    }, {
      total: 0,
      pendingStudioHead: 0,
      pendingCeo: 0,
      approved: 0,
      rejected: 0,
    });
  }, [requests]);

  useEffect(() => {
    setEditingRequestId(null);
    setEditingRejectedRequest(false);
    setFormData(DEFAULT_FORM);
    setMaterials([]);
    setCurrentMaterial(DEFAULT_MATERIAL);
    setRequests([]);
    fetchRequests();
  }, [user?.id, user?.role]);

  const setFlash = (type, text) => {
    setMessage({ type, text });
  };

  const fetchRequests = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    const result = await materialRequestService.getMaterialRequests();

    if (result.success) {
      const fetched = Array.isArray(result.data) ? result.data : (result.data?.results || []);
      setRequests(fetched);
      if (!silent) {
        setFlash('', '');
      }
    } else {
      setFlash('error', result.error);
    }

    if (!silent) {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setMaterials([]);
    setCurrentMaterial(DEFAULT_MATERIAL);
    setEditingRequestId(null);
    setEditingRejectedRequest(false);
  };

  const startEditingRequest = (request) => {
    if (!request?.id) return;

    const mappedItems = (request.items || []).map((item, index) => ({
      id: item.id ?? `${request.id}-${index}`,
      name: item.name || '',
      category: item.category || '',
      quantity: item.quantity != null ? String(item.quantity) : '',
      unit: item.unit || '',
      specifications: item.specifications || '',
    }));

    setFormData({
      projectName: request.project_name || '',
      requestDate: request.request_date || DEFAULT_FORM.requestDate,
      requiredDate: request.required_date || '',
      priority: request.priority || 'normal',
      deliveryLocation: request.delivery_location || '',
      notes: request.notes || '',
    });
    setMaterials(mappedItems);
    setCurrentMaterial(DEFAULT_MATERIAL);
    setEditingRequestId(request.id);
    setEditingRejectedRequest(isStudioHeadRejected(request));
    setActiveTab('create');
    setFlash('success', isStudioHeadRejected(request)
      ? 'Editing Studio Head-rejected request. Save changes and resubmit when ready.'
      : 'Editing draft request.');
  };

  const upsertRequest = (request) => {
    if (!request?.id) return;
    setRequests((current) => [request, ...current.filter((item) => item.id !== request.id)]);
  };

  const addMaterial = () => {
    if (!currentMaterial.name.trim() || !currentMaterial.quantity || !currentMaterial.unit.trim()) {
      setFlash('error', 'Add a material name, quantity, and unit before adding to the list.');
      return;
    }

    const nextMaterial = {
      ...currentMaterial,
      id: Date.now(),
      name: currentMaterial.name.trim(),
      category: currentMaterial.category.trim(),
      quantity: String(currentMaterial.quantity).trim(),
      unit: currentMaterial.unit.trim(),
      specifications: currentMaterial.specifications.trim(),
    };

    setMaterials((current) => [...current, nextMaterial]);
    setCurrentMaterial(DEFAULT_MATERIAL);
    setFlash('', '');
  };

  const removeMaterial = (id) => {
    setMaterials((current) => current.filter((item) => item.id !== id));
  };

  const buildPayload = () => {
    return {
      project_name: formData.projectName.trim(),
      request_date: formData.requestDate,
      required_date: formData.requiredDate,
      priority: formData.priority,
      delivery_location: formData.deliveryLocation.trim(),
      notes: formData.notes.trim(),
      items: materials.map((material, index) => ({
        name: material.name,
        category: material.category,
        quantity: material.quantity,
        unit: material.unit,
        specifications: material.specifications,
        sort_order: index,
      })),
    };
  };

  const validateBeforeSave = () => {
    if (!formData.projectName.trim()) {
      setFlash('error', 'Project name is required.');
      return false;
    }

    if (!formData.requestDate || !formData.requiredDate) {
      setFlash('error', 'Request and required dates are required.');
      return false;
    }

    if (formData.requiredDate < formData.requestDate) {
      setFlash('error', 'Required date cannot be earlier than request date.');
      return false;
    }

    if (!formData.deliveryLocation.trim()) {
      setFlash('error', 'Delivery location is required.');
      return false;
    }

    if (!materials.length) {
      setFlash('error', 'Add at least one material item before saving.');
      return false;
    }

    return true;
  };

  const saveDraft = async () => {
    if (!validateBeforeSave()) {
      return;
    }

    if (editingRequestId) {
      setSaving(true);
      const updateResult = await materialRequestService.updateMaterialRequest(editingRequestId, buildPayload());

      if (updateResult.success) {
        upsertRequest(updateResult.data);
        resetForm();
        setActiveTab('manage');
        setFlash('success', 'Material request changes saved.');
        await fetchRequests({ silent: true });
      } else {
        setFlash('error', updateResult.error);
      }

      setSaving(false);
      return;
    }

    setSaving(true);
    const result = await materialRequestService.createMaterialRequest(buildPayload());

    if (result.success) {
      upsertRequest(result.data);
      resetForm();
      setActiveTab('manage');
      setFlash('success', 'Material request saved as draft. Submit it from Manage Requests when ready.');
    } else {
      setFlash('error', result.error);
    }

    setSaving(false);
  };

  const createAndSubmit = async (event) => {
    event.preventDefault();

    if (!validateBeforeSave()) {
      return;
    }

    if (editingRequestId) {
      setSaving(true);

      const updateResult = await materialRequestService.updateMaterialRequest(editingRequestId, buildPayload());
      if (!updateResult.success) {
        setFlash('error', updateResult.error);
        setSaving(false);
        return;
      }

      const submitResult = await materialRequestService.submitMaterialRequest(editingRequestId);
      if (submitResult.success) {
        upsertRequest(submitResult.data);
        resetForm();
        setActiveTab('manage');
        setFlash(
          'success',
          editingRejectedRequest
            ? 'Material request updated and resubmitted to Studio Head.'
            : 'Material request updated and submitted to Studio Head.',
        );
      } else {
        upsertRequest(updateResult.data);
        setActiveTab('manage');
        resetForm();
        setFlash('error', `Changes saved, but submit failed: ${submitResult.error}`);
      }

      await fetchRequests({ silent: true });
      setSaving(false);
      return;
    }

    setSaving(true);
    const createResult = await materialRequestService.createMaterialRequest(buildPayload());

    if (!createResult.success) {
      setFlash('error', createResult.error);
      setSaving(false);
      return;
    }

    const created = createResult.data;
    const submitResult = await materialRequestService.submitMaterialRequest(created.id);

    if (submitResult.success) {
      upsertRequest(submitResult.data);
      resetForm();
      setActiveTab('manage');
      setFlash('success', 'Material request submitted to Studio Head for review.');
    } else {
      upsertRequest(created);
      setActiveTab('manage');
      setFlash('error', `Draft created, but submit failed: ${submitResult.error}`);
    }

    setSaving(false);
  };

  const submitExistingRequest = async (request) => {
    const requestId = request.id;
    setActionRequestId(requestId);
    const result = await materialRequestService.submitMaterialRequest(requestId);

    if (result.success) {
      upsertRequest(result.data);
      setFlash(
        'success',
        isStudioHeadRejected(request)
          ? 'Material request resubmitted to Studio Head.'
          : 'Material request submitted to Studio Head.',
      );
    } else {
      setFlash('error', result.error);
    }

    setActionRequestId(null);
  };

  const deleteDraft = async (requestId) => {
    const confirmed = window.confirm('Delete this draft material request?');
    if (!confirmed) {
      return;
    }

    setActionRequestId(requestId);
    const result = await materialRequestService.deleteMaterialRequest(requestId);

    if (result.success) {
      setRequests((current) => current.filter((request) => request.id !== requestId));
      setFlash('success', 'Draft deleted.');
    } else {
      setFlash('error', result.error);
    }

    setActionRequestId(null);
  };

  return (
    <div className={cardClass}>
      <div className="p-6 border-b border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-[#FF7120]" />
            <div>
              <h1 className="text-2xl font-semibold text-white">Material Request Workflow</h1>
              <p className="text-white/60 text-sm mt-1">Create as draft, submit to Studio Head, then wait for CEO final approval.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchRequests()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-white/50">Total</p>
            <p className="text-xl font-semibold text-white mt-1">{counts.total}</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
            <p className="text-xs text-blue-200/80">Studio Head Queue</p>
            <p className="text-xl font-semibold text-blue-100 mt-1">{counts.pendingStudioHead}</p>
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
            <p className="text-xs text-cyan-200/80">CEO Queue</p>
            <p className="text-xl font-semibold text-cyan-100 mt-1">{counts.pendingCeo}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <p className="text-xs text-emerald-200/80">Approved</p>
            <p className="text-xl font-semibold text-emerald-100 mt-1">{counts.approved}</p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-xs text-red-200/80">Rejected</p>
            <p className="text-xl font-semibold text-red-100 mt-1">{counts.rejected}</p>
          </div>
        </div>

        {message.text && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${message.type === 'error'
            ? 'border-red-500/25 bg-red-500/10 text-red-200'
            : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
            }`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="p-6 border-b border-white/10">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === 'create' ? 'bg-[#FF7120] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
          >
            Create Request
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === 'manage' ? 'bg-[#FF7120] text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
          >
            Manage Requests
          </button>
        </div>
      </div>

      {activeTab === 'create' && (
        <form onSubmit={createAndSubmit} className="p-6 space-y-6">
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
              <label className="block text-white font-medium mb-2">Project Name</label>
              <input
                type="text"
                required
                value={formData.projectName}
                onChange={(event) => setFormData((current) => ({ ...current, projectName: event.target.value }))}
                className="w-full bg-[#001f35] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
                placeholder="Enter project name"
              />
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                        Quantity: {material.quantity} {material.unit}
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
      )}

      {activeTab === 'manage' && (
        <div className="p-6">
          {loading && (
            <p className="text-center text-white/60 py-8">Loading material requests...</p>
          )}

          {!loading && requests.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center">
              <p className="text-white/70 font-medium">No material requests yet.</p>
              <p className="text-white/45 text-sm mt-1">Create a request and submit it to start the Studio Head → CEO approval chain.</p>
            </div>
          )}

          {!loading && requests.length > 0 && (
            <div className="space-y-4">
              {requests.map((request) => {
                const stage = getRequestStage(request);
                const statusMeta = STATUS_META[stage] || STATUS_META.draft;
                const rejectedByStudioHead = isStudioHeadRejected(request);
                const canSubmit = request.status === 'draft' || rejectedByStudioHead;
                const canEdit = request.status === 'draft' || rejectedByStudioHead;
                const canDelete = request.status === 'draft';

                return (
                  <div key={request.id} className="rounded-2xl border border-white/10 bg-[#00273C]/45 p-5 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{request.project_name}</h3>
                        <p className="text-xs text-white/50 mt-1">
                          Requested {formatDate(request.request_date)} · Required {formatDate(request.required_date)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-white/45 text-xs">Priority</p>
                        <p className="text-white mt-1 capitalize">{request.priority}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-white/45 text-xs">Delivery Location</p>
                        <p className="text-white mt-1">{request.delivery_location}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-white/45 text-xs">Materials</p>
                      <p className="text-white mt-1">{request.item_count || request.items?.length || 0} item(s)</p>
                      {Array.isArray(request.items) && request.items.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {request.items.slice(0, 6).map((item) => (
                            <span key={item.id} className="text-xs px-2 py-1 rounded-lg bg-white/10 text-white/80 border border-white/10">
                              {item.name} ({item.quantity} {item.unit})
                            </span>
                          ))}
                          {request.items.length > 6 && (
                            <span className="text-xs px-2 py-1 rounded-lg bg-white/10 text-white/70 border border-white/10">
                              +{request.items.length - 6} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {request.studio_head_comments && (
                      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-200/70">Studio Head Note</p>
                        <p className="text-sm text-cyan-100 mt-1">{request.studio_head_comments}</p>
                      </div>
                    )}

                    {request.ceo_comments && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-200/70">CEO Note</p>
                        <p className="text-sm text-emerald-100 mt-1">{request.ceo_comments}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => startEditingRequest(request)}
                          disabled={actionRequestId === request.id}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-400/35 text-cyan-100 text-sm font-medium hover:bg-cyan-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {rejectedByStudioHead ? 'Edit Rejected Request' : 'Edit Draft'}
                        </button>
                      )}

                      {canSubmit && (
                        <button
                          type="button"
                          onClick={() => submitExistingRequest(request)}
                          disabled={actionRequestId === request.id}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF7120] text-white text-sm font-medium hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="h-4 w-4" />
                          {actionRequestId === request.id
                            ? 'Submitting...'
                            : (rejectedByStudioHead ? 'Resubmit to Studio Head' : 'Submit to Studio Head')}
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => deleteDraft(request.id)}
                          disabled={actionRequestId === request.id}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-400/35 text-red-200 text-sm font-medium hover:bg-red-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Draft
                        </button>
                      )}

                      {stage === 'pending_studio_head' && (
                        <span className="inline-flex items-center gap-2 text-blue-200 text-sm">
                          <Clock3 className="h-4 w-4" />
                          Waiting for Studio Head review.
                        </span>
                      )}

                      {stage === 'pending_ceo' && (
                        <span className="inline-flex items-center gap-2 text-cyan-200 text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          Passed Studio Head and now waiting for CEO final decision.
                        </span>
                      )}

                      {stage === 'approved' && (
                        <span className="inline-flex items-center gap-2 text-emerald-200 text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          Approved by CEO.
                        </span>
                      )}

                      {stage === 'rejected' && (
                        <div className="inline-flex items-center gap-2 text-red-200 text-sm">
                          <XCircle className="h-4 w-4" />
                          {rejectedByStudioHead
                            ? 'Rejected by Studio Head. Revise and resubmit.'
                            : 'Rejected by CEO. Final decision reached.'}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <MaterialRequestCommentThread requestId={request.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MaterialRequest;
