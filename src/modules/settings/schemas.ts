import { z } from "zod";

const hexColorRegex = /^#([A-Fa-f0-9]{6})$/;

export const collegeProfileSchema = z.object({
  name: z
    .string()
    .min(2, "College name must be at least 2 characters")
    .max(150, "College name must not exceed 150 characters"),
  logoUrl: z.string().url("Invalid logo URL").or(z.literal("")).optional(),
  address: z.string().max(250, "Address is too long").optional(),
  city: z.string().max(100, "City name is too long").optional(),
  state: z.string().max(100, "State name is too long").optional(),
  postalCode: z.string().max(20, "Postal code is too long").optional(),
  country: z.string().max(100, "Country name is too long").optional(),
  contactEmail: z
    .string()
    .email("Invalid email address")
    .or(z.literal(""))
    .optional(),
  contactPhone: z.string().max(30, "Phone number is too long").optional(),
  website: z.string().url("Invalid website URL").or(z.literal("")).optional(),
  primaryColor: z
    .string()
    .regex(
      hexColorRegex,
      "Must be a valid 6-character hex color (e.g. #4F46E5)"
    ),
  secondaryColor: z
    .string()
    .regex(
      hexColorRegex,
      "Must be a valid 6-character hex color (e.g. #06B6D4)"
    ),
});

export type CollegeProfileInput = z.infer<typeof collegeProfileSchema>;
