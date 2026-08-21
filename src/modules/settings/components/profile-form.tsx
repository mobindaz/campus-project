"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { collegeProfileSchema, CollegeProfileInput } from "../schemas";
import { getPresignedUrlAction, updateCollegeProfileAction } from "../actions";
import {
  Building2,
  Upload,
  Globe,
  Mail,
  Phone,
  MapPin,
  Palette,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export interface ProfileFormProps {
  initialProfile: {
    id?: string;
    name: string;
    logoUrl?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    website?: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
  onSuccess?: () => void;
}

export function ProfileForm({ initialProfile, onSuccess }: ProfileFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CollegeProfileInput>({
    resolver: zodResolver(collegeProfileSchema),
    defaultValues: {
      name: initialProfile.name || "Campus Operations College",
      logoUrl: initialProfile.logoUrl || "",
      address: initialProfile.address || "",
      city: initialProfile.city || "",
      state: initialProfile.state || "",
      postalCode: initialProfile.postalCode || "",
      country: initialProfile.country || "India",
      contactEmail: initialProfile.contactEmail || "",
      contactPhone: initialProfile.contactPhone || "",
      website: initialProfile.website || "",
      primaryColor: initialProfile.primaryColor || "#4F46E5",
      secondaryColor: initialProfile.secondaryColor || "#06B6D4",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const logoUrl = watch("logoUrl");
  const primaryColor = watch("primaryColor");
  const secondaryColor = watch("secondaryColor");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const presignedRes = await getPresignedUrlAction(file.name, file.type);
      if (presignedRes.success && presignedRes.data) {
        const { uploadUrl, publicUrl, isMock } = presignedRes.data;

        if (isMock) {
          // Dev mock upload
          await fetch(uploadUrl, { method: "POST" });
        } else {
          // Real R2 presigned S3 upload
          await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
        }

        setValue("logoUrl", publicUrl);
      }
    } catch (err) {
      console.error("Logo upload failed", err);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const onSubmit = async (data: CollegeProfileInput) => {
    setIsSubmitting(true);
    setServerError(null);
    setSuccessNotice(null);

    try {
      const res = await updateCollegeProfileAction(data);
      if (res.success) {
        setSuccessNotice("College profile updated successfully!");
        if (onSuccess) onSuccess();
      } else {
        setServerError(res.error || "Failed to update profile.");
      }
    } catch {
      setServerError("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Alert Notices */}
      {serverError && (
        <div className="flex items-center space-x-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {successNotice && (
        <div className="flex items-center space-x-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Basic Info & Branding Section */}
      <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2.5 text-indigo-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              College Identity & Branding
            </h2>
            <p className="text-xs text-slate-400">
              Institutional name, logo asset, and brand color palette
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Name */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold text-slate-300">
              College Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. St. Xavier's College of Engineering"
              {...register("name")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
            />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Logo Upload & Preview */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold text-slate-300">
              College Logo
            </label>
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 sm:flex-row">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="College Logo"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-slate-600" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  placeholder="https://... logo image URL or upload file"
                  {...register("logoUrl")}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200"
                />
                <p className="text-[11px] text-slate-500">
                  Supports PNG, SVG, or JPG (Cloudflare R2 storage upload)
                </p>
              </div>

              <label className="flex cursor-pointer items-center space-x-2 rounded-xl border border-indigo-500/30 bg-indigo-600/15 px-4 py-2 text-xs font-semibold whitespace-nowrap text-indigo-300 transition-all hover:bg-indigo-600/25">
                {isUploadingLogo ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span>{isUploadingLogo ? "Uploading..." : "Upload Logo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploadingLogo}
                />
              </label>
            </div>
          </div>

          {/* Primary Color */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <Palette className="h-4 w-4 text-indigo-400" />
              <span>Primary Brand Color</span>
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setValue("primaryColor", e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-xl border-0 bg-transparent"
              />
              <input
                type="text"
                {...register("primaryColor")}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 uppercase"
              />
            </div>
          </div>

          {/* Secondary Color */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <Palette className="h-4 w-4 text-cyan-400" />
              <span>Secondary Brand Color</span>
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setValue("secondaryColor", e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-xl border-0 bg-transparent"
              />
              <input
                type="text"
                {...register("secondaryColor")}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 uppercase"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address & Contact Section */}
      <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Location & Official Contact
            </h2>
            <p className="text-xs text-slate-400">
              Campus address, official email, phone, and website
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-300">
              Campus Address
            </label>
            <input
              type="text"
              placeholder="e.g. 123 Tech Campus Road, Off Western Express Highway"
              {...register("address")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">City</label>
            <input
              type="text"
              placeholder="e.g. Mumbai"
              {...register("city")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              State / Region
            </label>
            <input
              type="text"
              placeholder="e.g. Maharashtra"
              {...register("state")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Postal Code
            </label>
            <input
              type="text"
              placeholder="e.g. 400001"
              {...register("postalCode")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Country
            </label>
            <input
              type="text"
              placeholder="e.g. India"
              {...register("country")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
              <Mail className="h-3.5 w-3.5 text-indigo-400" />
              <span>Contact Email</span>
            </label>
            <input
              type="email"
              placeholder="e.g. info@college.edu"
              {...register("contactEmail")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
              <Phone className="h-3.5 w-3.5 text-indigo-400" />
              <span>Contact Phone</span>
            </label>
            <input
              type="text"
              placeholder="e.g. +91 22 2847 1000"
              {...register("contactPhone")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
              <Globe className="h-3.5 w-3.5 text-indigo-400" />
              <span>Official Website</span>
            </label>
            <input
              type="text"
              placeholder="e.g. https://college.edu"
              {...register("website")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Form Submission */}
      <div className="flex items-center justify-end space-x-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>Save Profile Settings</span>
        </button>
      </div>
    </form>
  );
}
