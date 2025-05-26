import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().min(3, "La calle es requerida y debe tener al menos 3 caracteres."),
  city: z.string().min(2, "La ciudad es requerida y debe tener al menos 2 caracteres."),
  postalCode: z.string().min(3, "El código postal es requerido y debe tener al menos 3 caracteres."),
  country: z.string().min(2, "El país es requerido y debe tener al menos 2 caracteres."),
});

export const AddressInputFormSchema = z.object({
  address: addressSchema,
  serviceType: z.enum(["standard", "express", "sameday"], {
    errorMap: () => ({ message: "Seleccione un tipo de servicio." }),
  }),
});

export type AddressInputFormValues = z.infer<typeof AddressInputFormSchema>;
export type AddressDetails = z.infer<typeof addressSchema>;


export const ShipmentRequestFormSchema = z.object({
  comments: z.string().optional(),
});

export type ShipmentRequestFormValues = z.infer<typeof ShipmentRequestFormSchema>;
