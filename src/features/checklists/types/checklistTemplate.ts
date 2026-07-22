export type ChecklistTemplateResponseType =
  | 'si_no_na'
  | 'correcto_incorrecto'
  | 'numero'
  | 'texto'
  | 'seleccion';

export type ChecklistTemplatePoint = {
  id: string;
  title: string;
  instructions: string;
  responseType: ChecklistTemplateResponseType;
  unit: string;
  options: string[];
  required: boolean;
  negativeObservationRequired: boolean;
  photoRequired: boolean;
  critical: boolean;
  order: number;
};

export type ChecklistTemplateSection = {
  id: string;
  title: string;
  description: string;
  order: number;
  points: ChecklistTemplatePoint[];
};

export type ChecklistTemplate = {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  specialty: string;
  version: number;
  active: boolean;
  createdBy: string;
  updatedBy: string;
  createdByName: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
  sections: ChecklistTemplateSection[];
};

export type ChecklistTemplateDraft = Omit<
  ChecklistTemplate,
  'id' | 'version' | 'createdBy' | 'updatedBy' | 'createdByName' | 'updatedByName' | 'createdAt' | 'updatedAt'
>;
