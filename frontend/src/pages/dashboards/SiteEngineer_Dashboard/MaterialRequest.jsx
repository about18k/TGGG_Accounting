import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Image as ImageIcon,
  Package,
  Plus,
  RefreshCcw,
  Send,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import materialRequestService from '../../../services/materialRequestService';
import MaterialRequestCommentThread from '../../../components/MaterialRequestCommentThread';
import MaterialRequestFormModal from '../../../components/modals/MaterialRequestFormModal';

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
  price: '',
  discount: '',
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
  const [uploadedImage, setUploadedImage] = useState(null);
  const [selectedRequestForModal, setSelectedRequestForModal] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

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
    setUploadedImage(null);
    setImagePreview(null);
    setRequests([]);
    fetchRequests();
  }, [user?.id, user?.role]);

  const fetchRequests = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    const result = await materialRequestService.getMaterialRequests();

    if (result.success) {
      const fetched = Array.isArray(result.data) ? result.data : (result.data?.results || []);
      setRequests(fetched);
    } else {
      toast.error(result.error);
    }

    if (!silent) {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setMaterials([]);
    setCurrentMaterial(DEFAULT_MATERIAL);
    setUploadedImage(null);
    setImagePreview(null);
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
      price: item.price != null ? String(item.price) : '',
      discount: item.discount != null ? String(item.discount) : '',
      total: item.total != null ? String(item.total) : '',
      specifications: item.specifications || '',
    }));

    setFormData({
      projectName: request.project_name || '',
      request_date: request.request_date || DEFAULT_FORM.requestDate,
      required_date: request.required_date || '',
      priority: request.priority || 'normal',
      delivery_location: request.delivery_location || '',
      notes: request.notes || '',
    });
    setMaterials(mappedItems);
    setUploadedImage(null);
    setImagePreview(request.request_image || null);
    setCurrentMaterial(DEFAULT_MATERIAL);
    setEditingRequestId(request.id);
    setEditingRejectedRequest(isStudioHeadRejected(request));
    setActiveTab('create');
    
    if (isStudioHeadRejected(request)) {
      toast.info('Editing Studio Head-rejected request. Save changes and resubmit when ready.');
    } else {
      toast.info('Editing draft request.');
    }
  };

  const upsertRequest = (request) => {
    if (!request?.id) return;
    setRequests((current) => [request, ...current.filter((item) => item.id !== request.id)]);
  };

  const addMaterial = () => {
    if (!currentMaterial.name.trim() || !currentMaterial.quantity || !currentMaterial.unit.trim()) {
      toast.error('Add a material name, quantity, and unit before adding to the list.');
      return;
    }

    const nextMaterial = {
      ...currentMaterial,
      id: Date.now(),
      name: currentMaterial.name.trim(),
      category: currentMaterial.category.trim(),
      quantity: String(currentMaterial.quantity).trim(),
      unit: currentMaterial.unit.trim(),
      price: currentMaterial.price ? String(currentMaterial.price).trim() : '0.00',
      discount: currentMaterial.discount ? String(currentMaterial.discount).trim() : '0.00',
      total: (
        (parseFloat(currentMaterial.quantity || 0) * parseFloat(currentMaterial.price || 0)) -
        parseFloat(currentMaterial.discount || 0)
      ).toFixed(2),
      specifications: currentMaterial.specifications.trim(),
    };

    setMaterials((current) => [...current, nextMaterial]);
    setCurrentMaterial(DEFAULT_MATERIAL);
  };

  const removeMaterial = (id) => {
    setMaterials((current) => current.filter((item) => item.id !== id));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Quality/Size validation as per plan
    const minSize = 200 * 1024; // 200KB
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (file.size < minSize) {
      toast.error('The image quality might be too low. Please upload a clearer, higher-resolution image (at least 200KB).');
      return;
    }

    if (file.size > maxSize) {
      toast.error('The image is too large. Please upload an image smaller than 5MB.');
      return;
    }

    // Verify it's an image
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG).');
      return;
    }

    setUploadedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    // If editing and we remove an existing image, we might need to track that.
    // For now, if imagePreview is just the URL from backend, clearing it means removing it.
  };

  const buildPayload = () => {
    const payload = new FormData();
    payload.append('project_name', formData.projectName.trim());
    payload.append('request_date', formData.requestDate);
    payload.append('required_date', formData.requiredDate);
    payload.append('priority', formData.priority);
    payload.append('delivery_location', formData.deliveryLocation.trim());
    payload.append('notes', formData.notes.trim());

    if (uploadedImage) {
      payload.append('request_image', uploadedImage);
    }

    // Items list as JSON string for FormData
    payload.append('items_json', JSON.stringify(materials.map((material, index) => ({
      name: material.name,
      category: material.category,
      quantity: material.quantity,
      unit: material.unit,
      price: material.price || 0.00,
      discount: material.discount || 0.00,
      total: material.total || 0.00,
      specifications: material.specifications,
      sort_order: index,
    }))));

    // We'll need to update the backend serializer or service to handle items_json if we go this route,
    // OR we can manually append each item property.
    // Actually, DRF can handle nested lists in FormData if we use the right format (e.g. items[0]name).
    // Let's use a simpler approach: if no image, send JSON. If image, send FormData.
    return payload;
  };

  const buildRequestData = () => {
    // If we have an image, we MUST use FormData
    if (uploadedImage) {
      const fd = new FormData();
      fd.append('project_name', formData.projectName.trim());
      fd.append('request_date', formData.requestDate);
      fd.append('required_date', formData.requiredDate);
      fd.append('priority', formData.priority);
      fd.append('delivery_location', formData.deliveryLocation.trim());
      fd.append('notes', formData.notes.trim());
      fd.append('request_image', uploadedImage);
      
      // Sending items as JSON string for easy backend parsing
      fd.append('items', JSON.stringify(materials.map((m, i) => ({
        name: m.name,
        category: m.category,
        quantity: m.quantity,
        unit: m.unit,
        price: m.price || 0.00,
        discount: m.discount || 0.00,
        total: m.total || 0.00,
        specifications: m.specifications,
        sort_order: i,
      }))));
      
      return fd;
    }

    // Default JSON payload
    const data = {
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
        price: material.price || 0.00,
        discount: material.discount || 0.00,
        total: material.total || 0.00,
        specifications: material.specifications,
        sort_order: index,
      })),
    };

    // If we are editing and the image was removed (preview cleared), 
    // explicitly tell the backend to clear the image field.
    if (editingRequestId && !imagePreview) {
      data.request_image = null;
    }

    return data;
  };

  const validateBeforeSave = () => {
    if (!formData.projectName.trim()) {
      toast.error('Project name is required.');
      return false;
    }

    if (!formData.requestDate || !formData.requiredDate) {
      toast.error('Request and required dates are required.');
      return false;
    }

    if (formData.requiredDate < formData.requestDate) {
      toast.error('Required date cannot be earlier than request date.');
      return false;
    }

    if (!formData.deliveryLocation.trim()) {
      toast.error('Delivery location is required.');
      return false;
    }

    if (!materials.length && !imagePreview) {
      toast.error('Add at least one material item or upload a high-quality request image.');
      return false;
    }

    return true;
  };

  const saveDraft = async () => {
    if (!validateBeforeSave()) {
      return;
    }

    const payload = buildRequestData();

    if (editingRequestId) {
      setSaving(true);
      const updateResult = await materialRequestService.updateMaterialRequest(editingRequestId, payload);

      if (updateResult.success) {
        upsertRequest(updateResult.data);
        resetForm();
        setActiveTab('manage');
        toast.success('Material request changes saved.');
        await fetchRequests({ silent: true });
      } else {
        toast.error(updateResult.error);
      }

      setSaving(false);
      return;
    }

    setSaving(true);
    const result = await materialRequestService.createMaterialRequest(payload);

    if (result.success) {
      upsertRequest(result.data);
      resetForm();
      setActiveTab('manage');
      toast.success('Material request saved as draft. Submit it from Manage Requests when ready.');
    } else {
      toast.error(result.error);
    }

    setSaving(false);
  };

  const createAndSubmit = async (event) => {
    event.preventDefault();

    if (!validateBeforeSave()) {
      return;
    }

    const payload = buildRequestData();

    if (editingRequestId) {
      setSaving(true);

      const updateResult = await materialRequestService.updateMaterialRequest(editingRequestId, payload);
      if (!updateResult.success) {
        toast.error(updateResult.error);
        setSaving(false);
        return;
      }

      const submitResult = await materialRequestService.submitMaterialRequest(editingRequestId);
      if (submitResult.success) {
        upsertRequest(submitResult.data);
        resetForm();
        setActiveTab('manage');
        toast.success(
          editingRejectedRequest
            ? 'Material request updated and resubmitted to Studio Head.'
            : 'Material request updated and submitted to Studio Head.',
        );
      } else {
        upsertRequest(updateResult.data);
        setActiveTab('manage');
        resetForm();
        toast.error(`Changes saved, but submit failed: ${submitResult.error}`);
      }

      await fetchRequests({ silent: true });
      setSaving(false);
      return;
    }

    setSaving(true);
    const createResult = await materialRequestService.createMaterialRequest(payload);

    if (!createResult.success) {
      toast.error(createResult.error);
      setSaving(false);
      return;
    }

    const created = createResult.data;
    const submitResult = await materialRequestService.submitMaterialRequest(created.id);

    if (submitResult.success) {
      upsertRequest(submitResult.data);
      resetForm();
      setActiveTab('manage');
      toast.success('Material request submitted to Studio Head for review.');
    } else {
      upsertRequest(created);
      setActiveTab('manage');
      toast.error(`Draft created, but submit failed: ${submitResult.error}`);
    }

    setSaving(false);
  };

  const submitExistingRequest = async (request) => {
    const requestId = request.id;
    setActionRequestId(requestId);
    const result = await materialRequestService.submitMaterialRequest(requestId);

    if (result.success) {
      upsertRequest(result.data);
      toast.success(
        isStudioHeadRejected(request)
          ? 'Material request resubmitted to Studio Head.'
          : 'Material request submitted to Studio Head.',
      );
    } else {
      toast.error(result.error);
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
      toast.success('Draft deleted.');
    } else {
      toast.error(result.error);
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

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-3">
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
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentMaterial.discount}
                  onChange={(event) => setCurrentMaterial((current) => ({ ...current, discount: event.target.value }))}
                  placeholder="Discount"
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
                        Quantity: {material.quantity} {material.unit} | Price: {material.price} | Discount: {material.discount} | Total: {material.total}
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
                  <img
                    src={imagePreview}
                    alt="Material Request"
                    className="w-full h-auto rounded-lg border border-white/10 shadow-lg"
                  />
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
                      <p className="text-white mt-1">
                        {request.item_count || request.items?.length || 0} item(s)
                        {request.request_image && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">Has Photo</span>}
                      </p>
                      {Array.isArray(request.items) && request.items.length > 0 ? (
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
                      ) : (
                        request.request_image && (
                          <div className="mt-2 text-xs text-white/50 italic flex items-center gap-1.5">
                            <ImageIcon className="h-3 w-3" />
                            Photo-based request (no items listed)
                          </div>
                        )
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

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequestForModal(request);
                          setIsFormModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition"
                      >
                        <FileText className="h-4 w-4" />
                        View Form
                      </button>

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
      <MaterialRequestFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        request={selectedRequestForModal}
        userRole={user?.role}
      />
    </div>
  );
};

export default MaterialRequest;
