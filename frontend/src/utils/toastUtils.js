import { toast as sonnerToast } from 'sonner';

const TOAST_PATCH_FLAG = '__tggg_toast_consistency_patched__';

const DEFAULT_TITLES = {
  success: 'Success',
  error: 'Error',
  info: 'Info',
  warning: 'Notice',
};

const normalizeToastArgs = (variant, titleOrMessage, options) => {
  if (options && typeof options === 'object') {
    return [titleOrMessage, options];
  }

  if (typeof options === 'string') {
    return [titleOrMessage, { description: options }];
  }

  if (typeof titleOrMessage === 'string') {
    return [DEFAULT_TITLES[variant], { description: titleOrMessage }];
  }

  return [titleOrMessage, options];
};

export const configureToastConsistency = () => {
  if (globalThis[TOAST_PATCH_FLAG]) {
    return;
  }

  const original = {
    success: sonnerToast.success.bind(sonnerToast),
    error: sonnerToast.error.bind(sonnerToast),
    info: sonnerToast.info.bind(sonnerToast),
    warning: sonnerToast.warning.bind(sonnerToast),
  };

  sonnerToast.success = (titleOrMessage, options) => {
    const [title, normalizedOptions] = normalizeToastArgs('success', titleOrMessage, options);
    return original.success(title, normalizedOptions);
  };

  sonnerToast.error = (titleOrMessage, options) => {
    const [title, normalizedOptions] = normalizeToastArgs('error', titleOrMessage, options);
    return original.error(title, normalizedOptions);
  };

  sonnerToast.info = (titleOrMessage, options) => {
    const [title, normalizedOptions] = normalizeToastArgs('info', titleOrMessage, options);
    return original.info(title, normalizedOptions);
  };

  sonnerToast.warning = (titleOrMessage, options) => {
    const [title, normalizedOptions] = normalizeToastArgs('warning', titleOrMessage, options);
    return original.warning(title, normalizedOptions);
  };

  globalThis[TOAST_PATCH_FLAG] = true;
};

export const toast = sonnerToast;

