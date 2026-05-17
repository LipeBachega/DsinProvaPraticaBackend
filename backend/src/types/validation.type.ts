export interface IValidationError {
  isValid: boolean;
  fields?: { field: string; error: string }[];
}
