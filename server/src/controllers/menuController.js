const dayjs = require('dayjs');
const cloudinary = require('../config/cloudinary');
const Menu = require('../models/Menu');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getTomorrowRange } = require('../utils/date');

const uploadImageToCloudinary = async (fileBuffer) => new Promise((resolve, reject) => {
  if (!cloudinary.config().cloud_name) {
    return resolve('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80');
  }

  const uploadStream = cloudinary.uploader.upload_stream(
    {
      folder: 'homemade/menu-items',
      resource_type: 'image'
    },
    (error, result) => {
      if (error) return reject(error);
      return resolve(result.secure_url);
    }
  );

  uploadStream.end(fileBuffer);
});

const parseMaybeJson = (value, fallback = null) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
};

const normalizeSlotValue = (slot) => String(slot || '').trim().toLowerCase();

const normalizeSlots = (slots, fallback = ['lunch', 'dinner']) => {
  if (!Array.isArray(slots)) return fallback;
  const normalized = slots.map(normalizeSlotValue).filter(Boolean);
  return normalized.length ? [...new Set(normalized)] : fallback;
};

const ensureSlotAvailability = ({ slots, totalPlates, slotAvailability }) => {
  if (slotAvailability?.length) {
    return slotAvailability.map((s) => ({
      slot: normalizeSlotValue(s.slot),
      totalPlates: Number(s.totalPlates),
      remainingPlates: Number(s.remainingPlates ?? s.totalPlates)
    }));
  }

  const split = Math.floor(totalPlates / slots.length);
  let remainder = totalPlates % slots.length;

  return slots.map((slot) => {
    const total = split + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return { slot, totalPlates: total, remainingPlates: total };
  });
};

const normalizeItems = ({ items, imageUrls, initialCursor = 0, existingItems = [] }) => {
  let cursor = initialCursor;
  const normalized = items.map((item, idx) => {
    const fallbackImage = existingItems[idx]?.image || '';
    let image = item.image || fallbackImage;

    if (!image && imageUrls[cursor]) {
      image = imageUrls[cursor];
      cursor += 1;
    }

    return {
      _id: item._id,
      name: String(item.name || '').trim(),
      description: String(item.description || '').trim(),
      image: image || ''
    };
  });

  return { normalized, cursor };
};

const normalizeAddons = ({ addons, imageUrls, initialCursor = 0, existingAddons = [] }) => {
  let cursor = initialCursor;

  const normalized = addons.map((addon, idx) => {
    const fallbackImage = existingAddons[idx]?.image || '';
    let image = addon.image || fallbackImage;

    if (!image && imageUrls[cursor]) {
      image = imageUrls[cursor];
      cursor += 1;
    }

    return {
      _id: addon._id,
      name: String(addon.name || '').trim(),
      description: String(addon.description || '').trim(),
      price: Number(addon.price || 0),
      image: image || '',
      isActive: addon.isActive !== false
    };
  });

  return { normalized, cursor };
};

const validateMenuPayload = ({ items, addons }) => {
  if (!Array.isArray(items) || !items.length) {
    throw new ApiError(400, 'At least one thali item is required');
  }

  if (items.some((item) => !item.name || !item.description || !item.image)) {
    throw new ApiError(400, 'Each thali item requires name, description, and image');
  }

  if (addons.some((addon) => !addon.name || Number.isNaN(addon.price) || addon.price < 0)) {
    throw new ApiError(400, 'Each add-on requires valid name and non-negative price');
  }
};

const getTomorrowMenu = asyncHandler(async (_req, res) => {
  const { start, end } = getTomorrowRange();

  const menu = await Menu.findOne({
    date: { $gte: start, $lte: end },
    isActive: true
  }).lean();

  if (!menu) {
    throw new ApiError(404, 'Tomorrow menu is not published yet');
  }

  res.json({ success: true, data: menu });
});

const getMenuByDate = asyncHandler(async (req, res) => {
  const date = dayjs(req.query.date);
  if (!date.isValid()) {
    throw new ApiError(400, 'Invalid date query');
  }

  const menu = await Menu.findOne({
    date: {
      $gte: date.startOf('day').toDate(),
      $lte: date.endOf('day').toDate()
    }
  }).lean();

  if (!menu) {
    throw new ApiError(404, 'Menu not found for selected date');
  }

  res.json({ success: true, data: menu });
});

const listMenus = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);

  const [menus, total] = await Promise.all([
    Menu.find()
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Menu.countDocuments()
  ]);

  res.json({
    success: true,
    data: {
      items: menus,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

const createMenu = asyncHandler(async (req, res) => {
  const date = dayjs(req.body.date);
  if (!date.isValid()) {
    throw new ApiError(400, 'Invalid menu date');
  }

  const existing = await Menu.findOne({
    date: {
      $gte: date.startOf('day').toDate(),
      $lte: date.endOf('day').toDate()
    }
  });

  if (existing) {
    throw new ApiError(409, 'Menu already exists for this date');
  }

  const rawItems = parseMaybeJson(req.body.items, []);
  const rawAddons = parseMaybeJson(req.body.addons, []);

  const files = req.files || [];
  const imageUrls = await Promise.all(files.map((file) => uploadImageToCloudinary(file.buffer)));

  const { normalized: items, cursor } = normalizeItems({
    items: rawItems,
    imageUrls,
    initialCursor: 0,
    existingItems: []
  });

  const { normalized: addons } = normalizeAddons({
    addons: rawAddons,
    imageUrls,
    initialCursor: cursor,
    existingAddons: []
  });

  validateMenuPayload({ items, addons });

  const slots = normalizeSlots(parseMaybeJson(req.body.slots, ['lunch', 'dinner']), ['lunch', 'dinner']);
  const totalPlates = Number(req.body.totalPlates);
  const slotAvailability = ensureSlotAvailability({
    slots,
    totalPlates,
    slotAvailability: parseMaybeJson(req.body.slotAvailability, null)
  });

  const totalFromSlots = slotAvailability.reduce((acc, current) => acc + current.totalPlates, 0);
  if (totalFromSlots !== totalPlates) {
    throw new ApiError(400, 'Sum of slot availability must equal total plates');
  }

  const menu = await Menu.create({
    date: date.startOf('day').toDate(),
    items,
    addons,
    platePrice: Number(req.body.platePrice),
    totalPlates,
    remainingPlates: Number(req.body.remainingPlates || totalPlates),
    cutoffTime: new Date(req.body.cutoffTime),
    slots,
    slotAvailability,
    isActive: req.body.isActive !== 'false'
  });

  res.status(201).json({ success: true, message: 'Menu created', data: menu });
});

const updateMenu = asyncHandler(async (req, res) => {
  const { menuId } = req.params;
  const menu = await Menu.findById(menuId);
  if (!menu) {
    throw new ApiError(404, 'Menu not found');
  }

  const updates = { ...req.body };
  const files = req.files || [];
  const imageUrls = await Promise.all(files.map((file) => uploadImageToCloudinary(file.buffer)));
  let cursor = 0;

  if (updates.items !== undefined) {
    const rawItems = parseMaybeJson(updates.items, menu.items);
    const normalizedItemsResult = normalizeItems({
      items: rawItems,
      imageUrls,
      initialCursor: cursor,
      existingItems: menu.items
    });
    updates.items = normalizedItemsResult.normalized;
    cursor = normalizedItemsResult.cursor;
  }

  if (updates.addons !== undefined) {
    const rawAddons = parseMaybeJson(updates.addons, menu.addons || []);
    const normalizedAddonsResult = normalizeAddons({
      addons: rawAddons,
      imageUrls,
      initialCursor: cursor,
      existingAddons: menu.addons || []
    });
    updates.addons = normalizedAddonsResult.normalized;
    cursor = normalizedAddonsResult.cursor;
  }

  if (updates.items || updates.addons) {
    validateMenuPayload({
      items: updates.items || menu.items,
      addons: updates.addons || menu.addons || []
    });
  }

  if (updates.slots) {
    updates.slots = normalizeSlots(parseMaybeJson(updates.slots, menu.slots), menu.slots);
  }

  if (updates.slotAvailability) {
    updates.slotAvailability = ensureSlotAvailability({
      slots: updates.slots || menu.slots,
      totalPlates: Number(updates.totalPlates || menu.totalPlates),
      slotAvailability: parseMaybeJson(updates.slotAvailability, menu.slotAvailability)
    });
  }

  if (updates.totalPlates !== undefined) {
    updates.totalPlates = Number(updates.totalPlates);
  }

  if (updates.platePrice !== undefined) {
    updates.platePrice = Number(updates.platePrice);
  }

  if (updates.remainingPlates !== undefined) {
    updates.remainingPlates = Number(updates.remainingPlates);
  }

  if (updates.cutoffTime !== undefined) {
    updates.cutoffTime = new Date(updates.cutoffTime);
  }

  if (updates.isActive !== undefined) {
    updates.isActive = String(updates.isActive) === 'true' || updates.isActive === true;
  }

  if (updates.totalPlates && updates.remainingPlates === undefined) {
    const sold = menu.totalPlates - menu.remainingPlates;
    updates.remainingPlates = Math.max(Number(updates.totalPlates) - sold, 0);
  }

  Object.assign(menu, updates);
  await menu.save();

  res.json({ success: true, message: 'Menu updated', data: menu });
});

const deleteMenu = asyncHandler(async (req, res) => {
  const { menuId } = req.params;
  const menu = await Menu.findByIdAndDelete(menuId);
  if (!menu) {
    throw new ApiError(404, 'Menu not found');
  }

  res.json({ success: true, message: 'Menu deleted' });
});

const toggleMenu = asyncHandler(async (req, res) => {
  const { menuId } = req.params;
  const menu = await Menu.findById(menuId);
  if (!menu) {
    throw new ApiError(404, 'Menu not found');
  }

  menu.isActive = !menu.isActive;
  await menu.save();

  res.json({ success: true, message: `Menu ${menu.isActive ? 'activated' : 'deactivated'}`, data: menu });
});

module.exports = {
  getTomorrowMenu,
  getMenuByDate,
  listMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  toggleMenu
};
