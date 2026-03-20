import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import client from '../../api/client';
import AdminNav from '../../components/admin/AdminNav';
import { getErrorMessage } from '../../utils/http';

const newItem = () => ({ name: '', description: '', image: '', imageFile: null });
const newAddon = () => ({ name: '', description: '', price: 0, image: '', imageFile: null, isActive: true });

const toDateInput = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const toDateTimeInput = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const sanitizeAddon = (addon) => ({
  ...addon,
  name: String(addon.name || '').trim(),
  description: String(addon.description || '').trim(),
  price: Number(addon.price || 0),
  isActive: addon.isActive !== false
});

const AdminMenuPage = () => {
  const [menus, setMenus] = useState([]);
  const [items, setItems] = useState([newItem()]);
  const [addons, setAddons] = useState([]);
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [loadingMenus, setLoadingMenus] = useState(false);

  const isEditing = Boolean(editingMenuId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm({
    defaultValues: {
      slots: 'lunch,dinner',
      totalPlates: 80,
      platePrice: 129,
      date: '',
      cutoffTime: ''
    }
  });

  const loadMenus = async () => {
    setLoadingMenus(true);
    try {
      const { data } = await client.get('/menus/admin/list');
      setMenus(data.data.items || []);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load menus'));
    } finally {
      setLoadingMenus(false);
    }
  };

  useEffect(() => {
    loadMenus();
  }, []);

  const resetEditor = () => {
    setEditingMenuId(null);
    setItems([newItem()]);
    setAddons([]);
    reset({
      slots: 'lunch,dinner',
      totalPlates: 80,
      platePrice: 129,
      date: '',
      cutoffTime: ''
    });
  };

  const addItem = () => setItems((prev) => [...prev, newItem()]);
  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));
  const changeItem = (index, key, value) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const addAddon = () => setAddons((prev) => [...prev, newAddon()]);
  const removeAddon = (index) => setAddons((prev) => prev.filter((_, i) => i !== index));
  const changeAddon = (index, key, value) => {
    setAddons((prev) => prev.map((addon, i) => (i === index ? { ...addon, [key]: value } : addon)));
  };

  const startEdit = (menu) => {
    setEditingMenuId(menu._id);

    setItems((menu.items || []).map((item) => ({
      _id: item._id,
      name: item.name,
      description: item.description,
      image: item.image || '',
      imageFile: null
    })));

    setAddons((menu.addons || []).map((addon) => ({
      _id: addon._id,
      name: addon.name,
      description: addon.description || '',
      price: addon.price,
      image: addon.image || '',
      imageFile: null,
      isActive: addon.isActive !== false
    })));

    reset({
      date: toDateInput(menu.date),
      cutoffTime: toDateTimeInput(menu.cutoffTime),
      totalPlates: menu.totalPlates,
      platePrice: menu.platePrice,
      slots: (menu.slots || []).join(',')
    });
  };

  const buildFormData = (values) => {
    const formData = new FormData();
    formData.append('date', values.date);
    formData.append('platePrice', Number(values.platePrice));
    formData.append('totalPlates', Number(values.totalPlates));
    formData.append('cutoffTime', values.cutoffTime);
    formData.append('slots', JSON.stringify(values.slots.split(',').map((slot) => slot.trim()).filter(Boolean)));

    const normalizedItems = items.map(({ imageFile, ...rest }) => ({
      ...rest,
      name: String(rest.name || '').trim(),
      description: String(rest.description || '').trim()
    }));

    const normalizedAddons = addons
      .map(({ imageFile, ...rest }) => sanitizeAddon(rest))
      .filter((addon) => addon.name || addon.price > 0 || addon.description || addon.image);

    formData.append('items', JSON.stringify(normalizedItems));
    formData.append('addons', JSON.stringify(normalizedAddons));

    items.forEach((item) => {
      if (item.imageFile) formData.append('images', item.imageFile);
    });
    addons.forEach((addon) => {
      if (addon.imageFile) formData.append('images', addon.imageFile);
    });

    return formData;
  };

  const submitMenu = async (values) => {
    if (!items.length || items.some((item) => !item.name || !item.description || (!item.image && !item.imageFile))) {
      toast.error('Thali items me name, description aur image zaruri hai');
      return;
    }

    const invalidAddon = addons.some((addon) => {
      const touched = addon.name || addon.description || addon.price > 0 || addon.image || addon.imageFile;
      if (!touched) return false;
      return !addon.name || Number(addon.price) < 0;
    });

    if (invalidAddon) {
      toast.error('Add-on me valid name aur price dena zaruri hai');
      return;
    }

    try {
      const formData = buildFormData(values);

      if (isEditing) {
        await client.patch(`/menus/admin/${editingMenuId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Menu updated');
      } else {
        await client.post('/menus/admin', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Menu created');
      }

      resetEditor();
      await loadMenus();
    } catch (error) {
      toast.error(getErrorMessage(error, isEditing ? 'Unable to update menu' : 'Unable to create menu'));
    }
  };

  const toggleMenu = async (id) => {
    try {
      await client.patch(`/menus/admin/${id}/toggle`);
      setMenus((prev) => prev.map((menu) => (menu._id === id ? { ...menu, isActive: !menu.isActive } : menu)));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to toggle menu'));
    }
  };

  const menuStats = useMemo(
    () => ({
      total: menus.length,
      active: menus.filter((menu) => menu.isActive).length
    }),
    [menus]
  );

  return (
    <section className="grid" style={{ gap: 16 }}>
      <article className="page">
        <AdminNav />
        <div className="panel-head">
          <h2>{isEditing ? 'Edit Menu' : 'Create Menu'}</h2>
          {isEditing && <button type="button" className="btn ghost" onClick={resetEditor}>Cancel Edit</button>}
        </div>

        <form className="form-grid" onSubmit={handleSubmit(submitMenu)}>
          <div className="grid cols-2">
            <div>
              <label>Date</label>
              <input type="date" {...register('date', { required: true })} />
            </div>
            <div>
              <label>Cutoff time</label>
              <input type="datetime-local" {...register('cutoffTime', { required: true })} />
            </div>
            <div>
              <label>Total plates</label>
              <input type="number" min="1" {...register('totalPlates', { required: true })} />
            </div>
            <div>
              <label>Thali Price</label>
              <input type="number" min="0" {...register('platePrice', { required: true })} />
            </div>
            <div>
              <label>Slots</label>
              <input {...register('slots', { required: true })} placeholder="lunch,dinner" />
            </div>
          </div>

          <h4>Thali Items (no individual price)</h4>
          {items.map((item, index) => (
            <div key={`item-${index}`} className="panel">
              <div className="grid cols-2">
                <div>
                  <label>Name</label>
                  <input value={item.name} onChange={(e) => changeItem(index, 'name', e.target.value)} />
                </div>
                <div>
                  <label>Description</label>
                  <input value={item.description} onChange={(e) => changeItem(index, 'description', e.target.value)} />
                </div>
                <div>
                  <label>Image URL</label>
                  <input value={item.image} onChange={(e) => changeItem(index, 'image', e.target.value)} />
                </div>
                <div>
                  <label>Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => changeItem(index, 'imageFile', e.target.files?.[0] || null)}
                  />
                </div>
              </div>
              {items.length > 1 && (
                <button type="button" className="btn tiny ghost" onClick={() => removeItem(index)} style={{ marginTop: 8 }}>
                  Remove Item
                </button>
              )}
            </div>
          ))}

          <button type="button" className="btn ghost" onClick={addItem}>Add Thali Item</button>

          <h4>Extra Add-ons (optional)</h4>
          {addons.map((addon, index) => (
            <div key={`addon-${index}`} className="panel">
              <div className="grid cols-2">
                <div>
                  <label>Add-on Name</label>
                  <input value={addon.name} onChange={(e) => changeAddon(index, 'name', e.target.value)} />
                </div>
                <div>
                  <label>Price</label>
                  <input type="number" min="0" value={addon.price} onChange={(e) => changeAddon(index, 'price', Number(e.target.value))} />
                </div>
                <div>
                  <label>Description</label>
                  <input value={addon.description} onChange={(e) => changeAddon(index, 'description', e.target.value)} />
                </div>
                <div>
                  <label>Image URL</label>
                  <input value={addon.image} onChange={(e) => changeAddon(index, 'image', e.target.value)} />
                </div>
                <div>
                  <label>Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => changeAddon(index, 'imageFile', e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={addon.isActive !== false}
                      onChange={(e) => changeAddon(index, 'isActive', e.target.checked)}
                      style={{ width: 'auto' }}
                    />
                    Active
                  </label>
                </div>
              </div>

              <button type="button" className="btn tiny ghost" onClick={() => removeAddon(index)} style={{ marginTop: 8 }}>
                Remove Add-on
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn ghost" onClick={addAddon}>Add Extra Item</button>
            <button type="submit" className="btn" disabled={isSubmitting}>{isEditing ? 'Update Menu' : 'Create Menu'}</button>
          </div>
        </form>
      </article>

      <article className="page">
        <div className="panel-head">
          <h3>Published Menus</h3>
          <small>Total: {menuStats.total} | Active: {menuStats.active}</small>
        </div>

        {loadingMenus ? (
          <p>Loading menus...</p>
        ) : menus.length === 0 ? (
          <p>No menus yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Thali Price</th>
                  <th>Total</th>
                  <th>Remaining</th>
                  <th>Items</th>
                  <th>Add-ons</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {menus.map((menu) => (
                  <tr key={menu._id}>
                    <td>{new Date(menu.date).toLocaleDateString()}</td>
                    <td>INR {menu.platePrice}</td>
                    <td>{menu.totalPlates}</td>
                    <td>{menu.remainingPlates}</td>
                    <td>{menu.items?.length || 0}</td>
                    <td>{menu.addons?.length || 0}</td>
                    <td>{menu.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn tiny ghost" onClick={() => startEdit(menu)}>Edit</button>
                        <button type="button" className="btn tiny" onClick={() => toggleMenu(menu._id)}>Toggle</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
};

export default AdminMenuPage;
