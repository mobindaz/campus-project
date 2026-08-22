"use client";

import React, { useState } from "react";
import { FormDefinitionDto, FormFieldDto } from "../types";
import {
  addFormFieldAction,
  updateFormFieldAction,
  deleteFormFieldAction,
  reorderFormFieldsAction,
  listCustomFieldsForEntityAction,
} from "../actions";
import { DynamicFormRenderer } from "./DynamicFormRenderer";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FormInput,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  Lock,
  Eye,
  Settings,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { CustomFieldDefinitionDto } from "@/modules/custom-fields/types";

export interface FormBuilderProps {
  initialFormDefinition: FormDefinitionDto;
}

export function FormBuilder({ initialFormDefinition }: FormBuilderProps) {
  const [formDef, setFormDef] = useState<FormDefinitionDto>(
    initialFormDefinition
  );
  const [activeTab, setActiveTab] = useState<"builder" | "preview">("builder");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormFieldDto | null>(null);
  const [availableCustomFields, setAvailableCustomFields] = useState<
    CustomFieldDefinitionDto[]
  >([]);
  const [isLoadingCustomFields, setIsLoadingCustomFields] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New field form state
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("TEXT");
  const [newRequired, setNewRequired] = useState(false);
  const [newPlaceholder, setNewPlaceholder] = useState("");
  const [newHelpText, setNewHelpText] = useState("");
  const [newOptionsText, setNewOptionsText] = useState("");
  const [selectedCustomFieldId, setSelectedCustomFieldId] = useState("");

  const fields = [...formDef.fields].sort((a, b) => a.order - b.order);

  const openAddModal = async () => {
    setErrorMsg(null);
    setNewFieldKey("");
    setNewLabel("");
    setNewType("TEXT");
    setNewRequired(false);
    setNewPlaceholder("");
    setNewHelpText("");
    setNewOptionsText("");
    setSelectedCustomFieldId("");
    setIsAddModalOpen(true);

    // Fetch existing custom field definitions for this entityType
    setIsLoadingCustomFields(true);
    try {
      const cFields = await listCustomFieldsForEntityAction(formDef.entityType);
      setAvailableCustomFields(
        cFields as unknown as CustomFieldDefinitionDto[]
      );
    } catch {
      // Ignore
    } finally {
      setIsLoadingCustomFields(false);
    }
  };

  const handleSelectCustomField = (customFieldId: string) => {
    setSelectedCustomFieldId(customFieldId);
    if (!customFieldId) return;

    const cf = availableCustomFields.find((c) => c.id === customFieldId);
    if (cf) {
      setNewFieldKey(cf.name);
      setNewLabel(cf.label);
      setNewType(cf.type);
      setNewRequired(cf.required);
      setNewHelpText(cf.helpText || "");
      if (cf.options && Array.isArray(cf.options)) {
        setNewOptionsText(cf.options.join(", "));
      }
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const parsedOptions = newOptionsText
        ? newOptionsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      const created = await addFormFieldAction(formDef.id, {
        fieldKey: newFieldKey,
        label: newLabel,
        type: newType,
        isCore: false,
        customFieldId: selectedCustomFieldId || null,
        required: newRequired,
        placeholder: newPlaceholder || null,
        helpText: newHelpText || null,
        options: parsedOptions,
      });

      setFormDef((prev) => ({
        ...prev,
        fields: [...prev.fields, created],
      }));
      setSuccessMsg(`Field '${created.label}' added successfully.`);
      setIsAddModalOpen(false);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to add field.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const parsedOptions = newOptionsText
        ? newOptionsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      const updated = await updateFormFieldAction(editingField.id, {
        label: newLabel,
        type: newType,
        required: newRequired,
        placeholder: newPlaceholder || null,
        helpText: newHelpText || null,
        options: parsedOptions,
      });

      setFormDef((prev) => ({
        ...prev,
        fields: prev.fields.map((f) => (f.id === updated.id ? updated : f)),
      }));
      setSuccessMsg(`Field '${updated.label}' updated successfully.`);
      setEditingField(null);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to update field.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteField = async (field: FormFieldDto) => {
    if (field.isCore) return;
    if (
      !confirm(
        `Are you sure you want to remove '${field.label}' from this form?`
      )
    )
      return;

    setErrorMsg(null);
    try {
      await deleteFormFieldAction(field.id);
      setFormDef((prev) => ({
        ...prev,
        fields: prev.fields.filter((f) => f.id !== field.id),
      }));
      setSuccessMsg(`Field '${field.label}' removed from form.`);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to remove field.");
    }
  };

  const handleToggleActive = async (field: FormFieldDto) => {
    setErrorMsg(null);
    try {
      const updated = await updateFormFieldAction(field.id, {
        isActive: !field.isActive,
      });
      setFormDef((prev) => ({
        ...prev,
        fields: prev.fields.map((f) => (f.id === updated.id ? updated : f)),
      }));
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to toggle field status.");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const newFields = [...fields];
    const [movedItem] = newFields.splice(index, 1);
    newFields.splice(targetIndex, 0, movedItem);

    // Update orders
    const updatedWithOrder = newFields.map((f, idx) => ({ ...f, order: idx }));
    setFormDef((prev) => ({ ...prev, fields: updatedWithOrder }));

    try {
      const orderedIds = updatedWithOrder.map((f) => f.id);
      await reorderFormFieldsAction(formDef.id, orderedIds);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to reorder fields.");
    }
  };

  const startEditField = (field: FormFieldDto) => {
    setErrorMsg(null);
    setEditingField(field);
    setNewLabel(field.label);
    setNewType(field.type);
    setNewRequired(field.required);
    setNewPlaceholder(field.placeholder || "");
    setNewHelpText(field.helpText || "");
    if (field.options && Array.isArray(field.options)) {
      setNewOptionsText(field.options.join(", "));
    } else {
      setNewOptionsText("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
              <FormInput className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {formDef.name}
                </h1>
                <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
                  {formDef.code}
                </span>
              </div>
              <p className="text-sm text-slate-400">{formDef.description}</p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1">
            <button
              onClick={() => setActiveTab("builder")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "builder"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              Field Builder ({fields.length})
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "preview"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Live Form Preview
            </button>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === "builder" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Form Fields</h2>
            <Button
              onClick={openAddModal}
              className="bg-indigo-600 font-medium text-white hover:bg-indigo-500"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Field
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, idx) => (
              <Card
                key={field.id}
                className={`border bg-slate-900/80 p-4 transition-colors ${
                  !field.isActive
                    ? "border-slate-800/60 opacity-60"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1 pt-0.5">
                      <button
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, "up")}
                        className="text-slate-500 hover:text-white disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        disabled={idx === fields.length - 1}
                        onClick={() => handleMove(idx, "down")}
                        className="text-slate-500 hover:text-white disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {field.label}
                        </span>
                        {field.required && (
                          <span className="text-xs font-semibold text-red-400">
                            Required
                          </span>
                        )}
                        {field.isCore ? (
                          <span className="flex items-center gap-1 rounded border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                            <Lock className="h-3 w-3" /> Core
                          </span>
                        ) : (
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                            Custom Field
                          </span>
                        )}
                        {!field.isActive && (
                          <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                            Disabled
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>
                          Key:{" "}
                          <code className="text-indigo-300">
                            {field.fieldKey}
                          </code>
                        </span>
                        <span>
                          Type:{" "}
                          <span className="font-medium text-slate-300">
                            {field.type}
                          </span>
                        </span>
                        {field.helpText && <span>Help: {field.helpText}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(field)}
                      className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      {field.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditField(field)}
                      className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={field.isCore}
                      onClick={() => handleDeleteField(field)}
                      title={
                        field.isCore
                          ? "Core fields cannot be deleted"
                          : "Delete field"
                      }
                      className={`text-xs ${
                        field.isCore
                          ? "cursor-not-allowed border-slate-800/40 text-slate-600 opacity-40"
                          : "border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      }`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Live Preview Tab */
        <Card className="border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-6">
            <CardTitle className="text-xl text-white">
              Live Form Preview
            </CardTitle>
            <CardDescription className="text-slate-400">
              Test how the runtime renderer presents this form and validates
              user input.
            </CardDescription>
          </div>

          <div className="max-w-xl">
            <DynamicFormRenderer
              formDefinition={formDef}
              onSubmit={async (data) => {
                alert(
                  `Form submitted successfully in preview mode!\n\n` +
                    JSON.stringify(data, null, 2)
                );
              }}
              submitLabel="Test Submit Form"
            />
          </div>
        </Card>
      )}

      {/* Add Field Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Add Form Field</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Select existing custom field */}
            {availableCustomFields.length > 0 && (
              <div className="space-y-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
                <Label className="text-xs font-semibold text-indigo-400">
                  Quick Add Existing Custom Field
                </Label>
                <select
                  value={selectedCustomFieldId}
                  onChange={(e) => handleSelectCustomField(e.target.value)}
                  disabled={isLoadingCustomFields}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose custom field --</option>
                  {availableCustomFields.map((cf) => (
                    <option key={cf.id} value={cf.id}>
                      {cf.label} ({cf.name} - {cf.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={handleAddField} className="space-y-4">
              <div>
                <Label
                  htmlFor="fieldKey"
                  className="text-sm font-medium text-slate-300"
                >
                  Field Key (alphanumeric camelCase) *
                </Label>
                <Input
                  id="fieldKey"
                  required
                  value={newFieldKey}
                  onChange={(e) => setNewFieldKey(e.target.value)}
                  placeholder="e.g. parentPhone"
                  className="border-slate-700 bg-slate-900 text-white"
                />
              </div>

              <div>
                <Label
                  htmlFor="label"
                  className="text-sm font-medium text-slate-300"
                >
                  Display Label *
                </Label>
                <Input
                  id="label"
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Parent Phone Number"
                  className="border-slate-700 bg-slate-900 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="type"
                    className="text-sm font-medium text-slate-300"
                  >
                    Field Type *
                  </Label>
                  <select
                    id="type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="TEXT">Text</option>
                    <option value="TEXTAREA">Textarea</option>
                    <option value="NUMBER">Number (Integer)</option>
                    <option value="DECIMAL">Decimal / Float</option>
                    <option value="EMAIL">Email</option>
                    <option value="PHONE">Phone Number</option>
                    <option value="DATE">Date</option>
                    <option value="DATETIME">Date & Time</option>
                    <option value="DROPDOWN">Dropdown / Select</option>
                    <option value="RADIO">Radio Options</option>
                    <option value="CHECKBOX">Checkbox</option>
                    <option value="MULTI_SELECT">Multi-Select</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={newRequired}
                      onChange={(e) => setNewRequired(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                    />
                    Required Field
                  </label>
                </div>
              </div>

              {(newType === "DROPDOWN" ||
                newType === "RADIO" ||
                newType === "MULTI_SELECT") && (
                <div>
                  <Label
                    htmlFor="optionsText"
                    className="text-sm font-medium text-slate-300"
                  >
                    Options (comma-separated)
                  </Label>
                  <Input
                    id="optionsText"
                    value={newOptionsText}
                    onChange={(e) => setNewOptionsText(e.target.value)}
                    placeholder="e.g. Option 1, Option 2, Option 3"
                    className="border-slate-700 bg-slate-900 text-white"
                  />
                </div>
              )}

              <div>
                <Label
                  htmlFor="placeholder"
                  className="text-sm font-medium text-slate-300"
                >
                  Placeholder Text
                </Label>
                <Input
                  id="placeholder"
                  value={newPlaceholder}
                  onChange={(e) => setNewPlaceholder(e.target.value)}
                  placeholder="e.g. Enter value..."
                  className="border-slate-700 bg-slate-900 text-white"
                />
              </div>

              <div>
                <Label
                  htmlFor="helpText"
                  className="text-sm font-medium text-slate-300"
                >
                  Help / Explanatory Text
                </Label>
                <Input
                  id="helpText"
                  value={newHelpText}
                  onChange={(e) => setNewHelpText(e.target.value)}
                  placeholder="e.g. Visible helper text below field"
                  className="border-slate-700 bg-slate-900 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  {isSubmitting ? "Saving..." : "Add Field"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Field Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                Edit Field: {editingField.label}
              </h3>
              <button
                onClick={() => setEditingField(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateField} className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-slate-400">
                  Field Key (read-only)
                </Label>
                <Input
                  disabled
                  value={editingField.fieldKey}
                  className="border-slate-800 bg-slate-950 text-slate-400"
                />
              </div>

              <div>
                <Label
                  htmlFor="editLabel"
                  className="text-sm font-medium text-slate-300"
                >
                  Display Label *
                </Label>
                <Input
                  id="editLabel"
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="border-slate-700 bg-slate-900 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="editType"
                    className="text-sm font-medium text-slate-300"
                  >
                    Field Type
                  </Label>
                  <select
                    id="editType"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    disabled={editingField.isCore}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="TEXT">Text</option>
                    <option value="TEXTAREA">Textarea</option>
                    <option value="NUMBER">Number</option>
                    <option value="DECIMAL">Decimal</option>
                    <option value="EMAIL">Email</option>
                    <option value="PHONE">Phone Number</option>
                    <option value="DATE">Date</option>
                    <option value="DATETIME">Date & Time</option>
                    <option value="DROPDOWN">Dropdown</option>
                    <option value="RADIO">Radio Options</option>
                    <option value="CHECKBOX">Checkbox</option>
                    <option value="MULTI_SELECT">Multi-Select</option>
                    {editingField.isCore && (
                      <>
                        <option value="PROGRAM_SELECT">Program Select</option>
                        <option value="DEPARTMENT_SELECT">
                          Department Select
                        </option>
                        <option value="BATCH_SELECT">Batch Select</option>
                        <option value="ACADEMIC_PERIOD_SELECT">
                          Academic Period Select
                        </option>
                        <option value="STUDENT_SELECT">Student Select</option>
                        <option value="DRIVE_SELECT">Drive Select</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={newRequired}
                      onChange={(e) => setNewRequired(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                    />
                    Required Field
                  </label>
                </div>
              </div>

              {(newType === "DROPDOWN" ||
                newType === "RADIO" ||
                newType === "MULTI_SELECT") && (
                <div>
                  <Label
                    htmlFor="editOptionsText"
                    className="text-sm font-medium text-slate-300"
                  >
                    Options (comma-separated)
                  </Label>
                  <Input
                    id="editOptionsText"
                    value={newOptionsText}
                    onChange={(e) => setNewOptionsText(e.target.value)}
                    className="border-slate-700 bg-slate-900 text-white"
                  />
                </div>
              )}

              <div>
                <Label
                  htmlFor="editPlaceholder"
                  className="text-sm font-medium text-slate-300"
                >
                  Placeholder Text
                </Label>
                <Input
                  id="editPlaceholder"
                  value={newPlaceholder}
                  onChange={(e) => setNewPlaceholder(e.target.value)}
                  className="border-slate-700 bg-slate-900 text-white"
                />
              </div>

              <div>
                <Label
                  htmlFor="editHelpText"
                  className="text-sm font-medium text-slate-300"
                >
                  Help / Explanatory Text
                </Label>
                <Input
                  id="editHelpText"
                  value={newHelpText}
                  onChange={(e) => setNewHelpText(e.target.value)}
                  className="border-slate-700 bg-slate-900 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingField(null)}
                  className="border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
