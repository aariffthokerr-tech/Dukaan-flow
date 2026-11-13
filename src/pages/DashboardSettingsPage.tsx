import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ImagePlus, Store } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { updateOwnedShop } from '../services/shopService';
import { getProductImagePublicUrl, uploadShopLogo } from '../services/storageService';
import { SHOP_CATEGORIES } from '../types/database';
import { isValidWhatsappNumber } from '../utils/validation';

export const DashboardSettingsPage: React.FC = () => {
  const { profile, shop, setShop } = useAuth();
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(shop?.name ?? '');
  const [category, setCategory] = useState(shop?.category ?? SHOP_CATEGORIES[0]);
  const [whatsappNumber, setWhatsappNumber] = useState(shop?.whatsapp_number ?? '');
  const [description, setDescription] = useState(shop?.description ?? '');
  const [address, setAddress] = useState(shop?.address ?? '');
  const [openingHours, setOpeningHours] = useState(shop?.opening_hours ?? '');
  const [isActive, setIsActive] = useState(shop?.is_active ?? true);

  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (shop) {
      setName(shop.name);
      setCategory(shop.category);
      setWhatsappNumber(shop.whatsapp_number);
      setDescription(shop.description ?? '');
      setAddress(shop.address ?? '');
      setOpeningHours(shop.opening_hours ?? '');
      setIsActive(shop.is_active);
    }
  }, [shop]);

  const logoSrc = shop?.logo_path ? getProductImagePublicUrl(shop.logo_path) : null;

  const handleLogoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profile || !shop) return;

    setError(null);
    setSavedMessage(null);
    setIsUploadingLogo(true);
    try {
      const { logoPath } = await uploadShopLogo({
        shopId: shop.id,
        ownerId: profile.id,
        file,
        previousLogoPath: shop.logo_path,
      });
      setShop({ ...shop, logo_path: logoPath });
      setSavedMessage('Shop logo uploaded and saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload shop logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !shop) return;

    setError(null);
    setSavedMessage(null);

    if (name.trim().length < 2) {
      setError('Shop name must be at least 2 characters.');
      return;
    }

    if (!isValidWhatsappNumber(whatsappNumber)) {
      setError(
        'Enter a valid WhatsApp business number with country code (e.g. +919876543210).'
      );
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateOwnedShop(profile.id, shop.id, {
        name,
        category,
        whatsapp_number: whatsappNumber,
        description: description || null,
        address: address || null,
        opening_hours: openingHours || null,
        is_active: isActive,
      });
      setShop(updated);
      setSavedMessage('Shop settings updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save shop settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900">
          Shop Settings
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Manage your business profile, storefront logo, opening hours, and visibility.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="rounded-xl border border-neutral-200 bg-white p-6 space-y-5"
      >
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {savedMessage && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{savedMessage}</span>
          </div>
        )}

        {/* Shop Logo Upload */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-neutral-200 pb-5">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={`${shop?.name ?? 'Shop'} logo`}
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-xl border border-neutral-200 object-cover bg-neutral-50 shrink-0"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-500">
              <Store className="h-6 w-6" aria-hidden="true" />
            </div>
          )}

          <div className="space-y-1.5 min-w-0">
            <p className="text-sm font-medium text-neutral-900">Storefront Logo</p>
            <p className="text-xs text-neutral-500">
              JPEG, PNG, or WebP up to 5 MB. Displayed on your public storefront header.
            </p>
            <div className="pt-1">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => void handleLogoSelected(e)}
                className="sr-only"
                aria-label="Upload shop logo"
              />
              <button
                type="button"
                disabled={isUploadingLogo}
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60 transition-colors"
              >
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {isUploadingLogo
                    ? 'Uploading Logo...'
                    : logoSrc
                      ? 'Replace Logo'
                      : 'Upload Logo'}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-name" className="block text-sm font-medium text-neutral-800">
              Shop name
            </label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label
              htmlFor="settings-category"
              className="block text-sm font-medium text-neutral-800"
            >
              Shop category
            </label>
            <select
              id="settings-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            >
              {SHOP_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="settings-whatsapp"
              className="block text-sm font-medium text-neutral-800"
            >
              WhatsApp business number
            </label>
            <input
              id="settings-whatsapp"
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 font-mono text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label htmlFor="settings-slug" className="block text-sm font-medium text-neutral-800">
              Reserved shop slug
            </label>
            <input
              id="settings-slug"
              type="text"
              value={shop?.slug ?? ''}
              disabled
              className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-200 bg-neutral-100 px-3.5 py-2 font-mono text-sm text-neutral-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="settings-description"
            className="block text-sm font-medium text-neutral-800"
          >
            Shop description
          </label>
          <textarea
            id="settings-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what your shop sells and your local delivery availability..."
            className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="settings-address"
              className="block text-sm font-medium text-neutral-800"
            >
              Store address
            </label>
            <input
              id="settings-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address, neighborhood, city"
              className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label
              htmlFor="settings-hours"
              className="block text-sm font-medium text-neutral-800"
            >
              Opening hours
            </label>
            <input
              id="settings-hours"
              type="text"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder="e.g. Mon–Sat, 9:00 AM – 8:30 PM"
              className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-emerald-700 focus:ring-emerald-700"
          />
          <div className="text-xs">
            <span className="font-semibold text-neutral-900">
              Publish public storefront
            </span>
            <p className="mt-0.5 text-neutral-500">
              When unchecked, your storefront URL displays an unavailable notice and hides
              catalogue browsing.
            </p>
          </div>
        </label>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="min-h-[44px] rounded-lg bg-[#111315] px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
