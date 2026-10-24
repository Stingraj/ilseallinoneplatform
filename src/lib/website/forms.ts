/** Shared result shape for the public forms (enquiry, newsletter). */
export interface FormState {
  status: 'idle' | 'success' | 'error';
  message: string;
  fieldErrors?: Record<string, string>;
  /** Echoed back on errors: React resets a form after its action runs, so the fields are refilled from here. */
  values?: Record<string, string>;
}

export const initialFormState: FormState = { status: 'idle', message: '' };
