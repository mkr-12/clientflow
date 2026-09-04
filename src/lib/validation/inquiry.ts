import { z } from "zod";

export const inquirySchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  contactName: z.string().trim().min(1).max(80),
  email: z.email().max(254),
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(0).optional(), // honeypot
});

export type InquiryInput = z.infer<typeof inquirySchema>;
