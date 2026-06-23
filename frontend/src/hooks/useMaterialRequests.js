import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import materialRequestService from '../services/materialRequestService';

const TODAY_ISO = new Date().toISOString().split('T')[0];

const DEFAULT_FORM = {
  projectName: '',
  requestDate: TODAY_ISO,
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
  specifications: '',
};

export const getRequestStage = (request) => {
  if (!request) return 'draft';

  if (request.status === 'approved') return 'approved';
  if (request.status === 'rejected') return 'rejected';
  if (request.status === 'pending_review' && request.reviewed_by_studio_head) return 'pending_ceo';
  if (request.status === 'pending_review') return 'pending_studio_head';
  return 'draft';
};

export const isStudioHeadRejected = (request) => {
  return (
    request?.status === 'rejected' &&
    Boolean(request?.reviewed_by_studio_head) &&
    !request?.reviewed_by_ceo
  );
};

export const normalizeRequestImageUrl = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeRequestImageUrl(parsed);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (typeof value === 'object') {
    return value.public_url || value.publicUrl || value.url || null;
  }

  return null;
};

export const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function useMaterialRequests(user) {
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
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [deleteTargetRequest, setDeleteTargetRequest] = useState(null);

  // ── Project state ────────────────────────────────────────
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [loadingApproved, setLoadingApproved] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    date_started: TODAY_ISO,
    location: '',
  });
  const [savingProject, setSavingProject] = useState(false);
  const [selectedProjectForRequest, setSelectedProjectForRequest] = useState(null);

  const counts = useMemo(() => {
    return requests.reduce(
      (acc, request) => {
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
      },
      {
        total: 0,
        pendingStudioHead: 0,
        pendingCeo: 0,
        approved: 0,
        rejected: 0,
      }
    );
  }, [requests]);

  useEffect(() => {
    setEditingRequestId(null);
    setEditingRejectedRequest(false);
    setFormData(DEFAULT_FORM);
    setMaterials([]);
    setCurrentMaterial(DEFAULT_MATERIAL);
    setUploadedImage(null);
    setImagePreview(null);
    setImagePreviewFailed(false);
    setRequests([]);
    fetchRequests();
  }, [user?.id, user?.role]);

  const fetchRequests = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    const result = await materialRequestService.getMaterialRequests();

    if (result.success) {
      const fetched = Array.isArray(result.data) ? result.data : result.data?.results || [];
      setRequests(fetched);
    } else {
      toast.error(result.error);
    }

    if (!silent) setLoading(false);
  };

  const fetchProjects = async () => {
    const result = await materialRequestService.getProjects();
    if (result.success) {
      const fetched = Array.isArray(result.data) ? result.data : result.data?.results || [];
      setProjects(fetched);
    } else {
      toast.error(result.error);
    }
  };

  const fetchApprovedRequests = async (projectId) => {
    setLoadingApproved(true);
    const result = await materialRequestService.getProjectApprovedRequests(projectId);
    if (result.success) {
      setApprovedRequests(Array.isArray(result.data) ? result.data : []);
    } else {
      toast.error(result.error);
      setApprovedRequests([]);
    }
    setLoadingApproved(false);
  };

  const handleProjectSelectionForRequest = (project) => {
    setSelectedProjectForRequest(project || null);

    if (project?.location) {
      setFormData((current) => ({
        ...current,
        deliveryLocation: project.location,
      }));
    }
  };

  const handleCreateProject = async () => {
    if (!projectForm.name.trim()) {
      toast.error('Project name is required.');
      return;
    }
    if (!projectForm.date_started) {
      toast.error('Date started is required.');
      return;
    }
    if (!projectForm.location.trim()) {
      toast.error('Location is required.');
      return;
    }
    setSavingProject(true);
    const result = await materialRequestService.createProject(projectForm);
    if (result.success) {
      toast.success(`Project "${result.data.name}" created.`);
      setProjects((prev) => [result.data, ...prev]);
      setProjectForm({ name: '', date_started: TODAY_ISO, location: '' });
      setShowCreateProjectModal(false);
      handleProjectSelectionForRequest(result.data);
    } else {
      toast.error(result.error);
    }
    setSavingProject(false);
  };

  const selectProject = (project) => {
    setSelectedProjectId(project.id);
    fetchApprovedRequests(project.id);
  };

  useEffect(() => {
    fetchProjects();
  }, [user?.id]);

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setMaterials([]);
    setCurrentMaterial(DEFAULT_MATERIAL);
    setUploadedImage(null);
    setImagePreview(null);
    setImagePreviewFailed(false);
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
      requestDate: request.request_date || DEFAULT_FORM.requestDate,
      requiredDate: request.required_date || '',
      priority: request.priority || 'normal',
      deliveryLocation: request.delivery_location || '',
      notes: request.notes || '',
    });
    setMaterials(mappedItems);
    setUploadedImage(null);
    setImagePreview(normalizeRequestImageUrl(request.request_image));
    setImagePreviewFailed(false);
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
      total: (
        parseFloat(currentMaterial.quantity || 0) * parseFloat(currentMaterial.price || 0)
      ).toFixed(2),
      discount: '0.00',
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

    const minSize = 200 * 1024;
    const maxSize = 5 * 1024 * 1024;

    if (file.size < minSize) {
      toast.error('The image quality might be too low. Please upload a clearer, higher-resolution image (at least 200KB).');
      return;
    }

    if (file.size > maxSize) {
      toast.error('The image is too large. Please upload an image smaller than 5MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG).');
      return;
    }

    setUploadedImage(file);
    setImagePreviewFailed(false);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    setImagePreviewFailed(false);
  };

  const buildRequestData = () => {
    if (uploadedImage) {
      const fd = new FormData();
      fd.append('project_name', selectedProjectForRequest?.name || '');
      if (selectedProjectForRequest) fd.append('project', selectedProjectForRequest.id);
      fd.append('request_date', formData.requestDate);
      fd.append('required_date', formData.requiredDate);
      fd.append('priority', formData.priority);
      fd.append('delivery_location', formData.deliveryLocation.trim());
      fd.append('notes', formData.notes.trim());
      fd.append('request_image', uploadedImage);

      fd.append(
        'items',
        JSON.stringify(
          materials.map((m, i) => ({
            name: m.name,
            category: m.category,
            quantity: m.quantity,
            unit: m.unit,
            price: m.price || 0.0,
            discount: m.discount || 0.0,
            total: m.total || 0.0,
            specifications: m.specifications,
            sort_order: i,
          }))
        )
      );

      return fd;
    }

    const data = {
      project_name: selectedProjectForRequest?.name || '',
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
        price: material.price || 0.0,
        discount: material.discount || 0.0,
        total: material.total || 0.0,
        specifications: material.specifications,
        sort_order: index,
      })),
    };

    if (selectedProjectForRequest) {
      data.project = selectedProjectForRequest.id;
    }

    if (editingRequestId && !imagePreview) {
      data.request_image = null;
    }

    return data;
  };

  const validateBeforeSave = () => {
    if (!selectedProjectForRequest) {
      toast.error('Please select a project.');
      return false;
    }
    if (!formData.requestDate || !formData.requiredDate) {
      toast.error('Request and required dates are required.');
      return false;
    }
    if (formData.requestDate !== TODAY_ISO) {
      toast.error('Request Date must be today.');
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
    if (!validateBeforeSave()) return;

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

    if (!validateBeforeSave()) return;

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
            : 'Material request updated and submitted to Studio Head.'
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
          : 'Material request submitted to Studio Head.'
      );
    } else {
      toast.error(result.error);
    }

    setActionRequestId(null);
  };

  const deleteDraft = async (requestId) => {
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

  const openDeleteDraftConfirm = (request) => setDeleteTargetRequest(request || null);
  
  const closeDeleteDraftConfirm = () => {
    if (actionRequestId) return;
    setDeleteTargetRequest(null);
  };

  const confirmDeleteDraft = async () => {
    if (!deleteTargetRequest?.id) return;
    await deleteDraft(deleteTargetRequest.id);
    setDeleteTargetRequest(null);
  };

  return {
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    materials,
    currentMaterial,
    setCurrentMaterial,
    requests,
    loading,
    saving,
    actionRequestId,
    editingRequestId,
    editingRejectedRequest,
    imagePreview,
    imagePreviewFailed,
    deleteTargetRequest,
    projects,
    selectedProjectId,
    approvedRequests,
    loadingApproved,
    showCreateProjectModal,
    setShowCreateProjectModal,
    projectForm,
    setProjectForm,
    savingProject,
    selectedProjectForRequest,
    counts,
    selectedRequestForModal,
    setSelectedRequestForModal,
    isFormModalOpen,
    setIsFormModalOpen,
    fetchRequests,
    handleProjectSelectionForRequest,
    handleCreateProject,
    selectProject,
    resetForm,
    startEditingRequest,
    addMaterial,
    removeMaterial,
    handleImageChange,
    removeImage,
    saveDraft,
    createAndSubmit,
    submitExistingRequest,
    openDeleteDraftConfirm,
    closeDeleteDraftConfirm,
    confirmDeleteDraft,
  };
}
