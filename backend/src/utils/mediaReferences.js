import Media from '../models/Media.js';

export const resolveMediaIds = async (ids, businessId, fieldName = 'media') => {
  if (!Array.isArray(ids)) {
    const error = new Error(`${fieldName} must be an array`);
    error.statusCode = 400;
    throw error;
  }

  const uniqueIds = [...new Set(ids.map((id) => String(id)))];
  const invalid = uniqueIds.find((id) => !/^[0-9a-fA-F]{24}$/.test(id));
  if (invalid) {
    const error = new Error(`Invalid ${fieldName} id`);
    error.statusCode = 400;
    throw error;
  }

  const media = await Media.find({
    _id: { $in: uniqueIds },
    businessId,
    isActive: true,
  }).select('_id');

  if (media.length !== uniqueIds.length) {
    const error = new Error(`${fieldName} contains unavailable media`);
    error.statusCode = 400;
    throw error;
  }

  return media.map((item) => item._id);
};

export const resolveSingleMediaId = async (id, businessId, fieldName = 'media') => {
  if (id === null || id === undefined || id === '') return null;
  if (!/^[0-9a-fA-F]{24}$/.test(String(id))) {
    const error = new Error(`Invalid ${fieldName} id`);
    error.statusCode = 400;
    throw error;
  }

  const media = await Media.findOne({
    _id: id,
    businessId,
    isActive: true,
  }).select('_id');

  if (!media) {
    const error = new Error(`${fieldName} not found`);
    error.statusCode = 400;
    throw error;
  }

  return media._id;
};
